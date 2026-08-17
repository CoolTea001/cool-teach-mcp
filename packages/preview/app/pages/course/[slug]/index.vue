<script setup lang="ts">
import MarkdownIt from "markdown-it";

const route = useRoute();
const slug = route.params.slug as string;
const { t } = useI18n();

const { data: courseData } = await useFetch(`/api/courses/${slug}`, {
  watch: [() => route.params.slug],
});

const lessons = computed(() => courseData.value?.lessons ?? []);

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
      <h1 class="text-3xl font-bold text-highlighted">{{ courseData.course.title }}</h1>
    </header>

    <UCard v-if="courseData.mission && !isMissionTemplate">
      <template #header>
        <span class="font-semibold">{{ t("mission") }}</span>
      </template>
      <div class="md-body max-w-none" v-html="missionHtml" />
    </UCard>
    <UAlert
      v-else
      color="info"
      :title="t('missionNotSet')"
      :description="t('missionNotSetDesc')"
    />

    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-highlighted">{{ t("lessonList", lessons.length) }}</h2>
      <UButton v-if="continueLearning()" color="primary" :to="continueLearning()!">{{ t("continueLearning") }}</UButton>
    </div>

    <div class="space-y-2">
      <NuxtLink
        v-for="l in lessons"
        :key="l.id"
        :to="`/course/${slug}/lesson/${l.id}`"
        class="flex flex-col gap-1.5 rounded-lg border border-default bg-elevated px-4 py-3 text-left transition hover:border-primary/40"
      >
        <span class="line-clamp-2 text-sm font-medium text-default">{{ l.title }}</span>
        <span class="text-xs tabular-nums" :class="l.completed ? 'text-success' : 'text-muted'">
          {{ l.completed ? t("completed") : t("incomplete") }}
        </span>
      </NuxtLink>
      <p v-if="!lessons.length" class="text-sm text-dimmed">
        {{ t("noLessonsInCourse") }}
      </p>
    </div>
  </div>
</template>
