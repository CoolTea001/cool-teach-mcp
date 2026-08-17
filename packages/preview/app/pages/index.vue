<script setup lang="ts">
const { data } = await useFetch("/api/courses");
const { t } = useI18n();

const initialized = data.value?.initialized ?? false;
const courses = data.value?.courses ?? [];

// 初始进入：右侧不展示课程列表，默认选中第一个课程并展示课程信息
if (initialized && courses.length) {
  await navigateTo(`/course/${courses[0].slug}`, { replace: true });
}
</script>

<template>
  <div class="space-y-6">
    <UEmpty
      v-if="!initialized"
      icon="i-lucide-graduation-cap"
      :title="t('noCourses')"
      :description="t('noCoursesCta')"
    />
    <UEmpty
      v-else-if="!courses.length"
      icon="i-lucide-graduation-cap"
      :title="t('noCourses')"
      :description="t('noCoursesDefault')"
    />
  </div>
</template>
