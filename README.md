# Web Highlighter

在任意网页上高亮并保存笔记，提供本地 API 与 Dashboard。**特别支持在微信读书网页版中，通过「复制」一键抓取书中高亮与笔记，方便导出、复习或接入其他工具。**

---

## ✨ 为什么做这个

- **微信读书网页版**：在 weread.qq.com 看书时，用自带马克笔划线、写想法后，希望把内容同步到自己的笔记库或其它项目（如 Obsidian、Notion、复习脚本）。本扩展在微信读书页**不抢界面**，只在你点击「复制」时把当前选中的文字保存到本地，并带上来源书名与链接。
- **任意网页**：在普通网页上选中文字后，可点击高亮按钮或通过快捷键保存，支持加笔记。
- **可被其他项目调用**：本地 REST API，支持按 URL、域名、日期筛选，导出 JSON/Markdown，方便做阅读统计、日报、RSS 等。

---

## 📖 微信读书使用方式（推荐）

1. 安装并加载本扩展，启动本地服务（见下方「快速开始」）。
2. 打开 [微信读书网页版](https://weread.qq.com)，进入任意一本书。
3. 用微信读书自带的**马克笔**划好想保存的句子，或直接**选中**一段文字。
4. 点击微信读书工具栏里的 **「复制」**。
5. 扩展会自动把这段文字 + 当前页面 URL/标题保存到本地，并提示「已保存到 Web Highlighter」。
6. 在浏览器打开 `http://localhost:3100/dashboard` 查看、搜索、导出，或通过 API 供其他项目调用。

**说明**：微信读书场景下扩展只做「复制即保存」，不注入额外按钮、不拦截其内部接口，避免与官方交互冲突；同一段文字在短时间内的重复复制会自动去重。

---

## 功能概览

| 能力 | 说明 |
|------|------|
| 微信读书抓取 | 在 weread.qq.com 选中文字后点「复制」即保存，带来源链接与标题 |
| 普通网页高亮 | 选中文字后点击高亮按钮或快捷键，可加笔记 |
| 本地 Dashboard | 列表、搜索、按域名/日期筛选、导出 JSON/Markdown、删除 |
| REST API | GET/POST/PUT/DELETE 高亮，按 url/domain/date 筛选，供其他项目调用 |

---

## 快速开始

### 1. 启动本地服务

```bash
cd server
npm install
npm start
```

服务默认运行在 **http://localhost:3100**。  
管理界面：**http://localhost:3100/dashboard**

### 2. 安装浏览器扩展

1. 用 Chrome（或 Edge 等 Chromium 内核浏览器）打开 `chrome://extensions/`
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本仓库下的 **`extension`** 目录

### 3. 使用

- **微信读书**：打开 weread.qq.com → 选中文字 → 点工具栏「复制」→ 自动保存。
- **其他网页**：选中文字 → 点击弹出的「💡 高亮」按钮（或使用扩展提供的快捷键）→ 可选填笔记 → 保存。

---

## 项目结构

```
web-highlighter/
├── extension/          # Chrome 扩展
│   ├── manifest.json
│   ├── content.js      # 注入逻辑（含微信读书「复制即保存」）
│   ├── background.js
│   ├── popup.html / popup.js
│   └── styles.css
├── server/             # 本地后端
│   ├── server.js       # Express，含去重与 API
│   ├── database.json   # 高亮数据（可清空后提交为空数组）
│   └── public/         # Dashboard 静态页
├── scripts/            # 辅助脚本（如 Playwright 检测复制事件）
├── docs/               # API 说明、问题说明等
└── README.md
```

---

## API 简要

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/highlights` | 获取高亮列表，支持 `?url=&domain=&date=` |
| GET | `/api/highlights/:id` | 获取单条 |
| POST | `/api/highlights` | 创建（服务端会按 url+text 做短时去重） |
| PUT | `/api/highlights/:id` | 更新 |
| DELETE | `/api/highlights/:id` | 删除 |
| GET | `/api/export?format=json\|markdown` | 导出 |
| GET | `/api/stats` | 统计（总数、今日数） |

详细字段与示例见 **`docs/API.md`**。

---

## 注意事项

- 扩展仅在 **http://localhost:3100** 与当前配置的 API 地址通信，高亮数据只存在你本机。
- 微信读书页不会注入额外 UI，仅监听「复制」事件并取当前选区文字；不会拦截或改写其内部请求。
- 若你同时打开 Dashboard 页，扩展已通过 `exclude_matches` 与运行时判断排除，不会在 Dashboard 上执行抓取逻辑。

---

## 文档

- **API 文档**：`docs/API.md`
- **问题说明与关键文件**：`docs/问题说明与关键文件.md`
- **修复记录**：`docs/修复说明-2026-02-13.md`

---

## License

MIT
