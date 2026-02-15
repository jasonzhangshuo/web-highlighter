// Web Highlighter - Popup Script

const SERVER_URL = 'http://localhost:3100';

// 加载统计数据和最近高亮
async function loadData() {
    try {
        // 获取所有高亮
        const response = await fetch(`${SERVER_URL}/api/highlights`);
        const highlights = await response.json();

        // 更新统计
        document.getElementById('total-count').textContent = highlights.length;
        
        // 计算今日数量
        const today = new Date().toDateString();
        const todayCount = highlights.filter(h => 
            new Date(h.timestamp).toDateString() === today
        ).length;
        document.getElementById('today-count').textContent = todayCount;

        // 显示最近的5条高亮
        const recentList = document.getElementById('recent-list');
        
        if (highlights.length === 0) {
            recentList.innerHTML = `
                <div class="no-highlights">
                    暂无高亮内容<br><br>
                    在网页上选中文字，点击"💡 高亮"按钮即可保存
                </div>
            `;
            return;
        }

        const recentHighlights = highlights
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        recentList.innerHTML = recentHighlights.map(h => `
            <div class="highlight-item">
                <div class="highlight-text">${escapeHtml(h.text.substring(0, 100))}${h.text.length > 100 ? '...' : ''}</div>
                ${h.note ? `<div class="note">📝 ${escapeHtml(h.note.substring(0, 50))}${h.note.length > 50 ? '...' : ''}</div>` : ''}
                <div class="highlight-meta">
                    <span title="${h.title}">${escapeHtml(h.title.substring(0, 20))}...</span>
                    <span>${formatDate(h.timestamp)}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('recent-list').innerHTML = `
            <div class="no-highlights" style="color: #f44336;">
                ❌ 无法连接到服务器<br>
                请确保后端服务已启动
            </div>
        `;
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString('zh-CN');
}

// 导出高亮
async function exportHighlights() {
    try {
        const response = await fetch(`${SERVER_URL}/api/export?format=markdown`);
        const markdown = await response.text();
        
        // 复制到剪贴板
        await navigator.clipboard.writeText(markdown);
        
        // 显示成功消息
        const btn = document.getElementById('btn-export');
        const originalText = btn.textContent;
        btn.textContent = '✅ 已复制';
        setTimeout(() => btn.textContent = originalText, 2000);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('导出失败，请检查服务器');
    }
}

// 打开管理页面
function openDashboard() {
    chrome.tabs.create({ url: `${SERVER_URL}/dashboard` });
}

// 绑定事件
document.getElementById('btn-export').addEventListener('click', exportHighlights);
document.getElementById('btn-dashboard').addEventListener('click', openDashboard);

// 加载数据
loadData();

// 每隔5秒刷新一次
setInterval(loadData, 5000);
