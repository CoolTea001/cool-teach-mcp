<script setup lang="ts">
interface Props {
  lessons: { id: string; title: string; completed: boolean }[];
  currentId?: string;
}
defineProps<Props>();

const route = useRoute();
const slug = route.params.slug as string;
</script>

<template>
  <nav class="space-y-1">
    <NuxtLink
      v-for="l in lessons"
      :key="l.id"
      :to="`/course/${slug}/lesson/${l.id}`"
      class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accented"
      :class="l.id === currentId ? 'bg-primary/10 font-medium text-primary' : 'text-default'"
    >
      <span
        class="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]"
        :class="l.completed ? 'bg-success text-inverted' : 'border border-muted text-muted'"
      >
        <UIcon v-if="l.completed" name="i-lucide-check" />
      </span>
      <span class="truncate">{{ l.title }}</span>
    </NuxtLink>
  </nav>
</template>
