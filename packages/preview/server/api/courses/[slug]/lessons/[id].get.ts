export default defineEventHandler((event) => {
  const slug = getRouterParam(event, "slug") ?? "";
  const id = getRouterParam(event, "id") ?? "";
  if (!readCourse(slug)) throw createError({ statusCode: 404, statusMessage: "课程不存在" });
  const lesson = readLesson(slug, id);
  if (!lesson) throw createError({ statusCode: 404, statusMessage: "课次不存在" });
  return lesson;
});
