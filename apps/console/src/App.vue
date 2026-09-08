<template>
  <main class="dashboard">
    <header v-frame class="topbar tech-frame">
      <div class="brand">
        <Icon name="pulse" />
        <h1>WEB PERFORMANCE</h1>
      </div>
      <button
        class="live-badge"
        :class="{ paused: !live }"
        @click="toggleLive"
        :aria-pressed="live"
        :title="live ? 'Pause automatic refresh' : 'Resume automatic refresh'"
      >
        <i></i>{{ live ? "LIVE" : "PAUSED" }}
      </button>
      <div class="sample-total">
        <span>TOTAL SAMPLES</span>
        <strong>{{ totalSamples.toLocaleString() }}</strong>
      </div>
      <MetricsRangeSelector
        :range="selectedRange"
        @select="handleSelectedRange"
      />
      <div class="date-time">
        <Icon name="clock" />
        <div>
          <span>{{ dashboardDate }}</span
          ><strong>{{ dashboardTime }} UTC</strong>
        </div>
      </div>
    </header>

    <p v-if="loading && data === null" class="dashboard-state" role="status">
      正在加载性能数据
    </p>
    <p v-else-if="error !== null && data === null" class="dashboard-state" role="alert">
      性能数据加载失败
    </p>
    <p
      v-else-if="data !== null && data.summary.fp.count === 0 && data.summary.fcp.count === 0"
      class="dashboard-state"
      role="status"
    >
      暂无性能数据
    </p>

    <div v-frame class="main-shell tech-frame">
      <section v-frame class="performance tech-frame">
        <div class="metrics">
          <MetricSummaryCard
            v-for="metric in metrics"
            :key="metric.name"
            :metric="metric"
          />
        </div>
        <div class="charts">
          <article v-frame class="chart-panel tech-frame">
            <div class="chart-heading">
              <h2>AVERAGE TREND</h2>
              <select v-model="averageMode" aria-label="Average trend metric">
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
              :loading="trendState(averageMode).loading"
              :error="trendState(averageMode).error"
              :aria-label="`${averageMode} average performance trend`"
            />
          </article>
          <article v-frame class="chart-panel tech-frame">
            <div class="chart-heading p75-heading">
              <h2>P75 TREND</h2>
              <div class="metric-tabs" aria-label="P75 trend metric">
                <button
                  v-for="mode in ['PAINT', 'LCP', 'CLS', 'INP', 'MEMORY']"
                  :key="mode"
                  :class="{
                    selected: p75Mode === mode,
                    memory: mode === 'MEMORY',
                  }"
                  @click="p75Mode = mode"
                >
                  {{ mode }}
                </button>
              </div>
            </div>
            <TrendChart
              :series="p75TrendSeries"
              :loading="trendState(p75Mode).loading"
              :error="trendState(p75Mode).error"
              :aria-label="`${p75Mode} P75 performance trend`"
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
          <h2>MEMORY HEALTH</h2>
          <div class="health-body">
            <Ring health color="#78e76b" :progress="memoryHealthView.progress" />
            <div class="health-stats">
              <strong>{{ memoryHealthView.status }}</strong
              ><span>UTILIZATION</span><b>{{ memoryHealthView.utilization }}</b
              ><span>SAMPLE SUFFICIENCY</span
              ><em>{{ memoryHealthView.sufficiency }} ({{ memoryHealthView.sampleCount }})</em>
            </div>
          </div>
          <div class="reason">
            <span>REASON</span>
            <p>{{ memoryHealthView.reason }}</p>
          </div>
        </article>
        <article
          v-for="heap in heaps"
          :key="heap.title"
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
        <Icon name="info" /><span
          >All times are in UTC. Metrics update continuously. Data reflects real
          user monitoring (RUM) from production.</span
        >
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { createPaintMetricsApi } from "./api/metrics.js";
import { createMetricQueryApi } from "./api/metric-query.js";

import { usePaintMetrics } from "./composables/use-paint-metrics.js";
import { useMetricQuery } from "./composables/use-metric-query.js";
import MetricsRangeSelector from "./components/MetricsRangeSelector.vue";
import type { MetricsRange } from "./composables/metrics-range.js";
import MetricSummaryCard from "./components/MetricSummaryCard.vue";
import { createMemoryHealthApi } from "./api/memory-health.js";
import type { MemoryHealthAssessment } from "@performance-platform/protocol";
import { WEB_VITAL_THRESHOLDS } from "@performance-platform/protocol";
import { formatBytes } from "./components/metric-value-format.js";

import Icon from "./components/Icon.vue";
import Ring from "./components/Ring.vue";
import TrendChart from "./components/TrendChart.vue";

import {
  createMetricTrendSeries,
  createPaintTrendSeries,
} from "./components/trend-series.js";

import type { TrendSeries, TrendStatistic } from "./components/trend-series.js";

type TrendMode = "PAINT" | "LCP" | "CLS" | "INP" | "MEMORY";
type DataState = "loading" | "error" | "empty" | null;

const PAINT_POOR_THRESHOLDS = {
  "web.paint.fp": 2_000,
  "web.paint.fcp": 3_000,
} as const;

function calculateRingProgress(
  value: number | null | undefined,
  poorThreshold: number,
): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  const percentage = Math.min(100, Math.max(0, (value / poorThreshold) * 100));

  return Math.round(percentage * 10) / 10;
}

const metricsApi = createPaintMetricsApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
});

const metricQueryApi = createMetricQueryApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
});
const memoryHealthApi = createMemoryHealthApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
});
const memoryHealth = ref<MemoryHealthAssessment | null>(null);
const memoryHealthLoading = ref(false);
const memoryHealthError = ref<string | null>(null);
let latestMemoryHealthRequestId = 0;

const memoryHealthReasonLabels = {
  HIGH_HEAP_PRESSURE: "Heap utilization is above the healthy threshold.",
  SUSTAINED_HEAP_GROWTH: "Heap usage shows sustained growth.",
  INSUFFICIENT_SAMPLES: "More samples are required for a reliable assessment.",
} as const;

const memoryHealthView = computed(() => {
  if (memoryHealthLoading.value) {
    return {
      status: "LOADING",
      utilization: "—",
      progress: 0,
      sufficiency: "PENDING",
      sampleCount: 0,
      reason: "Memory health assessment is loading.",
    };
  }

  if (memoryHealthError.value !== null || memoryHealth.value === null) {
    return {
      status: "UNAVAILABLE",
      utilization: "—",
      progress: 0,
      sufficiency: "UNKNOWN",
      sampleCount: 0,
      reason: memoryHealthError.value ?? "Memory health data is unavailable.",
    };
  }

  const assessment = memoryHealth.value;

  if (
    typeof assessment.status !== "string" ||
    !Array.isArray(assessment.reasons) ||
    typeof assessment.sampleCount !== "number"
  ) {
    return {
      status: "UNAVAILABLE",
      utilization: "—",
      progress: 0,
      sufficiency: "UNKNOWN",
      sampleCount: 0,
      reason: "Memory health data is unavailable.",
    };
  }

  const utilization = assessment.latest?.utilization;
  const utilizationPercent =
    utilization === undefined
      ? null
      : Math.min(100, Math.max(0, utilization * 100));
  const reasons = assessment.reasons.map(
    (reason) => memoryHealthReasonLabels[reason],
  );

  return {
    status: assessment.status.replace("_", " "),
    utilization:
      utilizationPercent === null ? "—" : `${utilizationPercent.toFixed(1)}%`,
    progress: utilizationPercent ?? 0,
    sufficiency:
      assessment.status === "INSUFFICIENT_DATA" ? "INSUFFICIENT" : "GOOD",
    sampleCount: assessment.sampleCount.toLocaleString(),
    reason:
      reasons.length > 0
        ? reasons.join(" ")
        : "Heap usage is within normal range with healthy headroom.",
  };
});

async function loadMemoryHealth(): Promise<void> {
  const requestId = ++latestMemoryHealthRequestId;
  memoryHealthLoading.value = true;
  memoryHealthError.value = null;
  try {
    const response = await memoryHealthApi.query();

    if (requestId === latestMemoryHealthRequestId) {
      memoryHealth.value = response;
    }
  } catch {
    if (requestId === latestMemoryHealthRequestId) {
      memoryHealthError.value = "Unable to load memory health";
    }
  } finally {
    if (requestId === latestMemoryHealthRequestId) {
      memoryHealthLoading.value = false;
    }
  }
}

const { data, loading, error, loadRange } = usePaintMetrics({
  query: metricsApi.query,
});

const {
  data: lcpData,
  loading: lcpLoading,
  error: lcpError,
  loadRange: loadLcpRange,
} = useMetricQuery({
  type: "web.vital.lcp",
  query: metricQueryApi.query,
});

const {
  data: clsData,
  loading: clsLoading,
  error: clsError,
  loadRange: loadClsRange,
} = useMetricQuery({
  type: "web.vital.cls",
  query: metricQueryApi.query,
});

const {
  data: inpData,
  loading: inpLoading,
  error: inpError,
  loadRange: loadInpRange,
} = useMetricQuery({
  type: "web.vital.inp",
  query: metricQueryApi.query,
});

function resolveDataState(
  hasData: boolean,
  isLoading: boolean,
  queryError: string | null,
): DataState {
  if (hasData) return null;
  if (isLoading) return "loading";
  if (queryError !== null) return "error";
  return "empty";
}

const metrics = computed(() => [
  {
    name: "FP",
    stats: data.value?.summary.fp,
    value:
      data.value?.summary.fp.average === null ||
      data.value?.summary.fp.average === undefined
        ? "—"
        : Math.round(data.value.summary.fp.average).toLocaleString(),
    unit: "ms",
    type: "web.paint.fp",
    color: "#00d8ff",
    progress: calculateRingProgress(
      data.value?.summary.fp.average,
      PAINT_POOR_THRESHOLDS["web.paint.fp"],
    ),
    state: resolveDataState(
      (data.value?.summary.fp.count ?? 0) > 0,
      loading.value,
      error.value,
    ),
  },
  {
    name: "FCP",
    stats: data.value?.summary.fcp,
    value:
      data.value?.summary.fcp.average === null ||
      data.value?.summary.fcp.average === undefined
        ? "—"
        : Math.round(data.value.summary.fcp.average).toLocaleString(),
    unit: "ms",
    type: "web.paint.fcp",
    color: "#00baff",
    progress: calculateRingProgress(
      data.value?.summary.fcp.average,
      PAINT_POOR_THRESHOLDS["web.paint.fcp"],
    ),
    state: resolveDataState(
      (data.value?.summary.fcp.count ?? 0) > 0,
      loading.value,
      error.value,
    ),
  },
  {
    name: "LCP",
    stats: lcpData.value?.summary,
    value:
      lcpData.value?.summary.average === null ||
      lcpData.value?.summary.average === undefined
        ? "—"
        : Math.round(lcpData.value.summary.average).toLocaleString(),
    unit: lcpData.value?.metric?.unit,
    type: "web.vital.lcp",
    color: "#ad75fa",
    progress: calculateRingProgress(
      lcpData.value?.summary.average,
      WEB_VITAL_THRESHOLDS["web.vital.lcp"].poor,
    ),
    state: resolveDataState(
      (lcpData.value?.summary.count ?? 0) > 0,
      lcpLoading.value,
      lcpError.value,
    ),
  },
  {
    name: "CLS",
    stats: clsData.value?.summary,
    value:
      clsData.value?.summary.average === null ||
      clsData.value?.summary.average === undefined
        ? "—"
        : clsData.value.summary.average.toFixed(3),
    unit: clsData.value?.metric?.unit,
    type: "web.vital.cls",
    color: "#bc7eff",
    progress: calculateRingProgress(
      clsData.value?.summary.average,
      WEB_VITAL_THRESHOLDS["web.vital.cls"].poor,
    ),
    state: resolveDataState(
      (clsData.value?.summary.count ?? 0) > 0,
      clsLoading.value,
      clsError.value,
    ),
  },
  {
    name: "INP",
    stats: inpData.value?.summary,
    value:
      inpData.value?.summary.average === null ||
      inpData.value?.summary.average === undefined
        ? "—"
        : Math.round(inpData.value.summary.average).toLocaleString(),
    unit: inpData.value?.metric?.unit,
    type: "web.vital.inp",
    color: "#a673ff",
    progress: calculateRingProgress(
      inpData.value?.summary.average,
      WEB_VITAL_THRESHOLDS["web.vital.inp"].poor,
    ),
    state: resolveDataState(
      (inpData.value?.summary.count ?? 0) > 0,
      inpLoading.value,
      inpError.value,
    ),
  },
]);

const {
  data: usedHeapData,
  loading: usedHeapLoading,
  error: usedHeapError,
  loadRange: loadUsedHeapRange,
} = useMetricQuery({
  type: "web.memory.used_heap",
  query: metricQueryApi.query,
});

const {
  data: totalHeapData,
  loading: totalHeapLoading,
  error: totalHeapError,
  loadRange: loadTotalHeapRange,
} = useMetricQuery({
  type: "web.memory.total_heap",
  query: metricQueryApi.query,
});

const {
  data: heapLimitData,
  loading: heapLimitLoading,
  error: heapLimitError,
  loadRange: loadHeapLimitRange,
} = useMetricQuery({
  type: "web.memory.heap_limit",
  query: metricQueryApi.query,
});

function formatHeapAverage(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatBytes(value);
}

const usedHeapUtilization = computed(() => {
  const usedHeap = usedHeapData.value?.summary.average;
  const heapLimit = heapLimitData.value?.summary.average;

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
    return null;
  }

  return Math.min(1, usedHeap / heapLimit);
});

function heapCaption(defaultCaption: string, state: DataState): string {
  switch (state) {
    case "loading":
      return "Loading…";
    case "error":
      return "Unable to load data";
    case "empty":
      return "No samples";
    default:
      return defaultCaption;
  }
}

const heaps = computed(() => {
  const usedState = resolveDataState(
    (usedHeapData.value?.summary.count ?? 0) > 0,
    usedHeapLoading.value,
    usedHeapError.value,
  );
  const totalState = resolveDataState(
    (totalHeapData.value?.summary.count ?? 0) > 0,
    totalHeapLoading.value,
    totalHeapError.value,
  );
  const limitState = resolveDataState(
    (heapLimitData.value?.summary.count ?? 0) > 0,
    heapLimitLoading.value,
    heapLimitError.value,
  );

  return [
    {
    title: "USED HEAP",
    value: formatHeapAverage(usedHeapData.value?.summary.average),
    caption: heapCaption(
      usedHeapUtilization.value === null
        ? "— of Heap Limit"
        : `${(usedHeapUtilization.value * 100).toFixed(1)}% of Heap Limit`,
      usedState,
    ),
    color: "#79e76d",
    bars:
      usedHeapUtilization.value === null
        ? 0
        : Math.ceil(usedHeapUtilization.value * 14),
    kind: "used",
    state: usedState,
  },
  {
    title: "TOTAL HEAP",
    value: formatHeapAverage(totalHeapData.value?.summary.average),
    caption: heapCaption("Allocated", totalState),
    color: "#06d2ee",
    bars: totalState === null ? 6 : 0,
    kind: "total",
    state: totalState,
  },
  {
    title: "HEAP LIMIT",
    value: formatHeapAverage(heapLimitData.value?.summary.average),
    caption: heapCaption("Hard Limit", limitState),
    color: "#b77aff",
    bars: limitState === null ? 14 : 0,
    kind: "limit",
    state: limitState,
  },
  ];
});

function createDashboardTrendSeries(
  mode: TrendMode,
  statistic: TrendStatistic,
): TrendSeries[] {
  switch (mode) {
    case "PAINT":
      return data.value === null
        ? []
        : createPaintTrendSeries(data.value.series, statistic);

    case "LCP": {
      const response = lcpData.value;

      if (response?.metric?.type !== "web.vital.lcp") {
        return [];
      }

      return [
        createMetricTrendSeries({
          key: "lcp",
          label: "LCP",
          unit: response.metric.unit,
          color: "#ae66fa",
          points: response.series,
          statistic,
        }),
      ];
    }

    case "CLS": {
      const response = clsData.value;

      if (response?.metric?.type !== "web.vital.cls") {
        return [];
      }

      return [
        createMetricTrendSeries({
          key: "cls",
          label: "CLS",
          unit: response.metric.unit,
          color: "#e262ef",
          points: response.series,
          statistic,
        }),
      ];
    }

    case "INP": {
      const response = inpData.value;

      if (response?.metric?.type !== "web.vital.inp") {
        return [];
      }

      return [
        createMetricTrendSeries({
          key: "inp",
          label: "INP",
          unit: response.metric.unit,
          color: "#9860ee",
          points: response.series,
          statistic,
        }),
      ];
    }

    case "MEMORY": {
      const response = usedHeapData.value;

      if (response?.metric?.type !== "web.memory.used_heap") {
        return [];
      }

      return [
        createMetricTrendSeries({
          key: "used-heap",
          label: "Used Heap",
          unit: response.metric.unit,
          color: "#7be66b",
          points: response.series,
          statistic,
        }),
      ];
    }
  }
}

function trendState(mode: TrendMode): { loading: boolean; error: boolean } {
  switch (mode) {
    case "PAINT":
      return { loading: loading.value, error: error.value !== null };
    case "LCP":
      return { loading: lcpLoading.value, error: lcpError.value !== null };
    case "CLS":
      return { loading: clsLoading.value, error: clsError.value !== null };
    case "INP":
      return { loading: inpLoading.value, error: inpError.value !== null };
    case "MEMORY":
      return {
        loading: usedHeapLoading.value,
        error: usedHeapError.value !== null,
      };
  }
}

const live = ref(true);
const LIVE_REFRESH_INTERVAL_MS = 30_000;
let liveRefreshTimer: ReturnType<typeof setInterval> | undefined;
const averageMode = ref<TrendMode>("PAINT");
const p75Mode = ref<TrendMode>("MEMORY");
const averageTrendSeries = computed(() =>
  createDashboardTrendSeries(averageMode.value, "average"),
);
const p75TrendSeries = computed(() =>
  createDashboardTrendSeries(p75Mode.value, "p75"),
);
const initialTimestamp = Date.now();
const dashboardTimestamp = computed(() => {
  const queryEnd =
    data.value?.range.to ??
    lcpData.value?.range.to ??
    clsData.value?.range.to ??
    inpData.value?.range.to ??
    usedHeapData.value?.range.to ??
    totalHeapData.value?.range.to ??
    heapLimitData.value?.range.to;
  const parsedTimestamp = queryEnd === undefined ? NaN : Date.parse(queryEnd);

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : initialTimestamp;
});
const dashboardDate = computed(() =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(dashboardTimestamp.value)
    .toUpperCase(),
);
const dashboardTime = computed(() =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(dashboardTimestamp.value),
);
const selectedRange = ref<MetricsRange>("24h");

const totalSamples = computed(() => {
  if (data.value === null) {
    return 0;
  }

  const lcpSamples =
    lcpData.value?.metric?.type === "web.vital.lcp"
      ? lcpData.value.summary.count
      : 0;
  const clsSamples =
    clsData.value?.metric?.type === "web.vital.cls"
      ? clsData.value.summary.count
      : 0;
  const inpSamples =
    inpData.value?.metric?.type === "web.vital.inp"
      ? inpData.value.summary.count
      : 0;

  return (
    data.value.summary.fp.count +
    data.value.summary.fcp.count +
    lcpSamples +
    clsSamples +
    inpSamples
  );
});

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
    loadMemoryHealth(),
  ]);
}

function stopLiveRefresh(): void {
  if (liveRefreshTimer !== undefined) {
    clearInterval(liveRefreshTimer);
    liveRefreshTimer = undefined;
  }
}

function startLiveRefresh(): void {
  stopLiveRefresh();
  liveRefreshTimer = setInterval(() => {
    void refreshDashboard();
  }, LIVE_REFRESH_INTERVAL_MS);
}

function toggleLive(): void {
  live.value = !live.value;

  if (live.value) {
    void refreshDashboard();
    startLiveRefresh();
  } else {
    stopLiveRefresh();
  }
}

function handleSelectedRange(range: MetricsRange): void {
  selectedRange.value = range;
  void refreshDashboard(range);

  if (live.value) {
    startLiveRefresh();
  }
}

onMounted(() => {
  void refreshDashboard();
  startLiveRefresh();
});

onUnmounted(stopLiveRefresh);
</script>
