<template>
  <div class="trend-chart">
    <p v-if="loading && !hasValues" class="trend-chart__empty">趋势数据加载中</p>
    <p v-else-if="error && !hasValues" class="trend-chart__empty trend-chart__error">
      趋势数据加载失败
    </p>
    <p v-else-if="!hasValues" class="trend-chart__empty">暂无趋势数据</p>

    <VChart
      v-else
      data-testid="trend-chart"
      class="trend-chart__canvas"
      :option="option"
      :aria-label="ariaLabel"
      role="img"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed } from "vue";
import VChart from "vue-echarts";

import { buildTrendChartOption } from "./trend-chart-option.js";
import type { TrendSeries } from "./trend-series.js";

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
]);

const props = withDefaults(
  defineProps<{
    series: TrendSeries[];
    ariaLabel?: string;
    loading?: boolean;
    error?: boolean;
  }>(),
  {
    ariaLabel: "Performance trend",
    loading: false,
    error: false,
  },
);

const hasValues = computed(() =>
  props.series.some((item) =>
    item.points.some((point) => point.value !== null),
  ),
);

const option = computed(() => buildTrendChartOption(props.series));
</script>

<style scoped>
.trend-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.trend-chart__canvas {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.trend-chart__empty {
  display: grid;
  height: 100%;
  min-height: 180px;
  margin: 0;
  place-items: center;
  color: #8296bb;
}

.trend-chart__error {
  color: #ff7f91;
}
</style>
