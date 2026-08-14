# 统一题目/任务标准（prototype 草稿 v1）

> 工单：[统一题目/任务标准](https://github.com/CoolTea001/cool-teach-mcp/issues/16)
> 输入决议：[课程内容格式](#15)（任务内联 ` ```task ` fenced block）、[工作区数据模型](#14)（进度扩展点 `lessons.<key>.tasks`）
> 状态：**已决议（2026-08-14）**，见文末「决议」；本文件归档为 task schema 规格。

## 1. 任务块（Task Block）

任务内联在课程 Markdown 中，形如：

````markdown
```task
{
  "id": "0001-task-1",
  "type": "choice",
  "question": "……",
  "options": ["……", "……", "……", "……"],
  "answer": 1,
  "explain": "……"
}
```
````

- 块语言标记固定为 `task`，内容为单个 JSON 对象。
- **id 课程内唯一**：`<lesson编号>-task-<序号>`（如 `0001-task-1`）；预览与进度按它引用。
- 目标：**任何客户端可写、预览可渲染、判后有反馈**。

## 2. 题型与 schema

公共字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 课程内唯一 |
| `type` | ✅ | `choice` / `multi` / `truefalse` / `short` / `steps` |
| `question` | ✅ | 题干 |
| `explain` | ✅ | 解析/反馈（反馈闭环的核心；`steps` 除外，见下） |
| `difficulty` | — | `easy` / `medium` / `hard`（可选） |
| `hint` | — | 提示（可选） |

### 2.1 `choice` 单选

```json
{
  "id": "0001-task-1",
  "type": "choice",
  "question": "哪项是渐进式超负荷的正确定义？",
  "options": [
    "逐步提高肌肉承受的负荷",
    "逐步减少训练组数",
    "每天变换训练动作",
    "增加每次训练时长"
  ],
  "answer": 0,
  "explain": "渐进式超负荷 = 系统性逐步提高肌肉承受的负荷（load/volume/intensity）。"
}
```

- `options`：≥2 项，**字符串等长**（反线索规则，teach 沿用）。
- `answer`：正确项索引（0 起）。

### 2.2 `multi` 多选

```json
{
  "id": "0001-task-2",
  "type": "multi",
  "question": "以下哪些属于构建存储强度的做法？",
  "options": [
    "提取练习",
    "间隔复习",
    "反复阅读",
    "交错练习",
    "标注高亮"
  ],
  "answer": [0, 1, 3],
  "explain": "存储强度靠努力提取（提取练习）、间隔（间隔复习）与技能交错；反复阅读与高亮是流畅性错觉。"
}
```

- `options`：≥3 项，字符串等长。
- `answer`：正确项索引数组（≥1、去重、索引有效）。

### 2.3 `truefalse` 判断

```json
{
  "id": "0001-task-3",
  "type": "truefalse",
  "question": "一工作区只能有一个 mission。",
  "answer": false,
  "explain": "已改为每课程一份 mission；一个工作区可有多门课程。"
}
```

- `answer`：`true` / `false`。

### 2.4 `short` 简答

```json
{
  "id": "0001-task-4",
  "type": "short",
  "question": "用一句话解释为什么 lesson 要短小可完成。",
  "answer": "学习者的工作记忆很小，短课让每次学习都能在记忆容量内完成并获得单个可累积的胜利。",
  "rubric": "提到「工作记忆有限」或「单个可累积的胜利」即算通过；自评后对照参考答案。"
}
```

- `answer`：参考答案（要点）。
- `rubric`：自评标准（建议必填；预览端展示为“对照要点自评”）。

### 2.5 `steps` 实操清单（步骤型任务）

```json
{
  "id": "0001-task-5",
  "type": "steps",
  "question": "完成一次「关键词挖掘」实操：",
  "steps": [
    { "text": "打开资源库中的关键词工具", "check": "已打开并登录" },
    { "text": "输入 3 个种子词",          "check": "每个词都产出了建议列表" },
    { "text": "按搜索量排序并选 5 个词",   "check": "记录到 NOTES.md" }
  ],
  "explain": "完成全部 3 步并对照每步的 check 自评；有疑问向老师提问。"
}
```

- `steps`：有序步骤，每步 `text`（做什么）+ `check`（怎么算完成，自评标准）。
- `explain`：收尾反馈/下一步提示（必填）。

## 3. 质量门槛（Lint 规则）——对症“不可用”

| 规则 | 级别 |
|------|------|
| 必填字段齐全（按题型，见 §2） | error |
| `id` 课程内唯一 | error |
| `options` 字符串等长（choice/multi） | error |
| `answer` 索引/数组有效（choice/multi/truefalse） | error |
| 每课至少一个任务 | **warning**（纯知识课可无，不阻断） |
| `explain` 非空（steps 的每步有 `check`） | error |

- **error = 创建/更新课程内容时拒绝**并给出逐条修正提示；**warning = 提示不阻断**。

## 4. 校验与渲染

- **校验**：同一套 lint 规则由 MCP 工具（创建/更新课程内容时强校验）与预览端共用；预览遇到坏块显示明确错误信息（而非静默不可用）。
- **渲染**（交互细节归 网页预览架构）：choice/multi/truefalse 即时判分 + 显示 `explain`；short 展示参考答案与 `rubric` 自评；steps 展示清单与逐项 `check` 勾选。
- **任务级进度**（扩展点，向后兼容）：完成后写回 `progress.json` 的 `lessons.<key>.tasks.<id> = { completed, completedAt }`。

## 5. 待你拍板的决策点

1. **题型集合**：五类（choice / multi / truefalse / short / steps）够吗？增/减？
2. **质量门槛强度**：error 级 = 创建时拒绝（推荐，杜绝“不可用”）？还是降为警告放行？
3. **每课至少一个任务**：保持 warning（推荐）？还是升为 error？
4. **字段增删**：`difficulty` / `hint` 要不要？`id` 命名 `0001-task-N` 可以吗？

## 6. 决议（已锁定）

1. **题型五类照本稿**：`choice` / `multi` / `truefalse` / `short` / `steps`。
2. **强校验**：error 级规则（必填缺失、`id` 重复、`options` 不等长、`answer` 无效）在创建/更新课程内容时**拒绝**并给出逐条修正提示；warning 级（每课至少一个任务）提示不阻断。
3. **校验共用**：同一套 lint 由 MCP 工具与预览端共用；预览遇坏块显示明确错误。
4. **字段照本稿**：`id`（`0001-task-N`，课程内唯一）+ `type` + `question` + `explain`（必填，`steps` 每步含 `check`）+ `difficulty` / `hint`（可选）。
5. **任务级进度**：完成后写回 `progress.json` 的 `lessons.<key>.tasks.<id> = { completed, completedAt }`（向后兼容扩展）。
