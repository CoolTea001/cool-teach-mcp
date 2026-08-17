<script setup lang="ts">
interface Props {
  lessons: { id: string; title: string; completed: boolean }[];
  currentId?: string;
}
defineProps<Props>();

const route = useRoute();
const slug = computed(() => route.params.slug as string);
const { t } = useI18n();
</script>

<template>
  <nav class="space-y-2">
    <NuxtLink
      v-for="l in lessons"
      :key="l.id"
      :to="`/course/${slug}/lesson/${l.id}`"
      class="flex w-full flex-col gap-2 rounded-lg border border-default bg-elevated p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      :class="l.id === currentId ? 'border-primary/40 ring-1 ring-inset ring-primary/20' : 'hover:border-primary/40'"
    >
      <span
        class="line-clamp-2 text-sm font-medium"
        :class="l.id === currentId ? 'text-primary' : 'text-default'"
        :title="l.title"
      >
        {{ l.title }}
      </span>
      <span class="shrink-0 text-xs tabular-nums" :class="l.completed ? 'text-success' : 'text-muted'">
        {{ l.completed ? t("completed") : t("incomplete") }}
      </span>
    </NuxtLink>
  </nav>
</template>
