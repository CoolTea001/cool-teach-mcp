<script setup lang="ts">
/**
 * 五类任务交互组件（决议 #16）：
 * choice/multi/truefalse 即时判分 + explain 反馈；short 展示参考答案与 rubric 自评；steps 逐项 check 勾选。
 * 答对 / 自评通过 / 步骤全勾 后标记任务完成（写回 progress.json 任务级）。
 */
interface Props {
  task: Record<string, any>;
  courseSlug: string;
  lessonId: string;
  initialCompleted?: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ (e: "completed", taskId: string, completed: boolean): void }>();

const completed = ref(props.initialCompleted ?? false);
const graded = ref(false);
const correct = ref(false);
const selected = ref<number | number[] | boolean | null>(null);
const shownAnswer = ref(false);
const checkedSteps = ref<Set<number>>(new Set());

const task = computed(() => props.task as {
  id: string;
  type: string;
  question: string;
  options?: string[];
  answer?: unknown;
  explain?: string;
  rubric?: string;
  steps?: { text: string; check: string }[];
});

function markComplete(): void {
  if (completed.value) return;
  completed.value = true;
  emit("completed", task.value.id, true);
}

function isSelected(i: number): boolean {
  return Array.isArray(selected.value) ? selected.value.includes(i) : selected.value === i;
}

function toggleOption(i: number): void {
  if (task.value.type === "multi") {
    const arr = Array.isArray(selected.value) ? [...(selected.value as number[])] : [];
    const idx = arr.indexOf(i);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(i);
    selected.value = arr;
  } else {
    selected.value = i;
  }
  graded.value = false;
}

function grade(): void {
  graded.value = true;
  const t = task.value;
  if (t.type === "choice") {
    correct.value = selected.value === t.answer;
  } else if (t.type === "truefalse") {
    correct.value = selected.value === t.answer;
  } else if (t.type === "multi") {
    const s = Array.isArray(selected.value) ? [...(selected.value as number[])].sort() : [];
    const a = [...(t.answer as number[])].sort();
    correct.value = s.length === a.length && s.every((v, i) => v === a[i]);
  }
  if (correct.value) markComplete();
}

function toggleStep(i: number): void {
  const s = new Set(checkedSteps.value);
  if (s.has(i)) s.delete(i);
  else s.add(i);
  checkedSteps.value = s;
  if (s.size === task.value.steps?.length) markComplete();
}
</script>

<template>
  <UCard class="border-default">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle">
            {{
              { choice: "单选", multi: "多选", truefalse: "判断", short: "简答", steps: "实操清单" }[task.type] ?? task.type
            }}
          </UBadge>
          <span class="text-sm font-medium text-default">{{ task.question }}</span>
        </div>
        <UBadge v-if="completed" color="success" variant="subtle" icon="i-lucide-check">已完成</UBadge>
      </div>
    </template>

    <!-- choice / multi -->
    <div v-if="task.type === 'choice' || task.type === 'multi'" class="space-y-2">
      <UButton
        v-for="(opt, i) in task.options ?? []"
        :key="i"
        block
        :variant="isSelected(i) ? 'solid' : 'subtle'"
        :color="graded && isSelected(i) ? (correct ? 'success' : 'error') : 'neutral'"
        @click="toggleOption(i)"
      >
        {{ opt }}
      </UButton>
      <UButton class="mt-2" color="primary" :disabled="selected === null || (task.type === 'multi' && Array.isArray(selected) && selected.length === 0)" @click="grade">
        检查答案
      </UButton>
    </div>

    <!-- truefalse -->
    <div v-else-if="task.type === 'truefalse'" class="flex gap-2">
      <UButton
        :variant="selected === true ? 'solid' : 'subtle'"
        :color="graded && selected === true ? (correct ? 'success' : 'error') : 'neutral'"
        @click="selected = true; graded = false"
      >
        正确
      </UButton>
      <UButton
        :variant="selected === false ? 'solid' : 'subtle'"
        :color="graded && selected === false ? (correct ? 'success' : 'error') : 'neutral'"
        @click="selected = false; graded = false"
      >
        错误
      </UButton>
      <UButton color="primary" :disabled="selected === null" @click="grade">检查答案</UButton>
    </div>

    <!-- short -->
    <div v-else-if="task.type === 'short'" class="space-y-3">
      <UTextarea v-model="shortText" placeholder="写下你的答案…" :rows="3" class="w-full" />
      <div class="flex flex-wrap gap-2">
        <UButton variant="subtle" @click="shownAnswer = !shownAnswer">
          {{ shownAnswer ? "收起参考答案" : "查看参考答案" }}
        </UButton>
        <UButton v-if="shownAnswer" color="success" @click="markComplete">我答对了</UButton>
      </div>
      <UAlert v-if="shownAnswer" color="info" title="参考答案" :description="task.answer" />
      <UAlert v-if="shownAnswer && task.rubric" color="warning" title="自评标准" :description="task.rubric" />
    </div>

    <!-- steps -->
    <div v-else-if="task.type === 'steps'" class="space-y-2">
      <UCheckbox
        v-for="(s, i) in task.steps ?? []"
        :key="i"
        :model-value="checkedSteps.has(i)"
        :label="`${s.text}（完成标准：${s.check}）`"
        @update:model-value="toggleStep(i)"
      />
    </div>

    <!-- 反馈（反馈闭环，决议 #16） -->
    <UAlert
      v-if="task.explain && (graded || (task.type === 'steps' && checkedSteps.size === (task.steps?.length ?? -1)))"
      :color="task.type === 'steps' || correct ? 'success' : 'error'"
      :title="task.type === 'steps' ? '全部完成' : correct ? '回答正确' : '回答错误'"
      :description="task.explain"
      class="mt-3"
    />
  </UCard>
</template>
