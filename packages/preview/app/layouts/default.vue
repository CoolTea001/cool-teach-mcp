<script setup lang="ts">
const route = useRoute();
const slug = computed(() => route.params.slug as string | undefined);

const { data: coursesData } = await useFetch("/api/courses");
const { data: courseData } = await useFetch(
  () => (slug.value ? `/api/courses/${slug.value}` : null),
  { watch: [() => route.params.slug] },
);

const courses = computed(() => coursesData.value?.courses ?? []);
const lessons = computed(() => courseData.value?.lessons ?? []);
const currentLessonId = computed(() => route.params.id as string | undefined);

// 滚动阴影（决议 #37）：滚动区边缘淡出，提示还有更多内容
const coursesScrollEl = useTemplateRef("coursesScrollEl");
const tocScrollEl = useTemplateRef("tocScrollEl");
const mainScrollEl = useTemplateRef("mainScrollEl");
const { style: coursesScrollStyle } = useScrollShadow(coursesScrollEl, { size: 28 });
const { style: tocScrollStyle } = useScrollShadow(tocScrollEl, { size: 28 });
const { style: mainScrollStyle } = useScrollShadow(mainScrollEl, { size: 28 });

// 侧栏标签：课程 / 课件；点击课程自动切到课件标签页
const { t } = useI18n();
const tab = ref<string>("courses");
const tabItems = computed(() => [
  { label: `${t("tabCourses")} · ${courses.value.length}`, value: "courses" },
  { label: `${t("tabLessons")} · ${lessons.value.length}`, value: "toc" },
]);
function selectCourse(courseSlug: string): void {
  tab.value = "toc";
  navigateTo(`/course/${courseSlug}`);
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-default text-default">
    <!-- 侧边栏：课程 / 目录 两个标签页（决议 #17，自由切换） -->
    <aside class="flex w-72 shrink-0 flex-col border-r border-default bg-muted/30">
      <div class="flex items-center justify-between border-b border-default px-4 py-3">
        <NuxtLink to="/" class="text-xl font-bold text-highlighted">Cool Teach</NuxtLink>
        <div class="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <UTabs
        v-model="tab"
        variant="pill"
        color="primary"
        :content="false"
        :items="tabItems"
        class="m-4"
      />

      <!-- 课程标签页：课程卡片列表；点击课程自动切到课件 -->
      <div ref="coursesScrollEl" :style="coursesScrollStyle" v-if="tab === 'courses'" class="flex-1 overflow-y-auto p-3">
        <nav class="space-y-2">
          <button
            v-for="c in courses"
            :key="c.slug"
            type="button"
            class="flex w-full flex-col gap-2 rounded-lg border border-default bg-elevated p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            :class="c.slug === slug ? 'border-primary/40 ring-1 ring-inset ring-primary/20' : 'hover:border-primary/40'"
            @click="selectCourse(c.slug)"
          >
            <span
              class="line-clamp-2 text-sm font-medium"
              :class="c.slug === slug ? 'text-primary' : 'text-default'"
              :title="c.title"
            >
              {{ c.title }}
            </span>
            <span class="shrink-0 text-xs tabular-nums text-muted">{{ t("lessonCount", c.lessonsTotal ?? 0) }}</span>
          </button>
          <p v-if="!courses.length" class="px-1 py-2 text-xs text-dimmed">{{ t("noCourses") }}</p>
        </nav>
      </div>

      <!-- 课件标签页：当前课程的课件列表 -->
      <div ref="tocScrollEl" :style="tocScrollStyle" v-else class="flex-1 overflow-y-auto p-3">
        <p v-if="!slug" class="px-1 py-2 text-xs text-dimmed">{{ t("selectCourseFirst") }}</p>
        <template v-else>
          <LessonList :lessons="lessons" :current-id="currentLessonId" />
          <p v-if="!lessons.length" class="px-1 py-2 text-xs text-dimmed">{{ t("noLessons") }}</p>
        </template>
      </div>
    </aside>

    <!-- 阅读区：选中的课件 -->
    <main ref="mainScrollEl" :style="mainScrollStyle" class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl px-8 py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
