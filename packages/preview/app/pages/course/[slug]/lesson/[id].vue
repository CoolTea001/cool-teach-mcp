<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;
const id = route.params.id as string;

const { data: lesson, refresh: refreshLesson } = await useFetch(`/api/courses/${slug}/lessons/${id}`, {
  watch: [() => route.params.slug, () => route.params.id],
});
const { data: courseData } = await useFetch(`/api/courses/${slug}`, {
  watch: [() => route.params.slug],
});

const taskProgress = reactive<Record<string, boolean>>({});
watch(
  lesson,
  (l) => {
    for (const [k, v] of Object.entries(l?.progress?.tasks ?? {})) {
      taskProgress[k] = v.completed ?? false;
    }
  },
  { immediate: true },
);

async function onTaskCompleted(taskId: string, completed: boolean): Promise<void> {
  taskProgress[taskId] = completed;
  await $fetch(`/api/courses/${slug}/progress`, {
    method: "PUT",
    body: { lessonId: id, taskId, taskCompleted: completed },
  });
  await refreshNuxtData(); // 同步侧栏进度
}

async function onLessonChanged(): Promise<void> {
  await refreshLesson();
  await refreshNuxtData(); // 同步侧栏进度
}

const lessons = computed(() => courseData.value?.lessons ?? []);
const idx = computed(() => lessons.value.findIndex((l) => l.id === id));
const prev = computed(() => (idx.value > 0 ? lessons.value[idx.value - 1] : null));
const next = computed(() =>
  idx.value >= 0 && idx.value < lessons.value.length - 1 ? lessons.value[idx.value + 1] : null,
);

const completed = computed(() => lesson.value?.progress?.completed ?? false);
</script>

<template>
  <article v-if="lesson" class="rounded-lg border border-default bg-elevated p-6">
    <header class="mb-4">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold text-highlighted">{{ lesson.meta.title }}</h1>
        <CompletedToggle
          :course-slug="slug"
          :lesson-id="id"
          :completed="completed"
          @changed="onLessonChanged"
        />
      </div>
      <p v-if="lesson.meta.summary" class="mt-1 text-sm text-muted">{{ lesson.meta.summary }}</p>
    </header>

    <MarkdownRenderer
      :content="lesson.content"
      :course-slug="slug"
      :lesson-id="id"
      :task-progress="lesson.progress?.tasks"
      @task-completed="onTaskCompleted"
    />

    <div class="mt-6 flex items-center justify-between border-t border-default pt-4">
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

    <p class="mt-4 text-xs text-dimmed">有疑问？随时向你的智能体老师提问。</p>
  </article>
</template>
