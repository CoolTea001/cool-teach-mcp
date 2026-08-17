<script setup lang="ts">
const { locale, setLocale, t } = useI18n();

const items = computed(() => [
  {
    label: t("english"),
    checked: locale.value === "en",
    active: locale.value === "en",
    color: locale.value === "en" ? "primary" : undefined,
    onSelect: () => setLocale("en"),
  },
  {
    label: t("chinese"),
    checked: locale.value === "zh",
    active: locale.value === "zh",
    color: locale.value === "zh" ? "primary" : undefined,
    onSelect: () => setLocale("zh"),
  },
]);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      icon="i-lucide-languages"
      size="sm"
      color="neutral"
      variant="ghost"
      square
      :aria-label="t('language')"
      :title="t('language')"
    />
  </UDropdownMenu>
</template>
