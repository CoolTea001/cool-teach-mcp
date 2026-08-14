/**
 * cool-teach-mcp e2e 冒烟测试（协议级）。
 * 前置：已构建 packages/mcp-server（pnpm --filter @cool-teach/mcp-server build）。
 * 运行：pnpm test:e2e
 * 流程：临时工作区 → 拉起 stdio 服务器 → 五件套工具逐一验证（含 lint 拒绝）→ 落盘检查 → 清理。
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = path.resolve("packages/mcp-server/dist/index.js");
assert.ok(fs.existsSync(SERVER), `未构建服务器：${SERVER}，请先运行 pnpm --filter @cool-teach/mcp-server build`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "coolteach-e2e-"));
const client = new Client({ name: "coolteach-e2e", version: "0.0.1" }, { capabilities: {} });
let transport;

const VALID_LESSON = `## 关键词研究

先选词，再验证。

\`\`\`task
{
  "id": "0001-task-1",
  "type": "choice",
  "question": "渐进式超负荷是什么？",
  "options": ["逐步提高负荷", "逐步减少负荷", "保持负荷不变", "任意切换动作"],
  "answer": 0,
  "explain": "逐步提高负荷是渐进式超负荷的核心。"
}
\`\`\`
`;

const INVALID_LESSON = `## 坏任务

\`\`\`task
{
  "id": "0001-task-1",
  "type": "choice",
  "question": "选项不等长",
  "options": ["短", "这个选项明显更长一些"],
  "answer": 0
}
\`\`\`
`;

function toolText(result) {
  assert.ok(result.content?.[0]?.type === "text", "工具应返回 text 内容");
  return JSON.parse(result.content[0].text);
}

async function main() {
  console.log(`工作区：${tmp}`);
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER, "--project-root", tmp],
  });
  await client.connect(transport);

  // 1) 工具面：六件套
  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name);
  for (const expected of [
    "cool_teach_list_courses",
    "cool_teach_create_course",
    "cool_teach_create_lesson",
    "cool_teach_record_progress",
    "cool_teach_open_preview",
    "cool_teach_continue",
  ]) {
    assert.ok(names.includes(expected), `缺少工具：${expected}（实际：${names.join(",")}）`);
  }
  console.log("✓ 六件套工具齐全");

  // 2) 未初始化时的友好引导
  const empty = toolText(await client.callTool({ name: "cool_teach_list_courses", arguments: {} }));
  assert.equal(empty.initialized, false);
  assert.match(empty.message, /create_course/);
  console.log("✓ 未初始化友好引导");

  // 3) 创建课程（自动初始化 + mission 写入 MISSION.md）
  const created = toolText(
    await client.callTool({
      name: "cool_teach_create_course",
      arguments: {
        slug: "seo",
        title: "SEO 入门",
        description: "自然流量翻倍",
        mission: "# Mission: SEO 入门\n\n## Why\n三个月内让独立站自然流量翻倍。\n\n## Success looks like\n- 能独立做关键词研究并输出布局方案",
      },
    }),
  );
  assert.equal(created.course.slug, "seo");
  assert.equal(created.missionWritten, true);
  assert.ok(created.course.domain === undefined, "course.json 不应再有 domain 字段");
  assert.ok(fs.existsSync(path.join(tmp, ".coolteach", "courses.json")), "courses.json 应已生成");
  assert.ok(fs.existsSync(path.join(tmp, ".coolteach", "courses", "seo", "MISSION.md")), "MISSION.md 骨架应生成");
  const missionMd = fs.readFileSync(path.join(tmp, ".coolteach", "courses", "seo", "MISSION.md"), "utf8");
  assert.ok(missionMd.includes("自然流量翻倍"), "mission 应写入 MISSION.md");
  console.log("✓ 创建课程 + 自动初始化 + mission 写入");

  // 4) 创建课（含合法任务）
  const lesson = toolText(
    await client.callTool({
      name: "cool_teach_create_lesson",
      arguments: { courseSlug: "seo", slug: "keywords", title: "关键词研究", content: VALID_LESSON },
    }),
  );
  assert.equal(lesson.file, "seo/lessons/0001-keywords.md");
  assert.equal(lesson.taskCount, 1);
  assert.equal(lesson.warnings.length, 0);
  console.log("✓ 创建课 + 任务 lint 通过");

  // 5) 非法任务被拒绝（error 级强校验）
  const bad = await client.callTool({
    name: "cool_teach_create_lesson",
    arguments: { courseSlug: "seo", slug: "bad", title: "坏课", content: INVALID_LESSON },
  });
  assert.equal(bad.isError, true);
  const errText = bad.content[0].text;
  assert.match(errText, /task-options/);
  assert.ok(!fs.existsSync(path.join(tmp, ".coolteach", "courses", "seo", "lessons", "0002-bad.md")), "非法课不应落盘");
  console.log("✓ 非法任务被拒绝且不落盘");

  // 6) 记录进度（课级）
  await client.callTool({
    name: "cool_teach_record_progress",
    arguments: { courseSlug: "seo", lessonId: "0001-keywords", completed: true },
  });
  const progress = JSON.parse(fs.readFileSync(path.join(tmp, ".coolteach", "courses", "seo", "progress.json"), "utf8"));
  assert.equal(progress.lessons["0001-keywords"].completed, true);
  console.log("✓ 记录课级进度");

  // 7) 记录进度（任务级）
  await client.callTool({
    name: "cool_teach_record_progress",
    arguments: { courseSlug: "seo", lessonId: "0001-keywords", taskId: "0001-task-1", taskCompleted: true },
  });
  const p2 = JSON.parse(fs.readFileSync(path.join(tmp, ".coolteach", "courses", "seo", "progress.json"), "utf8"));
  assert.equal(p2.lessons["0001-keywords"].tasks["0001-task-1"].completed, true);
  console.log("✓ 记录任务级进度");

  // 8) 列表汇总
  const list = toolText(await client.callTool({ name: "cool_teach_list_courses", arguments: {} }));
  assert.equal(list.courses.length, 1);
  assert.equal(list.courses[0].lessonsTotal, 1);
  assert.equal(list.courses[0].lessonsCompleted, 1);
  console.log("✓ 课程汇总正确");

  // 8.1) 再建一课（保持一门未完成，供 continue 测试）
  await client.callTool({
    name: "cool_teach_create_lesson",
    arguments: { courseSlug: "seo", slug: "tools", title: "SEO 工具", content: VALID_LESSON },
  });

  // 8.5) 继续学习：有未完成课次 → confirm（提醒+确认，不自动创建）
  const cont = toolText(await client.callTool({ name: "cool_teach_continue", arguments: { courseSlug: "seo" } }));
  assert.equal(cont.status, "confirm");
  assert.ok(cont.unfinishedLessons.length > 0, "应列出未完成课次");
  assert.ok(!fs.existsSync(path.join(tmp, ".coolteach", "courses", "seo", "lessons", "0003-tools.md")), "confirm 时不应自动创建新课次");
  console.log("✓ 继续学习：有未完成课次 → 提醒确认（不自动创建）");

  // 8.6) 标记全部完成后 → ready
  await client.callTool({
    name: "cool_teach_record_progress",
    arguments: { courseSlug: "seo", lessonId: "0002-tools", completed: true },
  });
  const cont2 = toolText(await client.callTool({ name: "cool_teach_continue", arguments: { courseSlug: "seo" } }));
  assert.equal(cont2.status, "ready");
  console.log("✓ 继续学习：无未完成课次 → ready");

  // 8.7) 未指定课程（多课程）→ choose_course
  await client.callTool({
    name: "cool_teach_create_course",
    arguments: { slug: "xiaohongshu", title: "小红书运营" },
  });
  const cont3 = toolText(await client.callTool({ name: "cool_teach_continue", arguments: {} }));
  assert.equal(cont3.status, "choose_course");
  assert.equal(cont3.courses.length, 2);
  console.log("✓ 继续学习：未指定课程 → 列出课程供选择");

  // 9) 多课程并存
  const list2 = toolText(await client.callTool({ name: "cool_teach_list_courses", arguments: {} }));
  assert.equal(list2.courses.length, 2);
  console.log("✓ 多课程并存");

  console.log("\nALL E2E PASSED ✓");
}

try {
  await main();
} finally {
  await client.close().catch(() => {});
  transport?.close?.().catch(() => {});
  fs.rmSync(tmp, { recursive: true, force: true });
}
