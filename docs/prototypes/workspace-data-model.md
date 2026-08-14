# `.coolteach/` 工作区数据模型（prototype 草稿 v1）

> 工单：[工作区数据模型](https://github.com/CoolTea001/cool-teach-mcp/issues/14)
> 输入决议：[teach 吸收边界](#11)（每课程保留六类产物、课程完全独立）、[技术栈与仓库结构](#12)、[跨客户端接入与工作区定位](#13)（不依赖 cwd）
> 状态：**已决议（2026-08-14）**，见文末「决议」；本文件归档为 `.coolteach` schema 规格。

## 1. 目录结构

```
<项目根>/
└── .coolteach/                        # 工作区根（由 MCP 服务解析项目根后定位）
    ├── courses.json                   # 课程清单（派生索引，见 §2）
    └── courses/                       # 每门课程一个目录，以 slug 命名
        └── <course-slug>/             # 例：seo / xiaohongshu / frontend
            ├── course.json            # 课程元信息（权威源，见 §3）
            ├── MISSION.md             # 每课程 mission（teach 格式；改动：每课程一份）
            ├── NOTES.md               # 用户学习偏好便签
            ├── GLOSSARY.md            # 课程术语规范（teach 格式）
            ├── RESOURCES.md           # 知识/智慧资源库（teach 格式）
            ├── learning-records/      # ADR 式学习记录：0001-<slug>.md（teach 格式）
            ├── lessons/               # 课程内容单元（Markdown 源，格式细节由 课程内容格式 决议）
            │   ├── 0001-<slug>.md
            │   └── 0002-<slug>.md
            ├── assets/                # 跨课复用的组件/样式（样式细节由 课程内容格式 决议）
            └── progress.json          # 本课程进度（见 §4）
```

- **slug**：ASCII 短横线命名（`seo`、`xiaohongshu`、`frontend`）；既是目录名，也是课程身份，跨文件引用。
- **课程完全独立**（teach 吸收边界 决议）：无跨课程共享 glossary/assets 层；`courses/` 下每目录自治。
- **lesson 编号**：沿用 teach 的 `0001-` 递增编号，跨课不共享序号（各课程从 0001 起）。

## 2. `courses.json` — 课程清单（派生索引）

**权威源是各课程目录里的 `course.json`**；`courses.json` 由 MCP 服务在课程变更后重写（扫描 `courses/*/course.json` 生成），预览页与工具直接读它，避免字段漂移。

```json
{
  "version": 1,
  "generatedAt": "2026-08-14T07:00:00Z",
  "courses": [
    {
      "slug": "seo",
      "title": "SEO 入门",
      "domain": "营销",
      "status": "active"
    }
  ]
}
```

## 3. `course.json` — 课程元信息（权威源）

```json
{
  "version": 1,
  "slug": "seo",
  "title": "SEO 入门",
  "domain": "营销",
  "description": "搜索引擎优化从零到一，目标是独立站自然流量翻倍",
  "status": "active",
  "createdAt": "2026-08-14T07:00:00Z",
  "updatedAt": "2026-08-14T07:00:00Z"
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `slug` | 课程身份，与目录名一致 |
| `title` | 课程标题 |
| `domain` | **领域 = “类型”**（用户澄清：SEO / 小红书运营 / 前端开发 这类），元信息，不影响结构 |
| `description` | 一句话描述（对齐 mission 的“具体目标”） |
| `status` | `active` / `paused` / `archived` |
| `createdAt` / `updatedAt` | ISO 8601 |

## 4. `progress.json` — 每课程进度

**每课程一份**（课程自包含）；网页预览与 MCP 工具共用同一文件、两种写入口（写回安全由 网页预览架构 决议）。

```json
{
  "version": 1,
  "courseSlug": "seo",
  "lessons": {
    "0001-intro":    { "completed": true,  "completedAt": "2026-08-14T07:30:00Z" },
    "0002-keywords": { "completed": false }
  },
  "updatedAt": "2026-08-14T07:30:00Z"
}
```

- lesson 键 = lesson 文件名去 `.md`（`0001-intro`）。
- v1 只记课级 `completed`；任务/测验级进度待 统一题目/任务标准 决议后扩展（可在 `lessons.<key>` 下加 `tasks` 对象，向后兼容）。

## 5. 初始化与缺失处理

- `.coolteach/` 不存在时：MCP 工具首次创建课程前初始化——`mkdir -p .coolteach/courses` + 写 `courses.json`（空清单）。初始化入口属 MCP 工具面设计 决议。
- 课程目录损坏/缺失 `course.json` 时：派生索引跳过并记警告（不阻断其余课程）。

## 6. 待你拍板的决策点

1. **权威源**：课程元信息 = 每课程 `course.json`（派生 `courses.json` 索引）？还是只保留单一 `courses.json`？
2. **进度位置**：`progress.json` 放每课程目录内（推荐，自包含）？还是放工作区级？
3. **manifest 格式**：JSON（推荐，机器可读）？还是 Markdown？
4. 字段与命名是否有要增删的？（如 `domain` 的取值是否要枚举/自由文本）

## 7. 决议（已锁定）

1. **权威源**：课程元信息以每课程 `course.json` 为权威；`courses.json` 为派生索引，由服务扫描 `courses/*/course.json` 重写，避免漂移。
2. **进度位置**：`progress.json` 存每课程目录内（课程自包含）；v1 记课级 `completed`（+`completedAt`），任务级待 统一题目/任务标准 扩展（向后兼容）。
3. **manifest 格式**：JSON（`courses.json`：`version` + `courses[]`）。
4. **字段**：`domain` 自由文本（领域=“类型”，不建枚举）；`slug` / `title` / `description` / `status`（active|paused|archived）/ `createdAt` / `updatedAt` 照本稿。
5. **课程结构**：每课程目录 = `course.json` + `MISSION.md` + `NOTES.md` + `GLOSSARY.md` + `RESOURCES.md` + `learning-records/` + `lessons/`（`0001-<slug>.md`）+ `assets/` + `progress.json`；课程完全独立，lesson 编号各课程从 0001 起。
6. **初始化**：`.coolteach/` 缺失时由 MCP 工具初始化（`mkdir` + 空 `courses.json`）——入口由 MCP 工具面设计 决议。
