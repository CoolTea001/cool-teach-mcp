<script setup lang="ts">
import MarkdownIt from "markdown-it";

const props = defineProps<{
  content: string;
  courseSlug: string;
  lessonId: string;
  taskProgress?: Record<string, { completed?: boolean }>;
}>();
const emit = defineEmits<{ (e: "task-completed", taskId: string, completed: boolean): void }>();
const { t } = useI18n();

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

interface Segment {
  type: "md" | "task" | "error";
  value: string;
  task?: Record<string, unknown>;
  error?: string;
}

function splitSegments(content: string): Segment[] {
  const re = /```task\s*\r?\n([\s\S]*?)\r?\n```/g;
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) segments.push({ type: "md", value: content.slice(last, m.index) });
    if (m[1] !== undefined) {
      const raw = m[1].trim();
      try {
        segments.push({ type: "task", value: raw, task: JSON.parse(raw) as Record<string, unknown> });
      } catch (e) {
        segments.push({ type: "error", value: raw, error: (e as Error).message });
      }
    }
    last = m.index + m[0].length;
  }
  if (last < content.length) segments.push({ type: "md", value: content.slice(last) });
  return segments;
}

const segments = computed(() => splitSegments(props.content));
const renderMd = (src: string): string => md.render(src);
</script>

<template>
  <div class="space-y-6">
    <template v-for="(seg, i) in segments" :key="i">
      <div
        v-if="seg.type === 'md'"
        class="md-body max-w-none"
        v-html="renderMd(seg.value)"
      />
      <TaskBlock
        v-else-if="seg.type === 'task' && seg.task"
        :task="seg.task"
        :course-slug="courseSlug"
        :lesson-id="lessonId"
        :initial-completed="taskProgress?.[String(seg.task.id)]?.completed ?? false"
        @completed="(taskId: string, completed: boolean) => emit('task-completed', taskId, completed)"
      />
      <UAlert v-else color="error" :title="t('taskParseError')" :description="seg.error ?? t('unknownError')" />
    </template>
  </div>
</template>
