import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ensureWorkspace,
  isInitialized,
  isValidLessonId,
  courseSummary,
  listCourseSummaries,
  listLessons,
  nextLessonOrder,
  readLesson,
  readProgress,
  requireCourse,
  setLessonCompleted,
  setTaskCompleted,
  upsertCourse,
  writeLesson,
  writeMission,
  type CourseStatus,
} from "./store.js";
import { lintLesson } from "./task-lint.js";
import { startPreview } from "./preview.js";

const text = (json: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(json, null, 2) }] });

const ok = { ok: true };

/** cool_teach_continue 的课程级判断（服务端决策，不自动创建课次） */
function continueForCourse(projectRoot: string, slug: string) {
  const summary = courseSummary(projectRoot, slug);
  if (!summary) return text({ status: "not_found", message: `课程不存在：${slug}` });
  const unfinished = listLessons(projectRoot, slug).filter((l) => !summary.progress[l.id]?.completed);
  if (unfinished.length > 0) {
    return text({
      status: "confirm",
      courseSlug: slug,
      unfinishedLessons: unfinished.map((l) => ({ id: l.id, title: l.title })),
      message: `「${summary.title}」还有 ${unfinished.length} 课未完成。请先提醒用户，并询问是否确认要创建新的课次——不要擅自新建。`,
    });
  }
  return text({
    status: "ready",
    courseSlug: slug,
    message: `「${summary.title}」没有未完成课次。若用户希望继续，可按最近发展区创建下一课（create_lesson），然后 open_preview。`,
  });
}

/**
 * 注册 cool_teach_* 五件套工具（决议 #18）。
 * “Use Cool Teach MCP” 是用户唤起这些工具的口头禅；各工具描述面向 Agent 可发现性撰写。
 */
export function registerTools(server: McpServer, projectRoot: string): void {
  // ------------------------------------------------------------------ list
  server.registerTool(
    "cool_teach_list_courses",
    {
      title: "列出课程与进度",
      description:
        "列出当前工作区 .coolteach 里的所有课程及每门课的学习进度（课次总数/已完成数）。未初始化时返回友好空状态并提示用 cool_teach_create_course 创建第一门课程。",
      inputSchema: z.object({}),
    },
    async () => {
      if (!isInitialized(projectRoot)) {
        return text({
          initialized: false,
          message: "还没有课程。请用 cool_teach_create_course 创建第一门课程（例如领域=营销 的 SEO 课程）。",
          courses: [],
        });
      }
      const courses = listCourseSummaries(projectRoot);
      return text({ initialized: true, courses });
    },
  );

  // ----------------------------------------------------------------- continue
  server.registerTool(
    "cool_teach_continue",
    {
      title: "继续学习（查询下一步）",
      description:
        "用户说“继续学习”时调用：判断课程是否有未完成课次，返回下一步动作——confirm（有未完成课次：先提醒用户并询问是否确认创建新课次，不擅自新建）/ ready（无未完成，可创建下一课）/ choose_course（未指定课程时列出课程供用户选择）/ no_courses（还没有课程）。不会自动创建课次。",
      inputSchema: z.object({
        courseSlug: z.string().optional().describe("用户指定的课程 slug；不指定则返回课程列表供选择（若只有一门课则直接使用）"),
      }),
    },
    async ({ courseSlug }) => {
      if (!isInitialized(projectRoot)) {
        return text({
          status: "no_courses",
          message: "还没有课程。引导用户开始学习新主题：create_course → create_lesson（第一课）→ open_preview。",
        });
      }
      if (!courseSlug) {
        const courses = listCourseSummaries(projectRoot);
        if (courses.length === 1) {
          return continueForCourse(projectRoot, courses[0]!.slug);
        }
        return text({
          status: "choose_course",
          message: "请让用户选择一门课程继续学习。",
          courses: courses.map((c) => ({
            slug: c.slug,
            title: c.title,
            lessonsTotal: c.lessonsTotal,
            lessonsCompleted: c.lessonsCompleted,
          })),
        });
      }
      return continueForCourse(projectRoot, courseSlug);
    },
  );

  // ----------------------------------------------------------------- create_course
  server.registerTool(
    "cool_teach_create_course",
    {
      title: "创建/更新课程",
      description:
        "创建一门新课程或更新已有课程（upsert）。自动初始化 .coolteach（若不存在），创建课程目录骨架（course.json / MISSION.md / NOTES.md / GLOSSARY.md / RESOURCES.md / learning-records/ / lessons/ / assets/）并重写派生索引 courses.json。slug 用英文短横线命名（如 seo、xiaohongshu、frontend）。【流程】创建**前**应先访谈用户：为什么要学这门课？希望学习后的成果是什么？（Why / Success looks like / Constraints）→ 把访谈结果通过 mission 参数写入 MISSION.md；创建后立即生成第一课（cool_teach_create_lesson，含任务块），然后调用 cool_teach_open_preview 打开预览。后续所有课程内容围绕该 Mission 目标安排。",
      inputSchema: z.object({
        slug: z.string().describe("课程身份，小写字母数字+短横线，如 seo"),
        title: z.string().describe("课程标题"),
        description: z.string().optional().describe("一句话描述"),
        status: z.enum(["active", "paused", "archived"]).optional().describe("默认 active"),
        mission: z
          .string()
          .optional()
          .describe("用户的学习目标（MISSION.md 内容，Markdown）：Why 为什么学 / Success looks like 期望成果 / Constraints 约束。创建前先访谈用户获取"),
      }),
    },
    async ({ slug, title, description, status, mission }) => {
      const meta = upsertCourse(projectRoot, {
        slug,
        title,
        description,
        status: status as CourseStatus | undefined,
      });
      if (mission) writeMission(projectRoot, slug, mission);
      return text({ ...ok, course: meta, missionWritten: Boolean(mission), message: `课程已就绪：${title}` });
    },
  );

  // ----------------------------------------------------------------- create_lesson
  server.registerTool(
    "cool_teach_create_lesson",
    {
      title: "创建/更新一课",
      description:
        "创建或更新课程里的一个课次（lessons/NNNN-<slug>.md，Markdown 源，frontmatter 含 title/summary/tags）。任务以 ```task JSON fenced block 内联在正文（题型：choice/multi/truefalse/short/steps，字段见统一任务标准）。执行 task lint 强校验：error 级问题（必填缺失、id 重复、选项不等长、答案无效、explain 缺失等）会拒绝写入并逐条提示；warning 级（如每课至少一个任务）只提示不阻断。",
      inputSchema: z.object({
        courseSlug: z.string().describe("课程 slug"),
        slug: z.string().describe("课次名（短横线命名），如 keywords-research"),
        title: z.string().describe("课次标题"),
        order: z.number().int().min(1).optional().describe("课序号（4 位前缀），缺省自动取下一个序号"),
        summary: z.string().optional().describe("一句话摘要（frontmatter）"),
        tags: z.string().optional().describe("逗号分隔标签（frontmatter，可选）"),
        content: z.string().describe("Markdown 正文（含 ```task 任务块；不要含 frontmatter）"),
      }),
    },
    async ({ courseSlug, slug, title, order, summary, tags, content }) => {
      requireCourse(projectRoot, courseSlug);
      const seq = order ?? nextLessonOrder(projectRoot, courseSlug);
      const id = `${String(seq).padStart(4, "0")}-${slug}`;
      const lint = lintLesson(content);
      if (lint.errors.length > 0) {
        const detail = lint.errors.map((e) => `- [${e.rule}] ${e.message}`).join("\n");
        throw new Error(`课程内容未通过任务标准校验（${lint.errors.length} 个 error）：\n${detail}`);
      }
      writeLesson(projectRoot, courseSlug, id, title, content, {
        ...(summary ? { summary } : {}),
        ...(tags ? { tags } : {}),
      });
      return text({
        ...ok,
        file: `${courseSlug}/lessons/${id}.md`,
        order: seq,
        taskCount: lint.taskCount,
        warnings: lint.warnings.map((w) => w.message),
      });
    },
  );

  // ----------------------------------------------------------------- record_progress
  server.registerTool(
    "cool_teach_record_progress",
    {
      title: "记录学习进度",
      description:
        "记录某门课程某课次的进度：课级 completed（学完/未学完）或任务级 tasks.<id> 完成状态。写入该课程目录内的 progress.json（原子写），网页预览与工具共用同一文件。",
      inputSchema: z.object({
        courseSlug: z.string().describe("课程 slug"),
        lessonId: z.string().describe("课次 id，如 0001-intro"),
        completed: z.boolean().optional().describe("课级：是否已完成本课"),
        taskId: z.string().optional().describe("任务级：任务 id（如 0001-task-1）"),
        taskCompleted: z.boolean().optional().describe("任务级：该任务是否完成"),
      }),
    },
    async ({ courseSlug, lessonId, completed, taskId, taskCompleted }) => {
      if (!isValidLessonId(lessonId)) throw new Error(`lessonId 不合法：${lessonId}`);
      let progress;
      if (taskId !== undefined) {
        if (taskCompleted === undefined) throw new Error("任务级记录需要 taskCompleted");
        progress = setTaskCompleted(projectRoot, courseSlug, lessonId, taskId, taskCompleted);
      } else {
        if (completed === undefined) throw new Error("课级记录需要 completed");
        progress = setLessonCompleted(projectRoot, courseSlug, lessonId, completed);
      }
      return text({ ...ok, lesson: progress.lessons[lessonId] ?? {} });
    },
  );

  // ----------------------------------------------------------------- open_preview
  server.registerTool(
    "cool_teach_open_preview",
    {
      title: "打开课程预览",
      description:
        "启动本地网页预览服务（packages/preview）并在浏览器打开：可查看所有课程与每门课的课次进度、自由切换课程与课次、在网页上标记已学/完成任务（写回 .coolteach）。服务持续运行，再次调用会先停旧实例再启动。",
      inputSchema: z.object({
        port: z.number().int().min(1024).max(65535).optional().describe("端口，默认 4737，占用则自动顺延"),
      }),
    },
    async ({ port }) => {
      ensureWorkspace(projectRoot);
      const { url, port: used } = await startPreview(projectRoot, port ?? 4737);
      return text({ ...ok, url, port: used, message: `预览已打开：${url}` });
    },
  );
}
