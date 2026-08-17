/**
 * 轻量 i18n：zh / en 两种语言，模块级单例 locale，localStorage 持久化。
 * Nuxt 会自动导入 useI18n。模板里调用 t(key, ...args) 会因读取 locale.value 而保持响应式。
 */
export type Locale = "zh" | "en";

type Message = string;

const dicts: Record<Locale, Record<string, Message>> = {
  zh: {
    appName: "Cool Teach",
    tabCourses: "课程",
    tabLessons: "课件",
    courseCount: "{0} 门",
    noCourses: "还没有课程",
    noCoursesCta:
      "在对话中说 “Use Cool Teach MCP” 或“我想学习…”，智能体会帮你创建课程、生成第一课并直接打开本预览。",
    noCoursesDefault: "创建课程后，这里会默认展示第一门课程的详情。",
    selectCourseFirst: "先选择一门课程，再查看课件",
    noLessons: "还没有课次，让智能体先创建一课",
    lessonCount: "{0} 课",
    lessonProgress: "{0}/{1} 课",
    completed: "已完成",
    incomplete: "未完成",
    mission: "学习目标",
    missionNotSet: "Mission 还没写",
    missionNotSetDesc:
      "告诉智能体你的学习目标：为什么要学这门课？希望学习后达到什么成果？它会据此安排整门课程的内容。",
    lessonList: "课件列表 · {0}",
    continueLearning: "继续学习",
    noLessonsInCourse: "还没有课次。在对话中让智能体用 cool_teach_create_lesson 创建第一课。",
    askTeacher: "有疑问？随时向你的智能体老师提问。",
    markCompleted: "标记已完成",
    viewCourse: "查看课程",
    noLessonsYet: "还没有课次，让智能体先创建一课",
    statusPaused: "暂停中",
    statusArchived: "已归档",
    taskChoice: "单选",
    taskMulti: "多选",
    taskTruefalse: "判断",
    taskShort: "简答",
    taskSteps: "实操清单",
    taskCompleted: "已完成",
    checkAnswer: "检查答案",
    correct: "正确",
    wrong: "错误",
    shortPlaceholder: "写下你的答案…",
    showReferenceAnswer: "查看参考答案",
    hideReferenceAnswer: "收起参考答案",
    iGotIt: "我答对了",
    referenceAnswer: "参考答案",
    rubric: "自评标准",
    allDone: "全部完成",
    answerCorrect: "回答正确",
    answerWrong: "回答错误",
    stepLabel: "{0}（完成标准：{1}）",
    taskParseError: "任务块无法解析",
    unknownError: "未知错误",
    theme: "主题",
    themeSystem: "系统",
    themeLight: "浅色",
    themeDark: "深色",
    language: "语言",
    chinese: "中文",
    english: "English",
  },
  en: {
    appName: "Cool Teach",
    tabCourses: "Courses",
    tabLessons: "Lessons",
    courseCount: "{0} course(s)",
    noCourses: "No courses yet",
    noCoursesCta:
      'Say “Use Cool Teach MCP” or “I want to learn…” in the chat and the agent will create a course, generate the first lesson, and open this preview for you.',
    noCoursesDefault: "After creating a course, the first course's details will be shown here by default.",
    selectCourseFirst: "Select a course first to view its lessons",
    noLessons: "No lessons yet — ask the agent to create the first lesson",
    lessonCount: "{0} lesson(s)",
    lessonProgress: "{0}/{1} lesson(s)",
    completed: "Completed",
    incomplete: "Incomplete",
    mission: "Mission",
    missionNotSet: "Mission not set yet",
    missionNotSetDesc:
      "Tell the agent your learning goals: why you want to learn this and what outcome you expect. It will arrange the whole course around that.",
    lessonList: "Lesson list · {0}",
    continueLearning: "Continue learning",
    noLessonsInCourse:
      "No lessons yet. Ask the agent to create the first lesson with cool_teach_create_lesson in the chat.",
    askTeacher: "Have questions? Ask your AI teacher anytime.",
    markCompleted: "Mark as completed",
    viewCourse: "View course",
    noLessonsYet: "No lessons yet — ask the agent to create the first lesson",
    statusPaused: "Paused",
    statusArchived: "Archived",
    taskChoice: "Single choice",
    taskMulti: "Multiple choice",
    taskTruefalse: "True/False",
    taskShort: "Short answer",
    taskSteps: "Steps",
    taskCompleted: "Done",
    checkAnswer: "Check answer",
    correct: "Correct",
    wrong: "Incorrect",
    shortPlaceholder: "Write your answer…",
    showReferenceAnswer: "Show reference answer",
    hideReferenceAnswer: "Hide reference answer",
    iGotIt: "I got it right",
    referenceAnswer: "Reference answer",
    rubric: "Self-check",
    allDone: "All done",
    answerCorrect: "Correct!",
    answerWrong: "Incorrect",
    stepLabel: "{0} (check: {1})",
    taskParseError: "Could not parse task block",
    unknownError: "Unknown error",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    chinese: "中文",
    english: "English",
  },
};

const STORAGE_KEY = "coolteach-locale";
const locale = ref<Locale>(getInitial());

function getInitial(): Locale {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  }
  return "en";
}

export function useI18n() {
  function t(key: string, ...args: Array<string | number>): string {
    const msg = dicts[locale.value][key];
    if (msg == null) return key;
    let out = msg;
    args.forEach((a, i) => {
      out = out.replaceAll(`{${i}}`, String(a));
    });
    return out;
  }
  function setLocale(l: Locale): void {
    locale.value = l;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
  }
  return { locale, t, setLocale };
}
