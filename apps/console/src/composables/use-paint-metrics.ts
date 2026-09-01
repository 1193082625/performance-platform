import { ref } from 'vue'

import type {
    MetricsInterval,
    PaintMetricsQueryParams,
    PaintMetricsResponse
} from '@performance-platform/protocol'

export type MetricsRange = 
    | '1h'
    | '24h'
    | '7d'
    | '30d'

interface UsePaintMetricsOptions {
    query(
        params: PaintMetricsQueryParams,
    ): Promise<PaintMetricsResponse>

    now?: () => number
}

interface RangeConfig {
    durationMs: number
    interval: MetricsInterval
}

const RANGE_CONFIG:Record<MetricsRange, RangeConfig> = {
    '1h': {
        durationMs:
            60 * 60 * 1_000,

        interval:
            'minute',
    },

    '24h': {
        durationMs:
            24 * 60 * 60 * 1_000,

        interval:
            'hour',
    },

    '7d': {
        durationMs:
            7 * 24 * 60 * 60 * 1_000,

        interval:
            'day',
    },
    '30d': {
        durationMs:
            30 * 24 * 60 * 60 * 1_000,

        interval:
            'day',
    },
}

export function usePaintMetrics(
    options: UsePaintMetricsOptions,
) {
    const loading = ref(false)
    const data = ref<PaintMetricsResponse | null>(null)
    const error = ref<string | null>(null)
    let latestRequestId = 0 

    async function load(
        params: PaintMetricsQueryParams
    ): Promise<void> {
        const requestId = ++latestRequestId

        loading.value = true
        error.value = null

        try {
            const response = await options.query(params)
            if (requestId !== latestRequestId) {
                return
            }
            data.value = response
        } catch(cause) {
            if (requestId !== latestRequestId) return

            error.value = 'Unable to load performance metrics'
        } finally {
            if (requestId === latestRequestId) {
                loading.value = false
            }
        }
    }

    async function loadRange(
        range: MetricsRange = '24h'
    ): Promise<void> {
        const now = (options.now ?? Date.now)()

        const config = RANGE_CONFIG[range]

        await load({
            from: new Date(now - config.durationMs).toISOString(),
            to: new Date(now).toISOString(),
            interval: config.interval
        })
    }

    return {
        loading,
        data,
        error,
        load,
        loadRange
    }
}