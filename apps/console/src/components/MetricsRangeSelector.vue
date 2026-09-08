<template>
  <div class="range-tabs" aria-label="Time range">
    <button
      v-for="item in buttons"
      :key="item"
      type="button"
      :class="{ active: props.range === item }"
      :aria-pressed="props.range === item"
      @click="emit('select', item)"
    >
      {{ item }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MetricsRange } from "../composables/metrics-range.js";

const props = defineProps<{
  range: "1h" | "24h" | "7d" | "30d";
}>();
const emit = defineEmits<{
  select: [range: MetricsRange];
}>();

const buttons: MetricsRange[] = ["1h", "24h", "7d", "30d"];
</script>
