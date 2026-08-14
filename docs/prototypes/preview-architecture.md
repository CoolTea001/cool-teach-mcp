# 网页预览架构（prototype 草稿 v1）

> 工单：[网页预览架构](https://github.com/CoolTea001/cool-teach-mcp/issues/17)
> 输入决议：[技术栈与仓库结构](#12)（packages/preview = Nuxt + Nuxt UI v4 + Tailwind v4，cool-design）、[跨客户端接入与工作区定位](#13)（项目根解析不依赖 cwd）、[工作区数据模型](#14)（.coolteach 结构）、[课程内容格式](#15)（lessons Markdown + frontmatter）、[统一题目/任务标准](#16)（五类任务块 + lint）
> 状态：**已决议（2026-08-14）**，见文末「决议」；本文件归档为预览架构规格。

## 1. 服务形态

- `packages/preview` = **Nuxt 应用（本地 HTTP 服务，动态读写）**；由 MCP 工具的 `open-preview` 拉起并打开浏览器（工具面归 MCP 工具面设计）。
- **为什么不用静态生成**：进度写回需要服务端写文件，静态产物只能只读。
- 启动契约（供 #18 实现 open-preview 时对接）：
  - 环境变量：`PREVIEW_WORKSPACE=<项目根>`（即 `.coolteach/` 所在目录，来自 `CLAUDE_PROJECT_DIR` / `--project-root` 解析）、`PORT=<端口>`（默认 `4737`，占用则顺延）。
  - 启动：`node packages/preview/.output/server/index.mjs`（构建产物）或 `npm run dev`；服务启动后打印 `http://localhost:<port>`，open-preview 用系统浏览器打开。
  - 生命周期：持续运行直到被关闭；open-preview 再次调用时先停掉旧实例再拉起。

## 2. 页面结构（自由切换，不是上一课/下一课）

```
/                                     课程列表（卡片：title / domain / status / 进度条）
/courses/<slug>                       课程主页（MISSION 摘要、课次列表带完成标记、继续学习）
/courses/<slug>/lessons/<0001-slug>   单课阅读（内容 + 任务组件 + 标记已学）
```

- **全局导航**（每页常驻）：
  - 顶部/侧栏：**课程选择器**（下拉/导轨，任意切换课程，回应痛点 ①）；
  - 左侧：**课次列表侧栏**（当前课程的 lessons 全列，点击任意课切换，回应痛点 ④）；
  - 底部/页头：上一课/下一课按钮仅作便捷（不是唯一方式）。
- 进度可视：课程卡片与课次列表均显示 x/y 已完成 + 勾选标记。

## 3. Server API（Nuxt server routes，全部限定在解析出的工作区内）

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/api/courses` | 返回 `courses.json`（派生索引） |
| GET | `/api/courses/<slug>` | `course.json` + 课次索引（扫 `lessons/` 读 frontmatter，按 `0001-` 排序）+ `progress.json` |
| GET | `/api/courses/<slug>/lessons/<id>` | 返回单课 Markdown 源（前端渲染） |
| GET | `/api/courses/<slug>/progress` | 返回 `progress.json` |
| PUT | `/api/courses/<slug>/progress` | **写回** `progress.json`（课级 completed / 任务级 tasks） |

## 4. 写回安全

- **只允许服务端写文件**（浏览器不直写文件系统）；所有路径经 `resolve(workspaceRoot, rel)` + 前缀校验，**防路径穿越**（`..` 拒绝）。
- **原子写**：写临时文件 + rename，避免读到半截 JSON。
- **并发**：v1 采用 **last-write-wins**（网页与工具两个写入口共用同一 `progress.json`）；冲突检测/锁留待后续。

## 5. 统一渲染（回应痛点 ②样式不一致）

- 课程 Markdown 用 **markdown-it（纯 CommonMark）** 渲染，不启用 MDC——课程内容保持任何 Agent 工具可写（贴合 课程内容格式 决议）；frontmatter（title/summary/tags）解析用 gray-matter。
- ` ```task ` fenced block 用自定义 renderer 渲染为**交互组件**（按 统一题目/任务标准 的五类：choice/multi/truefalse 即时判分 + `explain` 反馈；short/steps 自评；完成后写回任务级进度）。
- 样式遵循 **cool-design**（Nuxt UI 组件 + Tailwind v4 语义 token，深色默认）；正文用 prose 排版；代码块高亮。
- lesson 顺序 = 文件名 `0001-` 前缀；坏块/坏 frontmatter 显示明确错误（lint 与 #16 共用）。

## 6. 与 MCP 工具记录进度互通

- 同一份 `progress.json`：网页经 PUT /api 写、工具经 record-progress 写；两者均原子写、last-write-wins。
- 预览读文件为**实时**（写后即刷，无需重建缓存）。

## 7. 语言

- 预览 UI：**中文**（与用户交流语言一致）；生成内容默认中文（随课程，Agent 生成时遵循）。——落定「Not yet specified」的语言雾区。

## 8. 待你拍板的决策点

1. **服务形态**：本地 Nuxt 服务、动态读写（推荐）？还是静态生成只读（进度只能靠工具）？
2. **渲染引擎**：markdown-it 纯 CommonMark + 自绘任务组件（推荐，不绑 MDC）？还是 Nuxt Content（MDC 能力，更重）？
3. **写回策略**：原子写 + last-write-wins（v1，推荐）？还是引入锁/冲突检测？
4. **页面结构与语言**：照草稿（课程选择器 + 课次侧栏自由切换、中文 UI）？

## 9. 决议（已锁定）

1. **服务形态**：本地 Nuxt 服务、动态读写；`open-preview` 以 `PREVIEW_WORKSPACE` + `PORT`（默认 4737，占用顺延）拉起并打开浏览器；持续运行，再次调用先停旧再启。
2. **渲染引擎**：markdown-it 纯 CommonMark + gray-matter 解析 frontmatter；` ```task ` 用自定义 renderer 渲染为交互组件（五类题型）；不启用 MDC（课程内容保持任何 Agent 工具可写）。
3. **写回**：仅服务端写文件；路径 resolve + 前缀校验防穿越；原子写（tmp+rename）；v1 **last-write-wins**（网页 PUT /api 与工具 record-progress 互通同一 progress.json）；预览实时读文件。
4. **页面**：课程列表 → 课程主页（MISSION 摘要 + 课次进度）→ 单课阅读；全局课程选择器 + 课次侧栏自由切换；上一课/下一课仅作便捷；样式遵循 cool-design（深色默认）。
5. **语言**：预览 UI 中文；生成内容默认中文（随课程）。
6. **启动契约（供 MCP 工具面设计）**：`PREVIEW_WORKSPACE` 来自项目根解析（`CLAUDE_PROJECT_DIR` / `--project-root`），`PORT` 可配；服务打印 URL 后由 open-preview 打开。
