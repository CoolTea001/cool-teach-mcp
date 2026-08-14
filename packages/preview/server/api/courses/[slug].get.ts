export default defineEventHandler((event) => {
  const slug = getRouterParam(event, "slug") ?? "";
  const course = readCourse(slug);
  if (!course) throw createError({ statusCode: 404, statusMessage: "课程不存在" });

  return {
    course,
    mission: readMission(slug),
    lessons: listLessons(slug),
    summary: courseSummary(slug),
  };
});
