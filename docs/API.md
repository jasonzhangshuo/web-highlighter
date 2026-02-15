# Web Highlighter API 文档

## 基础地址

```
http://localhost:3100
```

## API 端点

### 1. 获取所有高亮

```
GET /api/highlights
```

**查询参数：**
| 参数 | 说明 | 示例 |
|------|------|------|
| url | 按来源网址筛选 | `?url=weread.qq.com` |
| domain | 按域名筛选 | `?domain=weread.qq.com` |
| date | 按日期筛选 | `?date=2024-01-13` |

**响应示例：**
```json
[
  {
    "id": "lxyz123abc",
    "text": "这是高亮的文本内容...",
    "note": "这是我的笔记",
    "url": "https://weread.qq.com/web/reader/xxx",
    "title": "书名 - 章节",
    "domain": "weread.qq.com",
    "timestamp": "2024-01-13T10:30:00.000Z"
  }
]
```

### 2. 获取单个高亮

```
GET /api/highlights/:id
```

### 3. 创建高亮

```
POST /api/highlights
```

**请求体：**
```json
{
  "text": "高亮的文本内容",
  "note": "我的笔记（可选）",
  "url": "https://example.com/article",
  "title": "文章标题",
  "domain": "example.com"
}
```

### 4. 更新高亮

```
PUT /api/highlights/:id
```

**请求体：**
```json
{
  "note": "更新后的笔记"
}
```

### 5. 删除高亮

```
DELETE /api/highlights/:id
```

### 6. 批量删除

```
DELETE /api/highlights
```

**请求体：**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

### 7. 导出高亮

```
GET /api/export?format=json|markdown
```

- `format=json` - 导出为 JSON 格式
- `format=markdown` - 导出为 Markdown 格式（按域名分组）

### 8. 获取统计信息

```
GET /api/stats
```

**响应示例：**
```json
{
  "total": 150,
  "today": 5,
  "domains": [
    { "domain": "weread.qq.com", "count": 80 },
    { "domain": "zhihu.com", "count": 30 }
  ]
}
```

## 在其他项目中调用

### Python 示例

```python
import requests

# 获取所有高亮
response = requests.get('http://localhost:3100/api/highlights')
highlights = response.json()

for h in highlights:
    print(f"内容: {h['text']}")
    print(f"来源: {h['title']}")
    print(f"笔记: {h['note']}")
    print("---")

# 按域名筛选
response = requests.get('http://localhost:3100/api/highlights?domain=weread.qq.com')
weRead_highlights = response.json()

# 导出为 Markdown
response = requests.get('http://localhost:3100/api/export?format=markdown')
markdown_content = response.text
```

### Node.js 示例

```javascript
const axios = require('axios');

// 获取高亮
async function getHighlights() {
    const response = await axios.get('http://localhost:3100/api/highlights');
    return response.data;
}

// 创建高亮
async function createHighlight(text, url, title, note = '') {
    const response = await axios.post('http://localhost:3100/api/highlights', {
        text,
        url,
        title,
        note,
        domain: new URL(url).hostname
    });
    return response.data;
}
```

### curl 示例

```bash
# 获取所有高亮
curl http://localhost:3100/api/highlights

# 获取微信读书的高亮
curl "http://localhost:3100/api/highlights?domain=weread.qq.com"

# 导出为 Markdown
curl "http://localhost:3100/api/export?format=markdown" > highlights.md

# 创建新高亮
curl -X POST http://localhost:3100/api/highlights \
  -H "Content-Type: application/json" \
  -d '{"text":"测试内容","url":"https://example.com","title":"测试"}'
```
