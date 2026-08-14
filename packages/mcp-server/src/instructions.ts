/**
 * 服务器级 instructions（协议层，规范客户端会透传给模型）：
 * 触发流程、继续学习流程、任务标准、教学法。与工具描述共同构成"Use Cool Teach MCP"的流程载体。
 */
export const SERVER_INSTRUCTIONS = `cool-teach-mcp：多课程学习工作区服务。当用户说 “Use Cool Teach MCP”、表达想学某主题、或要继续学习时，按以下流程使用本服务工具。

## 开始学习新主题（第一时间看到内容）
0. **先访谈用户，再建课**：问清「为什么要学这门课？希望学习后的成果是什么？」（Why / Success looks like / 约束），不要未经访谈就创建课程。
1. cool_teach_create_course：创建课程（slug 英文短横线，如 seo / frontend；title 用用户语言），把访谈结果通过 mission 参数写入 MISSION.md。自动初始化 .coolteach 与课程目录骨架。
2. cool_teach_create_lesson：立即生成第一课——围绕 MISSION 目标，短小、可快速完成、给用户一个可累积的胜利；任务内联 \`\`\`task JSON 块（见任务标准）。
3. cool_teach_open_preview：立即打开网页预览，让用户第一时间看到课程内容。
4. 简短告知：课程已建好、第一课是什么、预览已打开；有疑问可随时问。

## 继续学习
用户说“继续学习”时：
1. 判断用户是否指定了课程：
   - 指定了：调用 cool_teach_continue（带 courseSlug）。若返回 confirm（有未完成课次），先提醒用户还有哪些课没学，并询问确认是否要创建新课次——不要擅自新建；确认后再 create_lesson。
   - 未指定：先从对话上下文推断；推断不了则调用 cool_teach_continue（不带 courseSlug），按返回的课程列表让用户选择。
2. 无未完成课次、用户要继续时：按最近发展区创建下一课（读 MISSION.md 与 learning-records/ 判断教什么），然后 open_preview。

## 任务标准（统一题目标准，杜绝不可用任务）
- 题型五类：choice 单选 / multi 多选 / truefalse 判断 / short 简答 / steps 实操清单。
- 每个任务必须有：id（0001-task-N，课程内唯一）、type、question、explain（反馈闭环必填；steps 每步还要有 check 自评标准）。
- 选择题（choice/multi）的 options 字符串必须等长（反线索规则）；answer 为正确项索引（multi 为索引数组）。
- 创建课次时工具会执行 lint 强校验，error 会拒绝写入——按提示修正后重试。

## 教学法
- Mission 驱动：每门课程先有 MISSION.md（用户学它的具体目标：Why / Success looks like / 约束），**所有课程内容与练习围绕该目标安排**；创建课程前先访谈用户获取目标，目标不清时先访谈再建课。
- 最近发展区（ZPD）：每次只教“刚好够得着”的一课；用 learning-records/ 判断。
- 每课短小可完成、单个可累积的胜利；链接其他课与参考文档；推荐一手高信任资源；结尾提醒可提问。
- 反馈闭环：练习尽量即时自动反馈（任务组件会判分并显示 explain）。
- 术语规范：遵守该课程 GLOSSARY.md 的用词；用户有非平凡理解/更正误解/mission 变化时写入 learning-records/。
- 进度：用户学完一课 → cool_teach_record_progress（completed: true）；完成任务 → 记录任务级（taskId + taskCompleted）。`;
