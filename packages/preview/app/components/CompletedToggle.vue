<script setup lang="ts">
const props = defineProps<{ courseSlug: string; lessonId: string; completed: boolean }>();
const emit = defineEmits<{ (e: "changed", completed: boolean): void }>();

const value = ref(props.completed);

async function toggle(): Promise<void> {
  value.value = !value.value;
  await $fetch(`/api/courses/${props.courseSlug}/progress`, {
    method: "PUT",
    body: { lessonId: props.lessonId, completed: value.value },
  });
  emit("changed", value.value);
}
</script>

<template>
  <UButton
    :color="value ? 'success' : 'neutral'"
    :variant="value ? 'solid' : 'subtle'"
    :icon="value ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
    @click="toggle"
  >
    {{ value ? "已学完" : "标记已学完" }}
  </UButton>
</template>
