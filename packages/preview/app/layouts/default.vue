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
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-default text-default">
    <!-- 侧边栏：课程列表 + 当前课程的课次列表（决议 #17，自由切换） -->
    <aside class="flex w-72 shrink-0 flex-col border-r border-default bg-muted/30">
      <div class="flex items-center justify-between border-b border-default px-4 py-3">
        <NuxtLink to="/" class="font-semibold text-highlighted">Cool Teach</NuxtLink>
        <UButton icon="i-lucide-layout-grid" variant="ghost" size="xs" to="/" title="全部课程" />
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <p class="px-1 pb-1 text-xs font-medium text-muted">课程</p>
        <nav class="space-y-1">
          <NuxtLink
            v-for="c in courses"
            :key="c.slug"
            :to="`/course/${c.slug}`"
            class="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accented"
            :class="c.slug === slug ? 'bg-primary/10 font-medium text-primary' : 'text-default'"
          >
            <span class="truncate">{{ c.title }}</span>
            <span class="text-xs text-muted">{{ c.lessonsCompleted }}/{{ c.lessonsTotal }}</span>
          </NuxtLink>
          <p v-if="!courses.length" class="px-1 py-2 text-xs text-dimmed">还没有课程</p>
        </nav>

        <template v-if="slug">
          <p class="px-1 pb-1 pt-4 text-xs font-medium text-muted">课次</p>
          <LessonList :lessons="lessons" :current-id="currentLessonId" />
          <p v-if="!lessons.length" class="px-1 py-2 text-xs text-dimmed">还没有课次，让智能体先创建一课</p>
        </template>
      </div>
    </aside>

    <!-- 阅读区：选中的课件 -->
    <main class="flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl px-8 py-8">
        <slot />
      </div>
    </main>
  </div>
</template>
