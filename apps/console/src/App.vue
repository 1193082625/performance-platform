<template>
  <main class="dashboard">
    <Header
      :total-samples="totalSamples"
      :selected-app="selectedApp"
      :user-name="userName"
      :alert-count="alertCount"
      :range="selectedRange"
      @go-apps="$emit('go-apps')"
      @sign-out="$emit('sign-out')"
      @manage-keys="$emit('manage-keys')"
      @open-guide="$emit('open-guide')"
      @open-alerts="alertDrawerOpen = true"
      @select-range="handleSelectedRange"
    />

    <p v-if="loading && data === null" class="dashboard-state" role="status">
      {{ t('app.loading') }}
    </p>
    <p
      v-else-if="error !== null && data === null"
      class="dashboard-state"
      role="alert"
    >
      {{ t('app.error') }}
    </p>

    <div v-frame class="main-shell tech-frame">
      <section v-frame class="performance tech-frame">
        <div class="metrics">
          <MetricSummaryCard
            v-for="metric in metrics"
            :key="metric.name"
            :metric="metric"
            :recommendation="recommendationFor(metric.name)"
          />
        </div>
        <div class="charts">
          <article v-frame class="chart-panel tech-frame">
            <div class="chart-heading">
              <h2>{{ t('app.averageTrend') }}</h2>
              <select
                v-model="averageMode"
                :aria-label="t('app.averageMetric')"
              >
                <option
                  v-for="mode in ['PAINT', 'LCP', 'CLS', 'INP', 'MEMORY']"
                  :key="mode"
                >
                  {{ mode }}
                </option>
              </select>
            </div>
            <TrendChart
              :series="averageTrendSeries"
              :range="selectedRange"
              :loading="trendState(averageMode).loading"
              :error="trendState(averageMode).error"
              :aria-label="t('app.averageTrendLabel', { metric: averageMode })"
            />
          </article>
          <article v-frame class="chart-panel tech-frame">
            <div class="chart-heading p75-heading">
              <h2>{{ t('app.p75Trend') }}</h2>
              <div class="metric-tabs" :aria-label="t('app.p75Metric')">
                <button
                  v-for="mode in ['PAINT', 'LCP', 'CLS', 'INP', 'MEMORY']"
                  :key="mode"
                  :class="{
                    selected: p75Mode === mode,
                    memory: mode === 'MEMORY',
                  }"
                  :aria-pressed="p75Mode === mode"
                  @click="p75Mode = mode"
                >
                  {{ mode }}
                </button>
              </div>
            </div>
            <TrendChart
              :series="p75TrendSeries"
              :range="selectedRange"
              :loading="trendState(p75Mode).loading"
              :error="trendState(p75Mode).error"
              :aria-label="t('app.p75TrendLabel', { metric: p75Mode })"
            />
          </article>
        </div>
      </section>
      <aside v-frame class="memory-panel tech-frame">
        <article
          v-frame
          class="health-card tech-frame"
          :data-status="memoryHealthView.status"
        >
          <h2>{{ t('app.memoryHealth') }}</h2>
          <RecommendationPopover
            v-if="recommendationFor('MEMORY')"
            :recommendation="recommendationFor('MEMORY')!"
          />
          <div class="health-body">
            <Ring
              health
              color="#78e76b"
              :progress="memoryHealthView.progress"
            />
            <div class="health-stats">
              <strong>{{ t(`status.${memoryHealthView.status}`) }}</strong
              ><span>{{ t('app.utilization') }}</span
              ><b>{{ memoryHealthView.utilization }}</b
              ><span>{{ t('app.sampleSufficiency') }}</span
              ><em
                >{{ t(`status.${memoryHealthView.sufficiency}`) }} ({{
                  memoryHealthView.sampleCount
                }})</em
              >
            </div>
          </div>
          <div class="reason">
            <span>{{ t('app.reason') }}</span>
            <p>{{ memoryHealthView.reason }}</p>
          </div>
        </article>
        <article
          v-for="heap in heaps"
          :key="heap.kind"
          v-frame
          class="heap-card tech-frame"
          :class="heap.kind"
          :style="{ '--accent': heap.color }"
        >
          <Icon name="chip" />
          <div class="heap-content">
            <div class="heap-heading">
              <h2>{{ heap.title }}</h2>
              <strong>{{ heap.value }}</strong>
            </div>
            <p :class="{ 'heap-card__error': heap.state === 'error' }">
              {{ heap.caption }}
            </p>
            <div class="segmented-bar">
              <span
                v-for="i in 14"
                :key="i"
                :class="{ filled: i <= heap.bars }"
              ></span>
            </div>
          </div>
        </article>
      </aside>
      <footer>
        <Icon name="info" /><span>{{
          t(selectedRange === '1h' ? 'app.footerOneHour' : 'app.footer')
        }}</span>
      </footer>
    </div>
    <AlertDrawer
      :open="alertDrawerOpen"
      :loading="alertEvaluationLoading"
      :error="alertEvaluationError"
      :evaluation="alertEvaluation"
      @close="alertDrawerOpen = false"
    />
  </main>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import { createPaintMetricsApi } from './api/metrics.js'
import { createDashboardMetricQueryApi } from './api/dashboard-metric-query.js'
import { createDashboardMemoryHealthApi } from './api/dashboard-memory-health.js'
import type { DashboardApp, DashboardScope } from './api/dashboard-scope.js'
import { createLcpDiagnosticApi } from './api/lcp-diagnostic.js'
import { createClsDiagnosticApi } from './api/cls-diagnostic.js'
import { createInpDiagnosticApi } from './api/inp-diagnostic.js'
import { createAlertEvaluationApi } from './api/alert-evaluation.js'
import { usePaintMetrics } from './composables/use-paint-metrics.js'

import { useMetricQuery } from './composables/use-metric-query.js'
import {
  resolveMetricsRange,
  type MetricsRange,
} from './composables/metrics-range.js'
import MetricSummaryCard from './components/MetricSummaryCard.vue'

import type {
  LcpDiagnosticAnalysisResponse,
  ClsDiagnosticAnalysisResponse,
  InpDiagnosticAnalysisResponse,
  MemoryHealthAssessment,
  AlertEvaluationResponse,
} from '@performance-platform/protocol'
import {
  PAINT_METRIC_THRESHOLDS,
  WEB_VITAL_THRESHOLDS,
} from '@performance-platform/protocol'
import { useI18n } from 'vue-i18n'
import { formatBytes } from './components/metric-value-format.js'
import { createPerformanceRecommendations } from './components/performance-recommendations.js'

import Icon from './components/Icon.vue'
import Ring from './components/Ring.vue'
import RecommendationPopover from './components/RecommendationPopover.vue'
import AlertDrawer from './components/AlertDrawer.vue'

import {
  createMetricTrendSeries,
  createPaintTrendSeries,
} from './components/trend-series.js'

import type { TrendSeries, TrendStatistic } from './components/trend-series.js'
import Header from './components/Header.vue'

const TrendChart = defineAsyncComponent(
  () => import('./components/TrendChart.vue'),
)
const { t, locale } = useI18n()
document.documentElement.lang = locale.value

type TrendMode = 'PAINT' | 'LCP' | 'CLS' | 'INP' | 'MEMORY'
type DataState = 'loading' | 'error' | 'empty' | null

function calculateRingProgress(
  value: number | null | undefined,
  poorThreshold: number,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0
  }

  const percentage = Math.min(100, Math.max(0, (value / poorThreshold) * 100))

  return Math.round(percentage * 10) / 10
}

const metricsApi = createPaintMetricsApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})

const dashboardMetricQueryApi = createDashboardMetricQueryApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const dashboardMemoryHealthApi = createDashboardMemoryHealthApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const props = defineProps<{
  selectedApp?: DashboardApp
  scope: DashboardScope
  userName?: string
}>()
const dashboardScope = computed(() => props.scope)
const selectedApp = computed<DashboardApp>(
  () =>
    props.selectedApp ?? {
      id: '',
      projectId: props.scope.projectId,
      appId: props.scope.appId,
      name: '',
      platform: 'web',
    },
)
const userName = computed(() => props.userName ?? '')

const emit = defineEmits(['go-apps', 'sign-out', 'manage-keys', 'open-guide'])

async function queryDashboardMetric(
  params: Parameters<typeof dashboardMetricQueryApi.query>[1],
) {
  if (dashboardScope.value === null)
    throw new Error('No dashboard application selected')
  return dashboardMetricQueryApi.query(dashboardScope.value, params)
}
const lcpDiagnosticApi = createLcpDiagnosticApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const lcpDiagnostic = ref<LcpDiagnosticAnalysisResponse | null>(null)
let latestLcpDiagnosticRequestId = 0

async function loadLcpDiagnosticRange(
  range: MetricsRange = '24h',
): Promise<void> {
  const requestId = ++latestLcpDiagnosticRequestId
  const { from, to } = resolveMetricsRange(range, Date.now())

  try {
    const response = await lcpDiagnosticApi.query(dashboardScope.value, { from, to })
    if (requestId === latestLcpDiagnosticRequestId) {
      lcpDiagnostic.value = response
    }
  } catch {
    if (requestId === latestLcpDiagnosticRequestId) {
      lcpDiagnostic.value = null
    }
  }
}
const clsDiagnosticApi = createClsDiagnosticApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const clsDiagnostic = ref<ClsDiagnosticAnalysisResponse | null>(null)
let latestClsDiagnosticRequestId = 0

async function loadClsDiagnosticRange(
  range: MetricsRange = '24h',
): Promise<void> {
  const requestId = ++latestClsDiagnosticRequestId
  const { from, to } = resolveMetricsRange(range, Date.now())

  try {
    const response = await clsDiagnosticApi.query(dashboardScope.value, { from, to })
    if (requestId === latestClsDiagnosticRequestId) {
      clsDiagnostic.value = response
    }
  } catch {
    if (requestId === latestClsDiagnosticRequestId) {
      clsDiagnostic.value = null
    }
  }
}
const inpDiagnosticApi = createInpDiagnosticApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const inpDiagnostic = ref<InpDiagnosticAnalysisResponse | null>(null)
let latestInpDiagnosticRequestId = 0

async function loadInpDiagnosticRange(
  range: MetricsRange = '24h',
): Promise<void> {
  const requestId = ++latestInpDiagnosticRequestId
  const { from, to } = resolveMetricsRange(range, Date.now())
  try {
    const response = await inpDiagnosticApi.query(dashboardScope.value, { from, to })
    if (requestId === latestInpDiagnosticRequestId) {
      inpDiagnostic.value = response
    }
  } catch {
    if (requestId === latestInpDiagnosticRequestId) {
      inpDiagnostic.value = null
    }
  }
}
const alertEvaluationApi = createAlertEvaluationApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const alertEvaluation = ref<AlertEvaluationResponse | null>(null)
const alertEvaluationLoading = ref(false)
const alertEvaluationError = ref<string | null>(null)
const alertDrawerOpen = ref(false)
let latestAlertEvaluationRequestId = 0
const alertCount = computed(() => alertEvaluation.value?.events?.length ?? 0)

async function loadAlertEvaluationRange(
  range: MetricsRange = '24h',
): Promise<void> {
  const requestId = ++latestAlertEvaluationRequestId
  const { from, to } = resolveMetricsRange(range, Date.now())
  alertEvaluationLoading.value = true
  alertEvaluationError.value = null
  try {
    if (dashboardScope.value === null)
      throw new Error('No dashboard application selected')
    const response = await alertEvaluationApi.query(dashboardScope.value, { from, to })
    if (requestId === latestAlertEvaluationRequestId) {
      alertEvaluation.value = response
    }
  } catch (error) {
    if (requestId === latestAlertEvaluationRequestId) {
      alertEvaluation.value = null
      alertEvaluationError.value =
        error instanceof Error ? error.message : String(error)
    }
  } finally {
    if (requestId === latestAlertEvaluationRequestId) {
      alertEvaluationLoading.value = false
    }
  }
}

const memoryHealth = ref<MemoryHealthAssessment | null>(null)
const memoryHealthLoading = ref(false)
const memoryHealthError = ref<string | null>(null)
let latestMemoryHealthRequestId = 0

const memoryHealthReasonLabels = {
  HIGH_HEAP_PRESSURE: 'memory.highPressure',
  SUSTAINED_HEAP_GROWTH: 'memory.sustainedGrowth',
  INSUFFICIENT_SAMPLES: 'memory.insufficientSamples',
} as const

const memoryHealthView = computed(() => {
  if (memoryHealthLoading.value) {
    return {
      status: 'LOADING',
      utilization: '—',
      progress: 0,
      sufficiency: 'PENDING',
      sampleCount: 0,
      reason: t('memory.loading'),
    }
  }

  if (memoryHealthError.value !== null || memoryHealth.value === null) {
    return {
      status: 'UNAVAILABLE',
      utilization: '—',
      progress: 0,
      sufficiency: 'UNKNOWN',
      sampleCount: 0,
      reason: t('memory.unavailable'),
    }
  }

  const assessment = memoryHealth.value

  if (
    typeof assessment.status !== 'string' ||
    !Array.isArray(assessment.reasons) ||
    typeof assessment.sampleCount !== 'number'
  ) {
    return {
      status: 'UNAVAILABLE',
      utilization: '—',
      progress: 0,
      sufficiency: 'UNKNOWN',
      sampleCount: 0,
      reason: t('memory.unavailable'),
    }
  }

  const utilization = assessment.latest?.utilization
  const utilizationPercent =
    utilization === undefined
      ? null
      : Math.min(100, Math.max(0, utilization * 100))
  const reasons = assessment.reasons.map((reason) =>
    t(memoryHealthReasonLabels[reason]),
  )

  return {
    status: assessment.status,
    utilization:
      utilizationPercent === null ? '—' : `${utilizationPercent.toFixed(1)}%`,
    progress: utilizationPercent ?? 0,
    sufficiency:
      assessment.status === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT' : 'GOOD',
    sampleCount: assessment.sampleCount.toLocaleString(),
    reason: reasons.length > 0 ? reasons.join(' ') : t('memory.healthy'),
  }
})

async function loadMemoryHealth(range: MetricsRange = '24h'): Promise<void> {
  const requestId = ++latestMemoryHealthRequestId
  const { from, to } = resolveMetricsRange(range, Date.now())
  memoryHealthLoading.value = true
  memoryHealthError.value = null
  try {
    if (dashboardScope.value === null)
      throw new Error('No dashboard application selected')
    const response = await dashboardMemoryHealthApi.query(
      dashboardScope.value,
      { from, to },
    )

    if (requestId === latestMemoryHealthRequestId) {
      memoryHealth.value = response
    }
  } catch {
    if (requestId === latestMemoryHealthRequestId) {
      memoryHealthError.value = 'Unable to load memory health'
    }
  } finally {
    if (requestId === latestMemoryHealthRequestId) {
      memoryHealthLoading.value = false
    }
  }
}

const { data, loading, error, loadRange } = usePaintMetrics({
  query: (params) => metricsApi.query(dashboardScope.value, params),
})

const {
  data: lcpData,
  loading: lcpLoading,
  error: lcpError,
  loadRange: loadLcpRange,
} = useMetricQuery({
  type: 'web.vital.lcp',
  query: queryDashboardMetric,
})

const {
  data: clsData,
  loading: clsLoading,
  error: clsError,
  loadRange: loadClsRange,
} = useMetricQuery({
  type: 'web.vital.cls',
  query: queryDashboardMetric,
})

const {
  data: inpData,
  loading: inpLoading,
  error: inpError,
  loadRange: loadInpRange,
} = useMetricQuery({
  type: 'web.vital.inp',
  query: queryDashboardMetric,
})

function resolveDataState(
  hasData: boolean,
  isLoading: boolean,
  queryError: string | null,
): DataState {
  if (hasData) return null
  if (isLoading) return 'loading'
  if (queryError !== null) return 'error'
  return 'empty'
}

const metrics = computed(() => [
  {
    name: 'FP',
    stats: data.value?.summary.fp,
    value:
      data.value?.summary.fp.average === null ||
      data.value?.summary.fp.average === undefined
        ? '—'
        : Math.round(data.value.summary.fp.average).toLocaleString(),
    unit: 'ms',
    type: 'web.paint.fp',
    color: '#00d8ff',
    progress: calculateRingProgress(
      data.value?.summary.fp.average,
      PAINT_METRIC_THRESHOLDS['web.paint.fp'].poor,
    ),
    state: resolveDataState(
      (data.value?.summary.fp.count ?? 0) > 0,
      loading.value,
      error.value,
    ),
  },
  {
    name: 'FCP',
    stats: data.value?.summary.fcp,
    value:
      data.value?.summary.fcp.average === null ||
      data.value?.summary.fcp.average === undefined
        ? '—'
        : Math.round(data.value.summary.fcp.average).toLocaleString(),
    unit: 'ms',
    type: 'web.paint.fcp',
    color: '#00baff',
    progress: calculateRingProgress(
      data.value?.summary.fcp.average,
      PAINT_METRIC_THRESHOLDS['web.paint.fcp'].poor,
    ),
    state: resolveDataState(
      (data.value?.summary.fcp.count ?? 0) > 0,
      loading.value,
      error.value,
    ),
  },
  {
    name: 'LCP',
    stats: lcpData.value?.summary,
    value:
      lcpData.value?.summary.average === null ||
      lcpData.value?.summary.average === undefined
        ? '—'
        : Math.round(lcpData.value.summary.average).toLocaleString(),
    unit: lcpData.value?.metric?.unit,
    type: 'web.vital.lcp',
    color: '#ad75fa',
    progress: calculateRingProgress(
      lcpData.value?.summary.average,
      WEB_VITAL_THRESHOLDS['web.vital.lcp'].poor,
    ),
    state: resolveDataState(
      (lcpData.value?.summary.count ?? 0) > 0,
      lcpLoading.value,
      lcpError.value,
    ),
  },
  {
    name: 'CLS',
    stats: clsData.value?.summary,
    value:
      clsData.value?.summary.average === null ||
      clsData.value?.summary.average === undefined
        ? '—'
        : clsData.value.summary.average.toFixed(3),
    unit: clsData.value?.metric?.unit,
    type: 'web.vital.cls',
    color: '#bc7eff',
    progress: calculateRingProgress(
      clsData.value?.summary.average,
      WEB_VITAL_THRESHOLDS['web.vital.cls'].poor,
    ),
    state: resolveDataState(
      (clsData.value?.summary.count ?? 0) > 0,
      clsLoading.value,
      clsError.value,
    ),
  },
  {
    name: 'INP',
    stats: inpData.value?.summary,
    value:
      inpData.value?.summary.average === null ||
      inpData.value?.summary.average === undefined
        ? '—'
        : Math.round(inpData.value.summary.average).toLocaleString(),
    unit: inpData.value?.metric?.unit,
    type: 'web.vital.inp',
    color: '#a673ff',
    progress: calculateRingProgress(
      inpData.value?.summary.average,
      WEB_VITAL_THRESHOLDS['web.vital.inp'].poor,
    ),
    state: resolveDataState(
      (inpData.value?.summary.count ?? 0) > 0,
      inpLoading.value,
      inpError.value,
    ),
  },
])

const recommendations = computed(() =>
  createPerformanceRecommendations({
    fp: data.value?.summary.fp,
    fcp: data.value?.summary.fcp,
    lcp: lcpData.value?.summary,
    cls: clsData.value?.summary,
    clsFindings: clsDiagnostic.value?.findings,
    clsEvidence: clsDiagnostic.value ?? undefined,
    inp: inpData.value?.summary,
    inpFindings: inpDiagnostic.value?.findings,
    inpEvidence: inpDiagnostic.value ?? undefined,
    memoryHealth: memoryHealth.value,
    lcpFindings: lcpDiagnostic.value?.findings,
    lcpEvidence: lcpDiagnostic.value ?? undefined,
  }),
)

function recommendationFor(metric: string) {
  return recommendations.value.find((item) => item.metric === metric)
}

const {
  data: usedHeapData,
  loading: usedHeapLoading,
  error: usedHeapError,
  loadRange: loadUsedHeapRange,
} = useMetricQuery({
  type: 'web.memory.used_heap',
  query: queryDashboardMetric,
})

const {
  data: totalHeapData,
  loading: totalHeapLoading,
  error: totalHeapError,
  loadRange: loadTotalHeapRange,
} = useMetricQuery({
  type: 'web.memory.total_heap',
  query: queryDashboardMetric,
})

const {
  data: heapLimitData,
  loading: heapLimitLoading,
  error: heapLimitError,
  loadRange: loadHeapLimitRange,
} = useMetricQuery({
  type: 'web.memory.heap_limit',
  query: queryDashboardMetric,
})

function formatHeapAverage(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : formatBytes(value)
}

const usedHeapUtilization = computed(() => {
  const usedHeap = usedHeapData.value?.summary.average
  const heapLimit = heapLimitData.value?.summary.average

  if (
    usedHeap === null ||
    usedHeap === undefined ||
    heapLimit === null ||
    heapLimit === undefined ||
    !Number.isFinite(usedHeap) ||
    !Number.isFinite(heapLimit) ||
    usedHeap < 0 ||
    heapLimit <= 0
  ) {
    return null
  }

  return Math.min(1, usedHeap / heapLimit)
})

function heapCaption(defaultCaption: string, state: DataState): string {
  switch (state) {
    case 'loading':
      return t('memory.loadingData')
    case 'error':
      return t('memory.loadFailed')
    case 'empty':
      return t('memory.noSamples')
    default:
      return defaultCaption
  }
}

const heaps = computed(() => {
  const usedState = resolveDataState(
    (usedHeapData.value?.summary.count ?? 0) > 0,
    usedHeapLoading.value,
    usedHeapError.value,
  )
  const totalState = resolveDataState(
    (totalHeapData.value?.summary.count ?? 0) > 0,
    totalHeapLoading.value,
    totalHeapError.value,
  )
  const limitState = resolveDataState(
    (heapLimitData.value?.summary.count ?? 0) > 0,
    heapLimitLoading.value,
    heapLimitError.value,
  )

  return [
    {
      title: t('memory.usedHeap'),
      value: formatHeapAverage(usedHeapData.value?.summary.average),
      caption: heapCaption(
        usedHeapUtilization.value === null
          ? t('memory.unavailableOfHeapLimit')
          : t('memory.ofHeapLimit', {
              value: (usedHeapUtilization.value * 100).toFixed(1),
            }),
        usedState,
      ),
      color: '#79e76d',
      bars:
        usedHeapUtilization.value === null
          ? 0
          : Math.ceil(usedHeapUtilization.value * 14),
      kind: 'used',
      state: usedState,
    },
    {
      title: t('memory.totalHeap'),
      value: formatHeapAverage(totalHeapData.value?.summary.average),
      caption: heapCaption(t('memory.allocated'), totalState),
      color: '#06d2ee',
      bars: totalState === null ? 6 : 0,
      kind: 'total',
      state: totalState,
    },
    {
      title: t('memory.heapLimit'),
      value: formatHeapAverage(heapLimitData.value?.summary.average),
      caption: heapCaption(t('memory.hardLimit'), limitState),
      color: '#b77aff',
      bars: limitState === null ? 14 : 0,
      kind: 'limit',
      state: limitState,
    },
  ]
})

function createDashboardTrendSeries(
  mode: TrendMode,
  statistic: TrendStatistic,
): TrendSeries[] {
  switch (mode) {
    case 'PAINT':
      return data.value === null
        ? []
        : createPaintTrendSeries(data.value.series, statistic)

    case 'LCP': {
      const response = lcpData.value

      if (response?.metric?.type !== 'web.vital.lcp') {
        return []
      }

      return [
        createMetricTrendSeries({
          key: 'lcp',
          label: 'LCP',
          unit: response.metric.unit,
          color: '#ae66fa',
          points: response.series,
          statistic,
        }),
      ]
    }

    case 'CLS': {
      const response = clsData.value

      if (response?.metric?.type !== 'web.vital.cls') {
        return []
      }

      return [
        createMetricTrendSeries({
          key: 'cls',
          label: 'CLS',
          unit: response.metric.unit,
          color: '#e262ef',
          points: response.series,
          statistic,
        }),
      ]
    }

    case 'INP': {
      const response = inpData.value

      if (response?.metric?.type !== 'web.vital.inp') {
        return []
      }

      return [
        createMetricTrendSeries({
          key: 'inp',
          label: 'INP',
          unit: response.metric.unit,
          color: '#9860ee',
          points: response.series,
          statistic,
        }),
      ]
    }

    case 'MEMORY': {
      const response = usedHeapData.value

      if (response?.metric?.type !== 'web.memory.used_heap') {
        return []
      }

      return [
        createMetricTrendSeries({
          key: 'used-heap',
          label: t('memory.usedHeapTrend'),
          unit: response.metric.unit,
          color: '#7be66b',
          points: response.series,
          statistic,
        }),
      ]
    }
  }
}

function trendState(mode: TrendMode): { loading: boolean; error: boolean } {
  switch (mode) {
    case 'PAINT':
      return { loading: loading.value, error: error.value !== null }
    case 'LCP':
      return { loading: lcpLoading.value, error: lcpError.value !== null }
    case 'CLS':
      return { loading: clsLoading.value, error: clsError.value !== null }
    case 'INP':
      return { loading: inpLoading.value, error: inpError.value !== null }
    case 'MEMORY':
      return {
        loading: usedHeapLoading.value,
        error: usedHeapError.value !== null,
      }
  }
}

const LIVE_REFRESH_INTERVAL_MS = 30_000
const LIVE_CLOCK_INTERVAL_MS = 1_000
let liveRefreshTimer: ReturnType<typeof setInterval> | undefined
let liveClockTimer: ReturnType<typeof setInterval> | undefined
const averageMode = ref<TrendMode>('PAINT')
const p75Mode = ref<TrendMode>('MEMORY')
const averageTrendSeries = computed(() =>
  createDashboardTrendSeries(averageMode.value, 'average'),
)
const p75TrendSeries = computed(() =>
  createDashboardTrendSeries(p75Mode.value, 'p75'),
)
const dashboardTimestamp = ref(Date.now())
const selectedRange = ref<MetricsRange>('24h')

const totalSamples = computed(() => {
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
    data.value.summary.fp.count +
    data.value.summary.fcp.count +
    lcpSamples +
    clsSamples +
    inpSamples
  )
})

async function refreshDashboard(
  range: MetricsRange = selectedRange.value,
): Promise<void> {
  await Promise.all([
    loadRange(range),
    loadLcpRange(range),
    loadClsRange(range),
    loadInpRange(range),
    loadUsedHeapRange(range),
    loadTotalHeapRange(range),
    loadHeapLimitRange(range),
    loadMemoryHealth(range),
    loadLcpDiagnosticRange(range),
    loadClsDiagnosticRange(range),
    loadInpDiagnosticRange(range),
    loadAlertEvaluationRange(range),
  ])
}

function stopLiveRefresh(): void {
  if (liveRefreshTimer !== undefined) {
    clearInterval(liveRefreshTimer)
    liveRefreshTimer = undefined
  }

  if (liveClockTimer !== undefined) {
    clearInterval(liveClockTimer)
    liveClockTimer = undefined
  }
}

function startLiveRefresh(): void {
  stopLiveRefresh()
  liveRefreshTimer = setInterval(() => {
    void refreshDashboard()
  }, LIVE_REFRESH_INTERVAL_MS)
  liveClockTimer = setInterval(() => {
    dashboardTimestamp.value = Date.now()
  }, LIVE_CLOCK_INTERVAL_MS)
}

function handleSelectedRange(range: MetricsRange): void {
  selectedRange.value = range
  void refreshDashboard(range)
}

onMounted(() => {
  void refreshDashboard()
  startLiveRefresh()
})

onUnmounted(stopLiveRefresh)
</script>
