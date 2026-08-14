# cool-teach-mcp

An MCP service that helps you plan your learning tasks — multi-course learning in a single workspace, with a local web preview.

取代 teach 技能：在任意支持 MCP 的主流 Agent 工具（Claude Code / Cursor / opencode / Trae / Codex CLI）中说 **“Use Cool Teach MCP”**，智能体即按集成在 MCP 服务里的流程工作：创建课程 → 生成第一课 → **立即打开网页预览**；说“继续学习”时由 `cool_teach_continue` 服务端判断下一步（有未完成课次先提醒确认、无则创建下一课、未指定课程则列出课程供选择）。

**流程载体**：触发与继续学习流程直接集成在 MCP 服务内——① 服务器在协议层声明 `instructions`（规范客户端会透传给模型）；② 工具描述携带流程指引（所有客户端可见）；③ `cool_teach_continue` 把“继续学习”的判断逻辑做进服务端（不依赖技能文件）。

## 功能

- **多课程工作区**（`.coolteach/`）：同一项目里并存多门课程，课程完全独立，每课程含 MISSION / NOTES / GLOSSARY / RESOURCES / learning-records / lessons / assets / progress。
- **统一课程内容标准**：课程为单文件 Markdown（frontmatter: title/summary/tags），任务内联 ` ```task ` JSON 块；五类题型（choice / multi / truefalse / short / steps），创建时 lint 强校验（必填、选项等长反线索、答案有效、explain 反馈闭环），从源头杜绝“不可用”任务。
- **本地网页预览**：**侧边栏 + 阅读区**布局——侧栏列出课程与当前课程的课次（自由切换），阅读区展示选中的课件；网页可标记“已学”与完成任务并写回 `.coolteach`，与 MCP 工具记录互通（原子写 + last-write-wins）。
- **统一渲染**：预览按 cool-design（Nuxt UI + Tailwind CSS v4，深色默认）渲染课程与任务，课程文件零样式。

## 目录结构

```
packages/
  mcp-server/   # MCP 服务（TypeScript + 官方 SDK，stdio；流程集成在 instructions + 工具描述 + cool_teach_continue）
  preview/      # 本地网页预览（Nuxt + Nuxt UI v4，侧边栏+阅读区）
docs/
  prototypes/   # 已决议规格：工作区数据模型 / 任务标准 / 预览架构
  client-setup.md  # 五个客户端的接入配置
```

## 快速开始

```bash
pnpm install
pnpm --filter @cool-teach/mcp-server build
pnpm --filter @cool-teach/preview build   # 预览功能需要
pnpm test:e2e                              # 协议级端到端测试
```

然后把 MCP 服务接入你的客户端（配置样例见 [docs/client-setup.md](docs/client-setup.md)），在对话中说 **“Use Cool Teach MCP”**。

## MCP 工具（五件套）

| 工具 | 作用 |
|------|------|
| `cool_teach_list_courses` | 列出课程与进度概览（未初始化时友好引导） |
| `cool_teach_create_course` | 创建/更新课程（自动初始化 `.coolteach`；创建后应接生成第一课 + 打开预览） |
| `cool_teach_create_lesson` | 创建/更新课次（内置任务 lint 强校验） |
| `cool_teach_record_progress` | 记录课级/任务级进度 |
| `cool_teach_open_preview` | 拉起本地预览并打开浏览器 |
| `cool_teach_continue` | 继续学习的服务端判断：confirm（有未完成课次，提醒+确认）/ ready（可建下一课）/ choose_course（让用户选课） |

工作区定位：`CLAUDE_PROJECT_DIR` > `--project-root` 参数 > `cwd` 兜底（不依赖 cwd）。

## 验证

- `pnpm test:e2e`：协议级 e2e（工具面、自动初始化、lint 拒绝、进度写回、多课程）。
- 真实客户端实连：Claude Code 等接入后跑通 “Use Cool Teach MCP” 全流程。

## 设计决策

本项目的设计与实现遵循 [cool-wayfinder 地图 #10](https://github.com/CoolTea001/cool-teach-mcp/issues/10) 的 8 条决议（teach 吸收边界 / 技术栈 / 跨客户端接入 / 工作区数据模型 / 课程内容格式 / 统一任务标准 / 预览架构 / 工具面）。
