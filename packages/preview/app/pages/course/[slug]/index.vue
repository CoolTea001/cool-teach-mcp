<script setup lang="ts">
import MarkdownIt from "markdown-it";

const route = useRoute();
const slug = route.params.slug as string;

const { data: courseData } = await useFetch(`/api/courses/${slug}`, {
  watch: [() => route.params.slug],
});

const lessons = computed(() => courseData.value?.lessons ?? []);
const summary = computed(() => courseData.value?.summary ?? { lessonsTotal: 0, lessonsCompleted: 0 });

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
const mission = computed(() => courseData.value?.mission ?? "");
const missionHtml = computed(() => md.render(mission.value));
/** 识别骨架模板占位符（MISSION.md 尚未填写） */
const isMissionTemplate = computed(() => !mission.value.trim() || mission.value.includes("{课程标题}") || mission.value.includes("{1-3 句话"));

function continueLearning(): string | null {
  const next = lessons.value.find((l) => !l.completed) ?? lessons.value[0];
  return next ? `/course/${slug}/lesson/${next.id}` : null;
}
</script>

<template>
  <div v-if="courseData" class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold text-highlighted">{{ courseData.course.title }}</h1>
      <UProgress
        class="mt-3"
        :value="summary.lessonsTotal ? (summary.lessonsCompleted / summary.lessonsTotal) * 100 : 0"
      />
      <p class="mt-1 text-sm text-muted">{{ summary.lessonsCompleted }} / {{ summary.lessonsTotal }} 课已完成</p>
    </header>

    <UCard v-if="courseData.mission && !isMissionTemplate">
      <template #header>
        <span class="font-semibold">Mission</span>
      </template>
      <div class="md-body max-w-none" v-html="missionHtml" />
    </UCard>
    <UAlert
      v-else
      color="info"
      title="Mission 还没写"
      description="告诉智能体你的学习目标：为什么要学这门课？希望学习后达到什么成果？它会据此安排整门课程的内容。"
    />

    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-highlighted">课次（{{ lessons.length }}）</h2>
      <UButton v-if="continueLearning()" color="primary" :to="continueLearning()!">继续学习</UButton>
    </div>

    <div class="space-y-2">
      <NuxtLink
        v-for="l in lessons"
        :key="l.id"
        :to="`/course/${slug}/lesson/${l.id}`"
        class="flex items-center gap-2 rounded-md border border-default bg-elevated px-3 py-2 text-sm transition hover:border-primary/50"
      >
        <UIcon v-if="l.completed" name="i-lucide-check-circle-2" class="shrink-0 text-success" />
        <UIcon v-else name="i-lucide-circle" class="shrink-0 text-muted" />
        <span class="truncate">{{ l.title }}</span>
      </NuxtLink>
      <p v-if="!lessons.length" class="text-sm text-dimmed">
        还没有课次。在对话中让智能体用 cool_teach_create_lesson 创建第一课。
      </p>
    </div>
  </div>
</template>
