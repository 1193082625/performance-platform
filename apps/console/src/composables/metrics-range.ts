import type {
    MetricsInterval,
} from '@performance-platform/protocol'

export type MetricsRange =
    | '1h'
    | '24h'
    | '7d'
    | '30d'

interface RangeConfig {
    durationMs: number
    interval: MetricsInterval
}

const RANGE_CONFIG: Record<MetricsRange, RangeConfig> = {
    '1h': {
        durationMs: 60 * 60 * 1_000,
        interval: 'minute',
    },
    '24h': {
        durationMs: 24 * 60 * 60 * 1_000,
        interval: 'hour',
    },
    '7d': {
        durationMs: 7 * 24 * 60 * 60 * 1_000,
        interval: 'day',
    },
    '30d': {
        durationMs: 30 * 24 * 60 * 60 * 1_000,
        interval: 'day',
    },
}

export function resolveMetricsRange(
    range: MetricsRange,
    now: number,
) {
    const config = RANGE_CONFIG[range]

    return {
        from: new Date(
            now - config.durationMs,
        ).toISOString(),
        to: new Date(now).toISOString(),
        interval: config.interval,
    }
}
