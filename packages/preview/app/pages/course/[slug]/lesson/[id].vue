<script setup lang="ts">
const route = useRoute();
const slug = computed(() => route.params.slug as string);
const id = computed(() => route.params.id as string);
const { t } = useI18n();

const { data: lesson, refresh: refreshLesson } = await useFetch(
  () => `/api/courses/${slug.value}/lessons/${id.value}`,
  { watch: [() => route.params.slug, () => route.params.id] },
);
const { data: courseData } = await useFetch(
  () => `/api/courses/${slug.value}`,
  { watch: [() => route.params.slug] },
);

const taskProgress = reactive<Record<string, boolean>>({});
watch(
  lesson,
  (l) => {
    taskProgress.kind = "reset" as never; // noop to keep reactive reset logic below clean
    for (const k of Object.keys(taskProgress)) {
      if (k !== "kind") delete taskProgress[k];
    }
    for (const [k, v] of Object.entries(l?.progress?.tasks ?? {})) {
      taskProgress[k] = v.completed ?? false;
    }
  },
  { immediate: true },
);

async function onTaskCompleted(taskId: string, completed: boolean): Promise<void> {
  taskProgress[taskId] = completed;
  await $fetch(`/api/courses/${slug.value}/progress`, {
    method: "PUT",
    body: { lessonId: id.value, taskId, taskCompleted: completed },
  });
  await refreshNuxtData(); // 同步侧栏进度
}

async function onLessonChanged(): Promise<void> {
  await refreshLesson();
  await refreshNuxtData(); // 同步侧栏进度
}

const lessons = computed(() => courseData.value?.lessons ?? []);
const idx = computed(() => lessons.value.findIndex((l) => l.id === id.value));
const prev = computed(() => (idx.value > 0 ? lessons.value[idx.value - 1] : null));
const next = computed(() =>
  idx.value >= 0 && idx.value < lessons.value.length - 1 ? lessons.value[idx.value + 1] : null,
);

const completed = computed(() => lesson.value?.progress?.completed ?? false);
</script>

<template>
  <article v-if="lesson">
    <header class="mb-6">
      <h1 class="text-3xl font-bold text-highlighted">{{ lesson.meta.title }}</h1>
      <p v-if="lesson.meta.summary" class="mt-1 text-sm text-muted">{{ lesson.meta.summary }}</p>
    </header>

    <MarkdownRenderer
      :content="lesson.content"
      :course-slug="slug"
      :lesson-id="id"
      :task-progress="lesson.progress?.tasks"
      @task-completed="onTaskCompleted"
    />

    <div class="mt-8 border-t border-default pt-6">
      <div class="flex items-center justify-between gap-3">
        <CompletedToggle
          :course-slug="slug"
          :lesson-id="id"
          :completed="completed"
          @changed="onLessonChanged"
        />
        <p class="text-xs text-dimmed">{{ t("askTeacher") }}</p>
      </div>

      <div class="mt-6 flex items-center justify-between">
        <UButton
          v-if="prev"
          icon="i-lucide-chevron-left"
          variant="ghost"
          size="sm"
          :to="`/course/${slug}/lesson/${prev.id}`"
        >
          {{ prev.title }}
        </UButton>
        <span v-else />
        <UButton
          v-if="next"
          icon="i-lucide-chevron-right"
          variant="ghost"
          size="sm"
          trailing
          :to="`/course/${slug}/lesson/${next.id}`"
        >
          {{ next.title }}
        </UButton>
      </div>
    </div>
  </article>
</template>
