import type {
    MetricQueryParams,
    MetricQueryResponse,
    WebMetric,
} from '@performance-platform/protocol'
import {
    ref,
} from 'vue'
import {
    resolveMetricsRange,
} from './metrics-range.js'
import type {
    MetricsRange,
} from './metrics-range.js'

type MetricQueryOverrides =
    Omit<MetricQueryParams, 'type'>

interface UseMetricQueryOptions {
    type: WebMetric

    query(
        params: MetricQueryParams,
    ): Promise<MetricQueryResponse>

    now?: () => number
}

export function useMetricQuery(
    options: UseMetricQueryOptions,
) {
    const loading = ref(false)
    const data = ref<MetricQueryResponse | null>(null)
    const error = ref<string | null>(null)
    let latestRequestId = 0

    async function load(
        params: MetricQueryOverrides = {},
    ): Promise<void> {
        const requestId = ++latestRequestId

        loading.value = true
        error.value = null

        try {
            const response = await options.query({
                ...params,
                type: options.type
            })
            if (requestId !== latestRequestId) {
                return
            }

            data.value = response
        } catch {
            if (requestId !== latestRequestId) {
                return
            }

            error.value = 'Unable to load metric'
        } finally {
            if (requestId === latestRequestId) {
                loading.value = false
            }
        }
    }

    async function loadRange(
        range: MetricsRange = '24h',
    ): Promise<void> {
        const now = (options.now ?? Date.now)()

        await load(resolveMetricsRange(range, now))
    }

    return {
        loading,
        data,
        error,
        load,
        loadRange,
    }
}
