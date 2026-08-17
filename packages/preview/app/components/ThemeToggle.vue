<script setup lang="ts">
const colorMode = useColorMode();
const { t } = useI18n();

const options = [
  { value: "system", icon: "i-lucide-monitor" },
  { value: "light", icon: "i-lucide-sun" },
  { value: "dark", icon: "i-lucide-moon" },
] as const;

const preference = computed(() => colorMode.preference ?? "dark");
const currentIcon = computed(() => options.find((o) => o.value === preference.value)?.icon ?? "i-lucide-monitor");

const items = computed(() =>
  options.map((o) => ({
    label: t(`theme${o.value.charAt(0).toUpperCase()}${o.value.slice(1)}`),
    icon: o.icon,
    checked: preference.value === o.value,
    active: preference.value === o.value,
    color: preference.value === o.value ? "primary" : undefined,
    onSelect: () => {
      colorMode.preference = o.value;
    },
  })),
);
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      :icon="currentIcon"
      size="sm"
      color="neutral"
      variant="ghost"
      square
      :aria-label="t('theme')"
      :title="t('theme')"
    />
  </UDropdownMenu>
</template>
