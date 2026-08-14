export default defineEventHandler(() => {
  if (!isInitialized()) {
    return { initialized: false, message: "还没有课程。请用 cool_teach_create_course 创建第一门课程。", courses: [] };
  }
  const courses = listCourses().map((c) => ({
    slug: c.slug,
    title: c.title,
    domain: c.domain,
    status: c.status,
    ...courseSummary(c.slug),
  }));
  return { initialized: true, courses };
});
