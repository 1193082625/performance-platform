<template>
  <main class="dashboard-shell">
    <header class="dashboard-header">
      <h1>WEB PERFORMANCE</h1>

      <div class="dashboard-status">
          <h3 class="dashboard-status__live">
              LIVE
          </h3>

          <h3>
              {{ selectedWindow }}
          </h3>

          <span class="dashboard-status__samples">
              <small>TOTAL SAMPLES</small>

              <strong>
                  {{ totalSamples.toLocaleString() }}
              </strong>
          </span>
      </div>
  </header>

    <MetricsRangeSelector :range="selectedRange" @select="handleSelectedRange" />

    <section class="vital-metric-slot" aria-live="polite">
        <div class="vital-metric-panel">
            <p
                v-if="lcpLoading"
                class="vital-metric-slot__state"
            >
                正在加载 LCP
            </p>

            <p
                v-else-if="lcpError"
                class="vital-metric-slot__state vital-metric-slot__state--error"
            >
                LCP 数据加载失败
            </p>

            <MetricSummaryCard
                v-else-if="lcpData?.metric?.type === 'web.vital.lcp'"
                label="LCP"
                type="web.vital.lcp"
                :stats="lcpData.summary"
                :unit="lcpData.metric.unit"
                :metric-version="lcpData.metric.metricVersion"
            />
        </div>

        <div class="vital-metric-panel">
            <p
                v-if="clsLoading"
                class="vital-metric-slot__state"
            >
                正在加载 CLS
            </p>

            <p
                v-else-if="clsError"
                class="vital-metric-slot__state vital-metric-slot__state--error"
            >
                CLS 数据加载失败
            </p>

            <MetricSummaryCard
                v-else-if="clsData?.metric?.type === 'web.vital.cls'"
                label="CLS"
                type="web.vital.cls"
                :stats="clsData.summary"
                :unit="clsData.metric.unit"
                :metric-version="clsData.metric.metricVersion"
            />
        </div>

        <div class="vital-metric-panel">
            <p
                v-if="inpLoading"
                class="vital-metric-slot__state"
            >
                正在加载 INP
            </p>

            <p
                v-else-if="inpError"
                class="vital-metric-slot__state vital-metric-slot__state--error"
            >
                INP 数据加载失败
            </p>

            <MetricSummaryCard
                v-else-if="inpData?.metric?.type === 'web.vital.inp'"
                label="INP"
                type="web.vital.inp"
                :stats="inpData.summary"
                :unit="inpData.metric.unit"
                :metric-version="inpData.metric.metricVersion"
            />
        </div>
    </section>

    <div v-if="loading" class="dashboard-state">正在加载性能数据</div>
    <div v-else-if="error" class="dashboard-state">性能数据加载失败</div>
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

              <div class="trend-explorer">
                  <nav
                      class="trend-switcher"
                      aria-label="P75 趋势指标"
                  >
                      <button
                          v-for="item in trendSelections"
                          :key="item.value"
                          type="button"
                          :aria-pressed="selectedTrend === item.value"
                          @click="selectedTrend = item.value"
                      >
                          {{ item.label }}
                      </button>
                  </nav>

                  <PaintTrendChart
                      v-if="selectedTrend === 'paint'"
                      title="P75 TREND"
                      statistic="p75"
                      :points="data.series"
                  />

                  <MetricTrendChart
                      v-else-if="selectedTrend === 'lcp' && lcpData?.metric.type === 'web.vital.lcp'"
                      title="LCP P75 TREND"
                      label="LCP"
                      unit="ms"
                      color="#56e4ff"
                      :points="lcpData.series"
                  />

                  <MetricTrendChart
                      v-else-if="selectedTrend === 'cls' && clsData?.metric.type === 'web.vital.cls'"
                      title="CLS P75 TREND"
                      label="CLS"
                      unit="score"
                      color="#a18bff"
                      :points="clsData.series"
                  />

                  <MetricTrendChart
                      v-else-if="selectedTrend === 'inp' && inpData?.metric.type === 'web.vital.inp'"
                      title="INP P75 TREND"
                      label="INP"
                      unit="ms"
                      color="#ffc857"
                      :points="inpData.series"
                  />

                  <p
                      v-else
                      class="trend-explorer__state"
                  >
                      对应指标数据不可用
                  </p>
              </div>
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
import { createMetricQueryApi } from './api/metric-query.js'

import { usePaintMetrics } from './composables/use-paint-metrics.js'
import { useMetricQuery } from './composables/use-metric-query.js'
import PerformanceScore from './components/PerformanceScore.vue'
import MetricsRangeSelector from './components/MetricsRangeSelector.vue'
import type { MetricsRange } from './composables/metrics-range.js'
import PaintMetricCard from './components/PaintMetricCard.vue'
import PaintTrendChart from './components/PaintTrendChart.vue'
import MetricSummaryCard from './components/MetricSummaryCard.vue'
import MetricTrendChart from './components/MetricTrendChart.vue'

type TrendSelection =
    | 'paint'
    | 'lcp'
    | 'cls'
    | 'inp'

const trendSelections: ReadonlyArray<{
    value: TrendSelection
    label: string
}> = [
    { value: 'paint', label: 'PAINT' },
    { value: 'lcp', label: 'LCP' },
    { value: 'cls', label: 'CLS' },
    { value: 'inp', label: 'INP' },
]

const metricsApi = createPaintMetricsApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window)
})

const metricQueryApi = createMetricQueryApi({
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

const {
  data: lcpData,
  loading: lcpLoading,
  error: lcpError,
  loadRange: loadLcpRange,
} = useMetricQuery({
  type: 'web.vital.lcp',
  query: metricQueryApi.query,
})

const {
  data: clsData,
  loading: clsLoading,
  error: clsError,
  loadRange: loadClsRange,
} = useMetricQuery({
  type: 'web.vital.cls',
  query: metricQueryApi.query,
})

const {
  data: inpData,
  loading: inpLoading,
  error: inpError,
  loadRange: loadInpRange,
} = useMetricQuery({
  type: 'web.vital.inp',
  query: metricQueryApi.query,
})
const selectedRange = ref<MetricsRange>('24h')
const selectedTrend = ref<TrendSelection>('paint')
const selectedWindow = computed(
    () => `${selectedRange.value.toUpperCase()} WINDOW`,
)

const totalSamples = computed(
    () => {
        if (data.value === null) {
            return 0
        }

        const lcpSamples =
            lcpData.value?.metric?.type === 'web.vital.lcp'
                ? lcpData.value.summary.count
                : 0
        const clsSamples =
            clsData.value?.metric?.type === 'web.vital.cls'
                ? clsData.value.summary.count
                : 0
        const inpSamples =
            inpData.value?.metric?.type === 'web.vital.inp'
                ? inpData.value.summary.count
                : 0

        return (
            data.value.summary.fp.count
            + data.value.summary.fcp.count
            + lcpSamples
            + clsSamples
            + inpSamples
        )
    },
)

function handleSelectedRange(
  range: MetricsRange
): void {
  selectedRange.value = range
  void loadRange(range)
  void loadLcpRange(range)
  void loadClsRange(range)
  void loadInpRange(range)
}

onMounted(() => {
  void loadRange(
    selectedRange.value
  )

  void loadLcpRange(
    selectedRange.value
  )

  void loadClsRange(
    selectedRange.value
  )

  void loadInpRange(
    selectedRange.value
  )
})
</script>
