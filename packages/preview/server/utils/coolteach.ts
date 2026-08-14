/**
 * 预览服务的 .coolteach 只读/写回工具（决议 #14/#17）。
 * 工作区根来自 PREVIEW_WORKSPACE 环境变量（由 open-preview 传入，来自项目根解析）。
 */
import fs from "node:fs";
import path from "node:path";

const root = (): string => process.env.PREVIEW_WORKSPACE || process.cwd();
const ct = (...p: string[]): string => path.join(root(), ".coolteach", ...p);

export const COURSE_STATUSES = ["active", "paused", "archived"] as const;

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

export const isValidSlug = (s: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
export const isValidLessonId = (s: string): boolean => /^\d{4}-[a-z0-9-]+$/.test(s);

export const isInitialized = (): boolean => fs.existsSync(ct("courses.json"));

export interface CourseEntry {
  slug: string;
  title: string;
  status: string;
}

export function listCourses(): CourseEntry[] {
  return readJson<{ courses: CourseEntry[] }>(ct("courses.json"), { courses: [] }).courses;
}

export function readCourse(slug: string): CourseEntry | null {
  if (!isValidSlug(slug)) return null;
  const c = readJson<CourseEntry | null>(ct("courses", slug, "course.json"), null);
  return c && c.slug === slug ? c : null;
}

export function readTextFile(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export interface LessonMeta {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  order: number;
  completed: boolean;
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

function parseFrontmatter(md: string): { data: Record<string, string>; content: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md);
  const body = m?.[1];
  if (!body) return { data: {}, content: md };
  const data: Record<string, string> = {};
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv && kv[1] !== undefined && kv[2] !== undefined) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, content: md.slice(m[0]!.length) };
}

export function listLessons(slug: string): LessonMeta[] {
  const dir = ct("courses", slug, "lessons");
  if (!fs.existsSync(dir)) return [];
  const progress = readProgress(slug);
  const lessons: LessonMeta[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const id = file.slice(0, -3);
    if (!isValidLessonId(id)) continue;
    const { data } = parseFrontmatter(readTextFile(path.join(dir, file)));
    lessons.push({
      id,
      title: data["title"] ?? id,
      summary: data["summary"],
      tags: data["tags"] ? data["tags"].split(/[,\s]+/).filter(Boolean) : undefined,
      order: Number.parseInt(id.slice(0, 4), 10) || 0,
      completed: progress.lessons[id]?.completed ?? false,
    });
  }
  return lessons.sort((a, b) => a.order - b.order);
}

export function readLesson(slug: string, id: string): { meta: Omit<LessonMeta, "completed">; content: string; progress: LessonProgress } | null {
  if (!isValidSlug(slug) || !isValidLessonId(id)) return null;
  const file = ct("courses", slug, "lessons", `${id}.md`);
  if (!fs.existsSync(file)) return null;
  const md = readTextFile(file);
  const { data, content } = parseFrontmatter(md);
  const progress = readProgress(slug);
  return {
    meta: {
      id,
      title: data["title"] ?? id,
      summary: data["summary"],
      tags: data["tags"] ? data["tags"].split(/[,\s]+/).filter(Boolean) : undefined,
      order: Number.parseInt(id.slice(0, 4), 10) || 0,
    },
    content,
    progress: progress.lessons[id] ?? {},
  };
}

export function readProgress(slug: string): CourseProgress {
  return readJson<CourseProgress>(ct("courses", slug, "progress.json"), {
    version: 1,
    courseSlug: slug,
    lessons: {},
    updatedAt: new Date().toISOString(),
  });
}

function writeProgress(slug: string, p: CourseProgress): void {
  p.updatedAt = new Date().toISOString();
  writeJsonAtomic(ct("courses", slug, "progress.json"), p);
}

export function setLessonCompleted(slug: string, lessonId: string, completed: boolean): CourseProgress {
  const p = readProgress(slug);
  p.lessons[lessonId] = { ...p.lessons[lessonId], completed, completedAt: completed ? new Date().toISOString() : undefined };
  writeProgress(slug, p);
  return p;
}

export function setTaskCompleted(slug: string, lessonId: string, taskId: string, completed: boolean): CourseProgress {
  const p = readProgress(slug);
  const lesson = (p.lessons[lessonId] ??= {});
  lesson.tasks = { ...lesson.tasks, [taskId]: { completed, completedAt: completed ? new Date().toISOString() : undefined } };
  writeProgress(slug, p);
  return p;
}

export function courseSummary(slug: string): { lessonsTotal: number; lessonsCompleted: number } | null {
  if (!readCourse(slug)) return null;
  const lessons = listLessons(slug);
  return {
    lessonsTotal: lessons.length,
    lessonsCompleted: lessons.filter((l) => l.completed).length,
  };
}

export function readMission(slug: string): string {
  return readTextFile(ct("courses", slug, "MISSION.md"));
}
