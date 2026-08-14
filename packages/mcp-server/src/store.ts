import fs from "node:fs";
import path from "node:path";
import { coolteachDir } from "./workspace.js";
import { parseFrontmatter } from "./frontmatter.js";

// ---------------------------------------------------------------------------
// 基础 IO（原子写）
// ---------------------------------------------------------------------------

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------------------
// 校验
// ---------------------------------------------------------------------------

/** slug：小写字母数字 + 短横线（如 seo / xiaohongshu / frontend） */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/** lesson id：`0001-<slug>`（文件名去 .md） */
export function isValidLessonId(id: string): boolean {
  return /^\d{4}-[a-z0-9-]+$/.test(id);
}

// ---------------------------------------------------------------------------
// .coolteach 结构（决议 #14）
// ---------------------------------------------------------------------------

export const COURSE_STATUSES = ["active", "paused", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface CourseMeta {
  version: number;
  slug: string;
  title: string;
  description?: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseIndexEntry {
  slug: string;
  title: string;
  status: CourseStatus;
}

export interface CourseIndex {
  version: number;
  generatedAt: string;
  courses: CourseIndexEntry[];
}

export interface LessonMeta {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  order: number;
}

export interface LessonProgress {
  completed?: boolean;
  completedAt?: string;
  tasks?: Record<string, { completed?: boolean; completedAt?: string }>;
}

export interface CourseProgress {
  version: number;
  courseSlug: string;
  lessons: Record<string, LessonProgress>;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 路径（全部限定在 .coolteach 内，防穿越由 slug/id 校验保证）
// ---------------------------------------------------------------------------

export const coursesDir = (root: string) => path.join(coolteachDir(root), "courses");
export const indexFile = (root: string) => path.join(coolteachDir(root), "courses.json");
export const courseDir = (root: string, slug: string) => path.join(coursesDir(root), slug);
export const courseFile = (root: string, slug: string) => path.join(courseDir(root, slug), "course.json");
export const lessonsDir = (root: string, slug: string) => path.join(courseDir(root, slug), "lessons");
export const progressFile = (root: string, slug: string) => path.join(courseDir(root, slug), "progress.json");

// ---------------------------------------------------------------------------
// 工作区
// ---------------------------------------------------------------------------

/** 确保 .coolteach 存在：目录 + 空派生索引 */
export function ensureWorkspace(root: string): boolean {
  fs.mkdirSync(coursesDir(root), { recursive: true });
  const idx = indexFile(root);
  if (!fs.existsSync(idx)) {
    writeJsonAtomic(idx, { version: 1, generatedAt: new Date().toISOString(), courses: [] } satisfies CourseIndex);
    return true;
  }
  return false;
}

export function isInitialized(root: string): boolean {
  return fs.existsSync(indexFile(root));
}

/** 重写派生索引 courses.json（扫描各课程目录里的 course.json，避免漂移，决议 #14） */
export function rebuildIndex(root: string): CourseIndex {
  const entries: CourseIndexEntry[] = [];
  if (fs.existsSync(coursesDir(root))) {
    for (const slug of fs.readdirSync(coursesDir(root))) {
      const meta = readJson<CourseMeta | null>(courseFile(root, slug), null);
      if (meta && meta.slug === slug) {
        entries.push({ slug, title: meta.title, status: meta.status });
      }
    }
  }
  const idx: CourseIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    courses: entries.sort((a, b) => a.slug.localeCompare(b.slug)),
  };
  writeJsonAtomic(indexFile(root), idx);
  return idx;
}

// ---------------------------------------------------------------------------
// 课程
// ---------------------------------------------------------------------------

const SKELETON_FILES: Record<string, string> = {
  "MISSION.md": "# Mission: {课程标题}\n\n## Why\n{1-3 句话：学这门课要达成的具体现实目标}\n\n## Success looks like\n- {一个可观察的成果}\n",
  "NOTES.md": "# NOTES\n\n{学习偏好、工作笔记}\n",
  "GLOSSARY.md": "# {课程} Glossary\n\n## Terms\n\n**术语**:\n定义。\n",
  "RESOURCES.md": "# {课程} Resources\n\n## Knowledge\n\n- [标题](https://example.com)\n  一句话：何时用它。\n\n## Wisdom (Communities)\n\n- [社区名](https://example.com)\n  用途。\n",
};

/** 创建/更新课程（upsert）：写 course.json 权威元信息 + 初始化目录骨架（决议 #14/#18） */
export function upsertCourse(
  root: string,
  input: { slug: string; title: string; description?: string; status?: CourseStatus },
): CourseMeta {
  if (!isValidSlug(input.slug)) {
    throw new Error(`slug 不合法（小写字母数字+短横线）：${input.slug}`);
  }
  ensureWorkspace(root);

  const existing = readJson<CourseMeta | null>(courseFile(root, input.slug), null);
  const now = new Date().toISOString();
  const meta: CourseMeta = {
    version: 1,
    slug: input.slug,
    title: input.title,
    description: input.description ?? existing?.description,
    status: input.status ?? existing?.status ?? "active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const dir = courseDir(root, input.slug);
  fs.mkdirSync(lessonsDir(root, input.slug), { recursive: true });
  fs.mkdirSync(path.join(dir, "learning-records"), { recursive: true });
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  for (const [name, template] of Object.entries(SKELETON_FILES)) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, template, "utf8");
  }
  writeJsonAtomic(courseFile(root, input.slug), meta);
  rebuildIndex(root);
  return meta;
}

/** 写入课程 Mission（用户学习目标，围绕它安排后续课程；覆盖骨架模板） */
export function writeMission(root: string, slug: string, mission: string): void {
  const file = path.join(courseDir(root, slug), "MISSION.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, mission.trim() + "\n", "utf8");
}

export function readCourse(root: string, slug: string): CourseMeta | null {
  if (!isValidSlug(slug)) return null;
  const meta = readJson<CourseMeta | null>(courseFile(root, slug), null);
  return meta && meta.slug === slug ? meta : null;
}

export function requireCourse(root: string, slug: string): CourseMeta {
  const meta = readCourse(root, slug);
  if (!meta) throw new Error(`课程不存在：${slug}（请先用 create_course 创建）`);
  return meta;
}

// ---------------------------------------------------------------------------
// 课次
// ---------------------------------------------------------------------------

export function listLessons(root: string, slug: string): LessonMeta[] {
  const dir = lessonsDir(root, slug);
  if (!fs.existsSync(dir)) return [];
  const lessons: LessonMeta[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const id = file.slice(0, -3);
    if (!isValidLessonId(id)) continue;
    const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
    lessons.push({
      id,
      title: data["title"] ?? id,
      summary: data["summary"],
      tags: data["tags"] ? data["tags"].split(/[,\s]+/).filter(Boolean) : undefined,
      order: Number.parseInt(id.slice(0, 4), 10) || 0,
    });
  }
  return lessons.sort((a, b) => a.order - b.order);
}

export function readLesson(root: string, slug: string, id: string): { meta: LessonMeta; content: string } | null {
  if (!isValidLessonId(id)) return null;
  const file = path.join(lessonsDir(root, slug), `${id}.md`);
  if (!fs.existsSync(file)) return null;
  const md = fs.readFileSync(file, "utf8");
  const { data, content } = parseFrontmatter(md);
  return {
    meta: {
      id,
      title: data["title"] ?? id,
      summary: data["summary"],
      tags: data["tags"] ? data["tags"].split(/[,\s]+/).filter(Boolean) : undefined,
      order: Number.parseInt(id.slice(0, 4), 10) || 0,
    },
    content,
  };
}

/** 下一课序号：现有最大 order + 1 */
export function nextLessonOrder(root: string, slug: string): number {
  const lessons = listLessons(root, slug);
  return lessons.reduce((max, l) => Math.max(max, l.order), 0) + 1;
}

export function writeLesson(root: string, slug: string, id: string, title: string, content: string, extras: Record<string, string> = {}): void {
  if (!isValidLessonId(id)) throw new Error(`lesson id 不合法（应为 0001-<slug>）：${id}`);
  const frontmatter = { title, ...extras };
  const file = path.join(lessonsDir(root, slug), `${id}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const md = ["---", ...Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`), "---", "", content.trim(), ""].join("\n");
  fs.writeFileSync(file, md, "utf8");
}

// ---------------------------------------------------------------------------
// 进度（决议 #14：每课程一份 progress.json；课级 + 任务级）
// ---------------------------------------------------------------------------

export function readProgress(root: string, slug: string): CourseProgress {
  requireCourse(root, slug);
  return readJson<CourseProgress>(progressFile(root, slug), {
    version: 1,
    courseSlug: slug,
    lessons: {},
    updatedAt: new Date().toISOString(),
  });
}

export function writeProgress(root: string, slug: string, progress: CourseProgress): void {
  progress.updatedAt = new Date().toISOString();
  writeJsonAtomic(progressFile(root, slug), progress);
}

export function setLessonCompleted(root: string, slug: string, lessonId: string, completed: boolean): CourseProgress {
  const p = readProgress(root, slug);
  p.lessons[lessonId] = { ...p.lessons[lessonId], completed, completedAt: completed ? new Date().toISOString() : undefined };
  writeProgress(root, slug, p);
  return p;
}

export function setTaskCompleted(root: string, slug: string, lessonId: string, taskId: string, completed: boolean): CourseProgress {
  const p = readProgress(root, slug);
  const lesson = (p.lessons[lessonId] ??= {});
  lesson.tasks = { ...lesson.tasks, [taskId]: { completed, completedAt: completed ? new Date().toISOString() : undefined } };
  writeProgress(root, slug, p);
  return p;
}

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------

export interface CourseSummary {
  slug: string;
  title: string;
  status: CourseStatus;
  lessonsTotal: number;
  lessonsCompleted: number;
  progress: Record<string, LessonProgress>;
}

export function courseSummary(root: string, slug: string): CourseSummary | null {
  const meta = readCourse(root, slug);
  if (!meta) return null;
  const lessons = listLessons(root, slug);
  const progress = readProgress(root, slug);
  const lessonsCompleted = lessons.filter((l) => progress.lessons[l.id]?.completed).length;
  return {
    slug: meta.slug,
    title: meta.title,
    status: meta.status,
    lessonsTotal: lessons.length,
    lessonsCompleted,
    progress: progress.lessons,
  };
}

export function listCourseSummaries(root: string): CourseSummary[] {
  ensureWorkspace(root);
  rebuildIndex(root);
  const idx = readJson<CourseIndex>(indexFile(root), { version: 1, generatedAt: "", courses: [] });
  const out: CourseSummary[] = [];
  for (const c of idx.courses) {
    const s = courseSummary(root, c.slug);
    if (s) out.push(s);
  }
  return out;
}
