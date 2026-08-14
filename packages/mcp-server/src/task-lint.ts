/**
 * 统一题目/任务标准 lint（决议 #16）。
 * - error：创建/更新课程内容时拒绝（必填缺失、id 重复、选项不等长、答案无效、explain 缺失…）
 * - warning：提示不阻断（每课至少一个任务、id 命名格式、short 的 rubric、difficulty 枚举…）
 */

export type Severity = "error" | "warning";

export interface LintIssue {
  severity: Severity;
  rule: string;
  message: string;
}

export const TASK_TYPES = ["choice", "multi", "truefalse", "short", "steps"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

const err = (rule: string, message: string): LintIssue => ({ severity: "error", rule, message });
const warn = (rule: string, message: string): LintIssue => ({ severity: "warning", rule, message });

function lintOptions(task: Record<string, unknown>, issues: LintIssue[], min: number, multi: boolean): void {
  const options = task.options;
  if (!Array.isArray(options) || options.length < min) {
    issues.push(err("task-options", `options 至少 ${min} 项`));
    return;
  }
  const strs = options.map((o) => (typeof o === "string" ? o : null));
  if (strs.some((s) => s === null)) {
    issues.push(err("task-options", "options 必须是字符串数组"));
    return;
  }
  // 反线索规则：选项等长（teach 沿用）
  const len = (strs as string[])[0]!.length;
  if (strs.some((s) => s!.length !== len)) {
    issues.push(err("task-options", "options 字符串长度必须一致（反线索规则）"));
  }
  if (multi) {
    if (!Array.isArray(task.answer) || task.answer.length < 1) {
      issues.push(err("task-answer", "multi 的 answer 必须是至少 1 个索引的数组"));
      return;
    }
    const seen = new Set<number>();
    for (const a of task.answer as unknown[]) {
      if (typeof a !== "number" || !Number.isInteger(a) || a < 0 || a >= (strs as string[]).length) {
        issues.push(err("task-answer", `multi 的 answer 索引越界：${String(a)}`));
      } else if (seen.has(a)) {
        issues.push(err("task-answer", "multi 的 answer 索引重复"));
      }
      seen.add(a as number);
    }
  } else {
    const a = task.answer;
    if (typeof a !== "number" || !Number.isInteger(a) || a < 0 || a >= (strs as string[]).length) {
      issues.push(err("task-answer", `choice 的 answer 必须是有效索引（0..${(strs as string[]).length - 1}）`));
    }
  }
}

function lintSteps(task: Record<string, unknown>, issues: LintIssue[]): void {
  const steps = task.steps;
  if (!Array.isArray(steps) || steps.length < 1) {
    issues.push(err("task-steps", "steps 至少 1 步"));
    return;
  }
  steps.forEach((s, i) => {
    if (typeof s !== "object" || s === null) {
      issues.push(err("task-steps", `steps[${i}] 必须是对象`));
      return;
    }
    const step = s as Record<string, unknown>;
    if (typeof step.text !== "string" || !step.text.trim()) issues.push(err("task-steps", `steps[${i}].text 必填`));
    if (typeof step.check !== "string" || !step.check.trim()) issues.push(err("task-steps", `steps[${i}].check 必填（自评标准）`));
  });
}

/** 校验单个 task 块（raw JSON 文本） */
export function lintTaskBlock(raw: string, ctx: { existingIds: Set<string> }): LintIssue[] {
  const issues: LintIssue[] = [];
  let task: unknown;
  try {
    task = JSON.parse(raw);
  } catch (e) {
    return [err("task-json", `task 块不是合法 JSON：${(e as Error).message}`)];
  }
  if (typeof task !== "object" || task === null || Array.isArray(task)) {
    return [err("task-json", "task 块必须是 JSON 对象")];
  }
  const t = task as Record<string, unknown>;

  const id = t.id;
  if (typeof id !== "string" || !id.trim()) {
    issues.push(err("task-id", "缺少 id"));
  } else {
    if (ctx.existingIds.has(id)) issues.push(err("task-id", `id 重复：${id}`));
    if (!/^\d{4}-task-\d+$/.test(id)) issues.push(warn("task-id-format", `id 建议格式 0001-task-N（当前：${id}）`));
  }
  if (typeof id === "string" && id.trim()) ctx.existingIds.add(id);

  if (typeof t.type !== "string" || !(TASK_TYPES as readonly string[]).includes(t.type)) {
    issues.push(err("task-type", `type 必须是 ${TASK_TYPES.join(" / ")}`));
  }
  if (typeof t.question !== "string" || !t.question.trim()) {
    issues.push(err("task-question", "缺少 question（题干）"));
  }
  if (typeof t.explain !== "string" || !t.explain.trim()) {
    issues.push(err("task-explain", "缺少 explain（反馈闭环必填）"));
  }
  if (t.difficulty !== undefined && !["easy", "medium", "hard"].includes(String(t.difficulty))) {
    issues.push(warn("task-difficulty", "difficulty 应为 easy / medium / hard"));
  }

  switch (t.type) {
    case "choice":
      lintOptions(t, issues, 2, false);
      break;
    case "multi":
      lintOptions(t, issues, 3, true);
      break;
    case "truefalse":
      if (typeof t.answer !== "boolean") issues.push(err("task-answer", "truefalse 的 answer 必须是 true / false"));
      break;
    case "short":
      if (typeof t.answer !== "string" || !t.answer.trim()) issues.push(err("task-answer", "short 缺少 answer（参考答案）"));
      if (typeof t.rubric !== "string" || !t.rubric.trim()) issues.push(warn("task-rubric", "short 建议提供 rubric（自评标准）"));
      break;
    case "steps":
      lintSteps(t, issues);
      break;
  }
  return issues;
}

/** 提取 Markdown 中的 ```task fenced block */
export function extractTaskBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```task\s*\r?\n([\s\S]*?)\r?\n```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    if (m[1] !== undefined) blocks.push(m[1].trim());
  }
  return blocks;
}

export interface LessonLintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
  taskCount: number;
}

/** 校验整课：提取 task 块逐个 lint；每课至少一个任务（warning，决议 #16） */
export function lintLesson(md: string): LessonLintResult {
  const existingIds = new Set<string>();
  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const blocks = extractTaskBlocks(md);
  for (const block of blocks) {
    for (const issue of lintTaskBlock(block, { existingIds })) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  }
  if (blocks.length === 0) {
    warnings.push(warn("lesson-min-tasks", "每课至少一个任务（当前 0 个）"));
  }
  return { errors, warnings, taskCount: blocks.length };
}
