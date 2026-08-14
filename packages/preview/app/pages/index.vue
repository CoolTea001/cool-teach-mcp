<script setup lang="ts">
const { data } = await useFetch("/api/courses");
</script>

<template>
  <div class="space-y-6">
    <UEmpty
      v-if="data && !data.initialized"
      icon="i-lucide-graduation-cap"
      title="还没有课程"
      description="在对话中说 “Use Cool Teach MCP” 或“我想学习…”，智能体会帮你创建课程、生成第一课并直接打开本预览。"
    />

    <template v-else>
      <h1 class="text-2xl font-semibold text-highlighted">我的课程</h1>
      <div class="grid gap-4 sm:grid-cols-2">
        <UCard
          v-for="c in data?.courses ?? []"
          :key="c.slug"
          class="cursor-pointer transition hover:border-primary/50"
          @click="navigateTo(`/course/${c.slug}`)"
        >
          <template #header>
            <span class="font-semibold">{{ c.title }}</span>
          </template>
          <UProgress :value="c.lessonsTotal ? (c.lessonsCompleted / c.lessonsTotal) * 100 : 0" size="sm" />
          <p class="mt-2 text-sm text-muted">{{ c.lessonsCompleted }} / {{ c.lessonsTotal }} 课已完成</p>
        </UCard>
      </div>
    </template>
  </div>
</template>
