/**
 * Web Highlighter Server
 * 网页高亮抓取工具后端服务
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3100;

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'database.json');

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件（管理界面）
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

// 初始化数据文件
function initDatabase() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ highlights: [] }, null, 2));
    }
}

// 读取数据
function readDatabase() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Read database error:', error);
        return { highlights: [] };
    }
}

// 写入数据
function writeDatabase(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Write database error:', error);
        return false;
    }
}

// 生成唯一 ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============ API 路由 ============

/**
 * GET /api/highlights
 * 获取所有高亮，支持筛选
 * ?url=xxx 筛选来源网址
 * ?date=2024-01-13 筛选日期
 * ?domain=xxx 筛选域名
 */
app.get('/api/highlights', (req, res) => {
    const db = readDatabase();
    let highlights = db.highlights;

    // 按网址筛选
    if (req.query.url) {
        const searchUrl = req.query.url.toLowerCase();
        highlights = highlights.filter(h => 
            h.url.toLowerCase().includes(searchUrl)
        );
    }

    // 按域名筛选
    if (req.query.domain) {
        const searchDomain = req.query.domain.toLowerCase();
        highlights = highlights.filter(h => 
            h.domain && h.domain.toLowerCase().includes(searchDomain)
        );
    }

    // 按日期筛选
    if (req.query.date) {
        const searchDate = req.query.date;
        highlights = highlights.filter(h => 
            h.timestamp && h.timestamp.startsWith(searchDate)
        );
    }

    // 按时间倒序
    highlights.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(highlights);
});

/**
 * GET /api/highlights/:id
 * 获取单个高亮
 */
app.get('/api/highlights/:id', (req, res) => {
    const db = readDatabase();
    const highlight = db.highlights.find(h => h.id === req.params.id);
    
    if (highlight) {
        res.json(highlight);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

/**
 * POST /api/highlights
 * 创建新高亮
 */
// 服务端去重：同一 url + 同一段文字 60 秒内只保留一条，避免扩展重复 POST 刷屏
const DEDUPE_SEC = 60;
function isDuplicate(db, text, url) {
    if (!text || !url) return false;
    const cutoff = new Date(Date.now() - DEDUPE_SEC * 1000).toISOString();
    return db.highlights.some(h => h.url === url && h.text === text && h.timestamp >= cutoff);
}

app.post('/api/highlights', (req, res) => {
    const db = readDatabase();
    const text = (req.body.text || '').trim();
    const url = req.body.url || '';
    const note = req.body.note || '';
    const title = req.body.title || '';
    const domain = req.body.domain || '';
    const timestamp = req.body.timestamp || new Date().toISOString();

    if (isDuplicate(db, text, url)) {
        const existing = db.highlights.find(h => h.url === url && h.text === text);
        return res.status(201).json(existing || { id: '', text, note, url, title, domain, timestamp });
    }

    const newHighlight = {
        id: generateId(),
        text,
        note,
        url,
        title,
        domain,
        timestamp
    };

    db.highlights.push(newHighlight);

    if (writeDatabase(db)) {
        res.status(201).json(newHighlight);
        console.log(`✅ 新高亮已保存: ${newHighlight.text.substring(0, 30)}...`);
    } else {
        res.status(500).json({ error: 'Failed to save' });
    }
});

/**
 * PUT /api/highlights/:id
 * 更新高亮（主要是添加/修改笔记）
 */
app.put('/api/highlights/:id', (req, res) => {
    const db = readDatabase();
    const index = db.highlights.findIndex(h => h.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Not found' });
    }

    db.highlights[index] = {
        ...db.highlights[index],
        ...req.body,
        id: req.params.id, // 保持 ID 不变
        updatedAt: new Date().toISOString()
    };

    if (writeDatabase(db)) {
        res.json(db.highlights[index]);
    } else {
        res.status(500).json({ error: 'Failed to update' });
    }
});

/**
 * DELETE /api/highlights/:id
 * 删除高亮
 */
app.delete('/api/highlights/:id', (req, res) => {
    const db = readDatabase();
    const index = db.highlights.findIndex(h => h.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Not found' });
    }

    db.highlights.splice(index, 1);
    
    if (writeDatabase(db)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

/**
 * DELETE /api/highlights
 * 批量删除
 * Body: { ids: ['id1', 'id2'] }
 */
app.delete('/api/highlights', (req, res) => {
    const db = readDatabase();
    const idsToDelete = req.body.ids || [];
    
    db.highlights = db.highlights.filter(h => !idsToDelete.includes(h.id));
    
    if (writeDatabase(db)) {
        res.json({ success: true, deleted: idsToDelete.length });
    } else {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

/**
 * GET /api/export
 * 导出高亮
 * ?format=json|markdown
 */
app.get('/api/export', (req, res) => {
    const db = readDatabase();
    const highlights = db.highlights.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    const format = req.query.format || 'json';

    if (format === 'markdown') {
        // 按域名分组
        const grouped = {};
        highlights.forEach(h => {
            const key = h.domain || 'unknown';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(h);
        });

        let markdown = '# 📚 Web Highlighter 导出\n\n';
        markdown += `> 导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        markdown += `> 总计: ${highlights.length} 条高亮\n\n---\n\n`;

        for (const [domain, items] of Object.entries(grouped)) {
            markdown += `## 🌐 ${domain}\n\n`;
            
            items.forEach(h => {
                markdown += `### [${h.title || '无标题'}](${h.url})\n\n`;
                markdown += `> ${h.text.replace(/\n/g, '\n> ')}\n\n`;
                if (h.note) {
                    markdown += `📝 **笔记**: ${h.note}\n\n`;
                }
                markdown += `*${new Date(h.timestamp).toLocaleString('zh-CN')}*\n\n---\n\n`;
            });
        }

        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.send(markdown);
    } else {
        res.json(highlights);
    }
});

/**
 * GET /api/stats
 * 获取统计信息
 */
app.get('/api/stats', (req, res) => {
    const db = readDatabase();
    const highlights = db.highlights;

    const today = new Date().toDateString();
    const todayCount = highlights.filter(h => 
        new Date(h.timestamp).toDateString() === today
    ).length;

    // 按域名统计
    const domainStats = {};
    highlights.forEach(h => {
        const domain = h.domain || 'unknown';
        domainStats[domain] = (domainStats[domain] || 0) + 1;
    });

    res.json({
        total: highlights.length,
        today: todayCount,
        domains: Object.entries(domainStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count }))
    });
});

// ============ 启动服务器 ============

initDatabase();

app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`💡 Web Highlighter Server`);
    console.log(`=================================`);
    console.log(`🚀 服务已启动: http://localhost:${PORT}`);
    console.log(`📊 管理界面: http://localhost:${PORT}/dashboard`);
    console.log(`📡 API 地址: http://localhost:${PORT}/api/highlights`);
    console.log(`=================================\n`);
});
