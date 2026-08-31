<template>
  <main class="dashboard-shell">
    <header class="dashboard-header">
      <h1>PAINT PERFORMANCE</h1>

      <div class="dashboard-status">
          <span class="dashboard-status__live">
              LIVE
          </span>

          <span>
              {{ selectedWindow }}
          </span>

          <span class="dashboard-status__samples">
              <small>TOTAL SAMPLES</small>

              <strong>
                  {{ totalSamples.toLocaleString() }}
              </strong>
          </span>
      </div>
  </header>

    <MetricsRangeSelector :range="selectedRange" @select="handleSelectedRange" />
    <div v-if="loading">正在加载性能数据</div>
    <div v-else-if="error">性能数据加载失败</div>
    <template v-else>
        <PerformanceScore
            :score="data?.score ?? null"
            :fp-average="data?.summary.fp.average ?? null"
            :fcp-average="data?.summary.fcp.average ?? null"
        />

        <template v-if="data">
          <section
              class="paint-metrics-summary"
          >
              <PaintMetricCard
                  metric="FP"
                  :stats="data.summary.fp"
              />

              <PaintMetricCard
                  metric="FCP"
                  :stats="data.summary.fcp"
              />
          </section>

          <section class="paint-trends">
              <PaintTrendChart
                  title="AVERAGE TREND"
                  statistic="average"
                  :points="data.series"
              />

              <PaintTrendChart
                  title="P75 TREND"
                  statistic="p75"
                  :points="data.series"
              />
          </section>
        </template>
    </template>
  </main>
</template>

<script setup lang="ts">
import {
    computed,
    onMounted,
    ref,
} from 'vue'
import { createPaintMetricsApi } from './api/metrics.js'

import { usePaintMetrics } from './composables/use-paint-metrics.js'
import PerformanceScore from './components/PerformanceScore.vue'
import MetricsRangeSelector from './components/MetricsRangeSelector.vue'
import type { MetricsRange } from './composables/use-paint-metrics.js'
import PaintMetricCard from './components/PaintMetricCard.vue'
import PaintTrendChart from './components/PaintTrendChart.vue'

const metricsApi = createPaintMetricsApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window)
})

const {
  data,
  loading,
  error,
  loadRange
} = usePaintMetrics({
  query: metricsApi.query
})
const selectedRange = ref<MetricsRange>('24h')
const selectedWindow = computed(
    () => `${selectedRange.value.toUpperCase()} WINDOW`,
)

const totalSamples = computed(
    () => {
        if (data.value === null) {
            return 0
        }

        return (
            data.value.summary.fp.count
            + data.value.summary.fcp.count
        )
    },
)

function handleSelectedRange(
  range: MetricsRange
): void {
  selectedRange.value = range
  void loadRange(range)
}

onMounted(() => {
  void loadRange(
    selectedRange.value
  )
})
</script>
