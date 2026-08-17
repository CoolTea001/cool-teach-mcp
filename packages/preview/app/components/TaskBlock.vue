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
const { t } = useI18n();

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

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    choice: t("taskChoice"),
    multi: t("taskMulti"),
    truefalse: t("taskTruefalse"),
    short: t("taskShort"),
    steps: t("taskSteps"),
  };
  return map[task.value.type] ?? task.value.type;
});

function markComplete(): void {
  if (completed.value) return;
  completed.value = true;
  emit("completed", task.value.id, true);
}

function isSelected(i: number | boolean): boolean {
  return Array.isArray(selected.value) ? selected.value.includes(i as number) : selected.value === i;
}

/** choice/multi 选项渲染（单选组/复选组共用） */
const options = computed(() => task.value.options ?? []);
const choiceItems = computed(() => options.value.map((label, i) => ({ label, value: i })));
const multiItems = computed(() => options.value.map((label, i) => ({ label, value: i })));
/** truefalse 二选一（value 为布尔） */
const truefalseItems = computed(() => [
  { label: t("correct"), value: true },
  { label: t("wrong"), value: false },
]);

/** 该值是否为正确答案 */
function isCorrectOpt(i: number | boolean): boolean {
  const a = task.value.answer;
  return Array.isArray(a) ? (a as number[]).includes(i as number) : a === i;
}

/** 判分后的选项文本样式：正确项绿、错选红、其余默认 */
function optTextClass(i: number | boolean): string {
  if (!graded.value) return "";
  if (isCorrectOpt(i)) return "text-success";
  if (isSelected(i)) return "text-error";
  return "";
}

function onRadioPick(v: unknown): void {
  selected.value = typeof v === "number" ? v : null;
  graded.value = false;
}

function onCheckPick(v: unknown): void {
  selected.value = Array.isArray(v) ? (v as number[]) : [];
  graded.value = false;
}

function onBoolPick(v: unknown): void {
  selected.value = typeof v === "boolean" ? v : null;
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
  <UCard variant="subtle" class="border-default">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UBadge color="primary" variant="subtle">
            {{ typeLabel }}
          </UBadge>
          <span class="text-sm font-medium text-default">{{ task.question }}</span>
        </div>
        <UBadge v-if="completed" color="success" variant="subtle" icon="i-lucide-check">{{ t("taskCompleted") }}</UBadge>
      </div>
    </template>

    <!-- choice：单选按钮组 -->
    <div v-if="task.type === 'choice'" class="space-y-2">
      <URadioGroup
        :model-value="typeof selected === 'number' ? selected : null"
        :items="choiceItems"
        size="lg"
        class="w-full"
        @update:model-value="onRadioPick"
      >
        <template #label="{ item }">
          <span class="flex items-center gap-2" :class="optTextClass(item.value as number)">
            <span>{{ item.label }}</span>
            <UIcon
              v-if="graded && isCorrectOpt(item.value as number)"
              name="i-lucide-circle-check"
              class="size-4 shrink-0 text-success"
            />
            <UIcon
              v-else-if="graded && isSelected(item.value as number)"
              name="i-lucide-circle-x"
              class="size-4 shrink-0 text-error"
            />
          </span>
        </template>
      </URadioGroup>
      <UButton class="mt-3" color="primary" :disabled="typeof selected !== 'number'" @click="grade">
        {{ t("checkAnswer") }}
      </UButton>
    </div>

    <!-- multi：复选框组 -->
    <div v-else-if="task.type === 'multi'" class="space-y-2">
      <UCheckboxGroup
        :model-value="Array.isArray(selected) ? selected : []"
        :items="multiItems"
        size="lg"
        class="w-full"
        @update:model-value="onCheckPick"
      >
        <template #label="{ item }">
          <span class="flex items-center gap-2" :class="optTextClass(item.value as number)">
            <span>{{ item.label }}</span>
            <UIcon
              v-if="graded && isCorrectOpt(item.value as number)"
              name="i-lucide-circle-check"
              class="size-4 shrink-0 text-success"
            />
            <UIcon
              v-else-if="graded && isSelected(item.value as number)"
              name="i-lucide-circle-x"
              class="size-4 shrink-0 text-error"
            />
          </span>
        </template>
      </UCheckboxGroup>
      <UButton class="mt-3" color="primary" :disabled="!Array.isArray(selected) || selected.length === 0" @click="grade">
        {{ t("checkAnswer") }}
      </UButton>
    </div>

    <!-- truefalse：单选按钮组（正确 / 错误） -->
    <div v-else-if="task.type === 'truefalse'" class="space-y-2">
      <URadioGroup
        :model-value="typeof selected === 'boolean' ? selected : null"
        :items="truefalseItems"
        size="lg"
        class="w-full"
        @update:model-value="onBoolPick"
      >
        <template #label="{ item }">
          <span class="flex items-center gap-2" :class="optTextClass(item.value as boolean)">
            <span>{{ item.label }}</span>
            <UIcon
              v-if="graded && isCorrectOpt(item.value as boolean)"
              name="i-lucide-circle-check"
              class="size-4 shrink-0 text-success"
            />
            <UIcon
              v-else-if="graded && isSelected(item.value as boolean)"
              name="i-lucide-circle-x"
              class="size-4 shrink-0 text-error"
            />
          </span>
        </template>
      </URadioGroup>
      <UButton class="mt-3" color="primary" :disabled="typeof selected !== 'boolean'" @click="grade">{{ t("checkAnswer") }}</UButton>
    </div>

    <!-- short -->
    <div v-else-if="task.type === 'short'" class="space-y-3">
      <UTextarea v-model="shortText" :placeholder="t('shortPlaceholder')" :rows="3" class="w-full" />
      <div class="flex flex-wrap gap-2">
        <UButton color="primary" @click="shownAnswer = !shownAnswer">
          {{ shownAnswer ? t("hideReferenceAnswer") : t("showReferenceAnswer") }}
        </UButton>
        <UButton v-if="shownAnswer" color="success" @click="markComplete">{{ t("iGotIt") }}</UButton>
      </div>
      <UAlert v-if="shownAnswer" variant="subtle" color="info" :title="t('referenceAnswer')" :description="task.answer" />
      <UAlert v-if="shownAnswer && task.rubric" variant="subtle" color="warning" :title="t('rubric')" :description="task.rubric" />
    </div>

    <!-- steps -->
    <div v-else-if="task.type === 'steps'" class="space-y-2">
      <UCheckbox
        v-for="(s, i) in task.steps ?? []"
        :key="i"
        :model-value="checkedSteps.has(i)"
        :label="t('stepLabel', s.text, s.check)"
        @update:model-value="toggleStep(i)"
      />
    </div>

    <!-- 反馈（反馈闭环，决议 #16） -->
    <UAlert
      v-if="task.explain && (graded || (task.type === 'steps' && checkedSteps.size === (task.steps?.length ?? -1)))"
      variant="subtle"
      :color="task.type === 'steps' || correct ? 'success' : 'error'"
      :title="task.type === 'steps' ? t('allDone') : correct ? t('answerCorrect') : t('answerWrong')"
      :description="task.explain"
      class="mt-3"
    />
  </UCard>
</template>
