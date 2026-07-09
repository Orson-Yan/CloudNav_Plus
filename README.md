# CloudNav Plus

个人导航站，基于 Cloudflare Pages + KV，React + TypeScript 全栈。

Fork 自 [sese972010/CloudNav-](https://github.com/sese972010/CloudNav-) 和 [aabacada/CloudNav-abcd](https://github.com/aabacada/CloudNav-abcd)，在此基础上按自身需求持续改造。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Tailwind CSS + Vite |
| 后端 | Cloudflare Pages Functions（serverless） |
| 存储 | Cloudflare KV（数据 + 图标缓存） |
| 拖拽 | @dnd-kit |

---

## 本地开发

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # 构建到 dist/
npm run preview    # 预览构建产物
```

> **注意**：本地 Vite 不含 Pages Functions 运行时，`/api/*` 均返回 404，数据自动降级到 `localStorage`（key: `cloudnav_data_cache`）。  
> 如需本地跑完整后端，用 `wrangler pages dev` 并配好 KV 绑定和 `PASSWORD` 环境变量。

### 清除本地缓存（开发用）

浏览器控制台执行：

```js
localStorage.clear()
```

---

## 项目结构

```
├── App.tsx                    # 根组件，全部状态集中管理（~3000行）
├── types.ts                   # 所有 TS 类型定义
├── components/
│   ├── CommandPalette.tsx     # Ctrl+K 全局搜索面板
│   ├── LinkModal.tsx          # 链接新增/编辑弹窗（含标签输入）
│   ├── SettingsModal.tsx      # 设置面板（AI/WebDAV/搜索/网站/扩展）
│   ├── CategoryManager.tsx    # 分类管理
│   ├── BackupModal.tsx        # 备份与恢复
│   └── ...
├── functions/api/
│   ├── storage.ts             # /api/storage — KV 读写，主数据 + 配置 + favicon
│   ├── webdav.ts              # /api/webdav  — WebDAV 代理（规避 CORS）
│   └── link.ts                # /api/link    — 抓取链接标题/favicon 元信息
└── services/
    ├── geminiService.ts       # AI 调用（Gemini / OpenAI compatible）
    └── bookmarkParser.ts      # 浏览器书签 HTML 解析
```

### 关键环境变量（Cloudflare Pages）

| 变量名 | 类型 | 说明 |
|---|---|---|
| `CLOUDNAV_KV` | KV 绑定 | 主数据存储，变量名必须完全一致 |
| `PASSWORD` | 环境变量 | 全站访问密码 |

---

## 已实现功能

### 链接管理
- 新增 / 编辑 / 删除（标题、URL、图标、描述、分类、标签）
- 拖拽排序（同分类内，@dnd-kit）
- 置顶 + 置顶区排序
- 批量编辑（多选删除、批量移动分类）
- 右键上下文菜单（编辑、删除、置顶、复制链接、生成二维码）
- 标签系统（`tags[]`，跨分类打标，侧边栏标签云过滤）

### 分类管理
- 创建 / 编辑 / 删除 / 排序
- 图标（Lucide 图标名 或 emoji）
- 分类密码保护
- 分类要求全站登录后才可查看

### 搜索
- **Ctrl+K 命令面板**：全局链接搜索，键盘导航（↑↓ 回车打开 Esc 关闭），显示分类归属
- 外部搜索引擎（10+ 预设 + 自定义 URL 模板）
- 内部实时过滤（标题 / URL / 描述）

### 数据 & 备份
- Cloudflare KV 实时同步（增删改自动推送）
- localStorage 本地缓存（离线降级）
- WebDAV 备份 / 恢复（Nextcloud 等）
- JSON 导出 / 导入（含 WebDAV/AI 配置）
- HTML 书签导出（兼容 Chrome / Firefox 导入格式）
- 浏览器书签 HTML 导入（去重 + 智能分类）

### 认证
- 全站访问密码
- 密码过期机制（可配置天数，0 = 永不过期）
- 分类独立密码
- Session token 本地存储 + 到期自动清除

### 外观
- 亮色 / 深色主题（手动 + 跟随系统），切换时圆形展开动画
- **自定义页面背景**（渐变预设 / 任意 CSS background 值）
- 卡片样式：详情版 / 简约版
- 自定义站点标题、导航栏名称、Favicon

### AI 集成
- 支持 Gemini / OpenAI Compatible（DeepSeek、Claude 等）
- 一键批量生成中文描述（可暂停 / 继续）
- 添加链接时 AI 推荐分类

### 其他
- Chrome / Firefox 扩展自动生成（弹窗 + 侧边栏模式）
- Bookmarklet 快捷添加（URL 参数 `add_url` / `add_title`）
- Favicon 抓取并持久化到 KV（含 404 负缓存，TTL 1天）
- 同步状态指示（保存中 / 已保存 / 失败）
- 移动端响应式 + 侧边栏折叠

---

## 待开发 / 计划中

### P0（近期）
- [ ] 链接点击统计（点击次数 + 最近访问，支持热度排序）
- [ ] 链接打开方式（当前标签 / 新标签，`openInNewTab` 字段）

### P1（中期）
- [ ] 死链检测（扫描并标记 404 / 超时链接）
- [ ] PWA 支持（manifest + service worker，移动端添加到主屏幕）

### P2（长期）
- [ ] 链接 Markdown 备注（突破描述字数限制）
- [ ] 搜索历史记录
- [ ] 分类一键全开（右键分类，新标签批量打开）
- [ ] 主题 Accent 颜色自定义

---

## 部署（Cloudflare Pages）

1. Fork 本仓库到自己的 GitHub
2. Cloudflare Dashboard → Workers & Pages → 创建应用 → Pages → 连接 Git
3. 构建配置：构建命令 `npm run build`，输出目录 `dist`
4. KV → 新建命名空间 → 绑定变量名填 `CLOUDNAV_KV`
5. 环境变量添加 `PASSWORD`（你的登录密码）
6. 重新部署生效

---

## 更新日志

### 2026.07
- 新增 Ctrl+K 命令面板（全局搜索 + 键盘导航）
- 新增自定义页面背景（渐变预设 + 自定义 CSS）
- 新增标签系统（链接多标签 + 侧边栏标签云过滤）
- 修复 8 处 Bug（类型安全、favicon 负缓存、登录后图标竞态、拖拽排序、WebDAV 错误反馈、JSON 解析静默失败、扩展 JS 注入风险）

### 2026.04
- 修复 AI 配置接口未鉴权问题
- 修复 WebDAV 代理接口未鉴权问题
- WebDAV 配置支持写入 KV 并跨设备同步
- 删除无效 `/index.css` 引用
