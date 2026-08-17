<script setup lang="ts">
interface CourseSummary {
  slug: string;
  title: string;
  description?: string;
  status?: string;
  lessonsTotal?: number;
  lessonsCompleted?: number;
}

const props = defineProps<{ course: CourseSummary }>();
const { t } = useI18n();

const statusMeta: Record<string, { label: string; cls: string }> = {
  paused: { label: t("statusPaused"), cls: "bg-warning/10 text-warning" },
  archived: { label: t("statusArchived"), cls: "bg-accented text-muted" },
};

const status = computed(() => {
  if (!props.course.status || props.course.status === "active") return null;
  return statusMeta[props.course.status] ?? null;
});
const hasLessons = computed(() => (props.course.lessonsTotal ?? 0) > 0);
const percent = computed(() => {
  const total = props.course.lessonsTotal ?? 0;
  const done = props.course.lessonsCompleted ?? 0;
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
});
</script>

<template>
  <UCard
    class="group transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
    :ui="{ body: { padding: 'p-0' } }"
  >
    <NuxtLink
      :to="`/course/${course.slug}`"
      class="block rounded-lg p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-5"
    >
      <div class="flex items-start gap-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-base font-semibold text-primary"
          aria-hidden="true"
        >
          {{ course.title.charAt(0) }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h2 class="truncate font-semibold text-highlighted">{{ course.title }}</h2>
            <span v-if="status" class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="status.cls">
              {{ status.label }}
            </span>
          </div>
          <p v-if="course.description" class="mt-1 line-clamp-2 text-sm text-muted">{{ course.description }}</p>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <template v-if="hasLessons">
          <span class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-accented">
            <span
              class="block h-full rounded-full bg-primary transition-all duration-300"
              :style="{ width: `${percent}%` }"
            />
          </span>
          <span class="shrink-0 text-xs tabular-nums text-muted">{{ t("lessonProgress", course.lessonsCompleted ?? 0, course.lessonsTotal ?? 0) }}</span>
        </template>
        <p v-else class="text-xs text-dimmed">{{ t("noLessonsYet") }}</p>
        <span class="ml-auto shrink-0 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
          {{ t("viewCourse") }} →
        </span>
      </div>
    </NuxtLink>
  </UCard>
</template>
