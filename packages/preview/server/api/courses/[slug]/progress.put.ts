/**
 * 进度写回（决议 #17）：网页与 MCP 工具共用同一 progress.json，原子写 + last-write-wins。
 * body: { lessonId, completed? } 课级 或 { lessonId, taskId, taskCompleted? } 任务级
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug") ?? "";
  if (!readCourse(slug)) throw createError({ statusCode: 404, statusMessage: "课程不存在" });

  const body = await readBody<{ lessonId?: string; completed?: boolean; taskId?: string; taskCompleted?: boolean }>(event);
  const lessonId = body?.lessonId ?? "";
  if (!isValidLessonId(lessonId)) throw createError({ statusCode: 400, statusMessage: "lessonId 不合法" });

  let progress;
  if (body?.taskId !== undefined) {
    if (body.taskCompleted === undefined) throw createError({ statusCode: 400, statusMessage: "任务级记录需要 taskCompleted" });
    progress = setTaskCompleted(slug, lessonId, body.taskId, body.taskCompleted);
  } else {
    if (body?.completed === undefined) throw createError({ statusCode: 400, statusMessage: "课级记录需要 completed" });
    progress = setLessonCompleted(slug, lessonId, body.completed);
  }
  return { lesson: progress.lessons[lessonId] ?? {} };
});
