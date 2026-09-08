<template>
  <article
    v-frame
    class="metric-card tech-frame"
    :style="{ '--accent': metric.color }"
    :aria-busy="metric.state === 'loading'"
  >
    <h2>{{ metric.name }}</h2>
    <Ring
      :value="metric.value"
      :unit="metric.unit"
      :color="metric.color"
      :progress="metric.progress"
    />
    <dl>
      <div>
        <dt>AVERAGE</dt>
        <dd>{{ formatValue(metric.stats?.average) }}</dd>
      </div>
      <div>
        <dt>P75</dt>
        <dd>{{ formatValue(metric.stats?.p75) }}</dd>
      </div>
      <div>
        <dt>SAMPLES</dt>
        <dd>{{ metric.stats?.count?.toLocaleString() ?? "—" }}</dd>
      </div>
    </dl>
    <div class="good" v-if="rating !== null">
      <i></i>{{ formatRating(rating) }}
    </div>
    <p
      v-if="metric.state !== null"
      class="metric-card__state"
      :class="`metric-card__state--${metric.state}`"
    >
      {{ stateMessage }}
    </p>
  </article>
</template>

<script setup lang="ts">
import type { MetricRating } from "@performance-platform/protocol";
import { rateWebVital } from "@performance-platform/protocol";
import { computed } from "vue";
import { formatBytes } from "./metric-value-format.js";
import Ring from "./Ring.vue";

interface MetricItem {
  name: string;
  stats: any;
  value: string;
  unit?: string;
  type: string;
  color: string;
  progress: number;
  state: "loading" | "error" | "empty" | null;
}

const props = defineProps<{
  metric: MetricItem;
}>();

const rating = computed(() => {
  const p75 = props.metric.stats?.p75;

  if (p75 === null || p75 === undefined) {
    return null;
  }

  switch (props.metric.type) {
    case "web.vital.lcp":
    case "web.vital.cls":
    case "web.vital.inp":
      return rateWebVital(props.metric.type, props.metric.stats?.p75);

    default:
      return null;
  }
});

const stateMessage = computed(() => {
  switch (props.metric.state) {
    case "loading":
      return "LOADING";
    case "error":
      return "LOAD FAILED";
    case "empty":
      return "NO DATA";
    default:
      return "";
  }
});

function formatRating(value: MetricRating): string {
  switch (value) {
    case "good":
      return "GOOD";
    case "needs-improvement":
      return "NEEDS IMPROVEMENT";
    case "poor":
      return "POOR";
  }
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  switch (props.metric.unit) {
    case "ms":
      return `${Math.round(value).toLocaleString()} ms`;
    case "score":
      return value.toFixed(3);
    case "byte":
      return formatBytes(value);
  }
  return "—";
}
</script>

<style scoped>
.metric-card {
  position: relative;
}

.metric-card__state {
  position: absolute;
  inset: auto 18px 12px;
  margin: 0;
  text-align: center;
  color: #8296bb;
  font-size: 13px;
  letter-spacing: 0.08em;
}

.metric-card__state--error {
  color: #ff7f91;
}
</style>
