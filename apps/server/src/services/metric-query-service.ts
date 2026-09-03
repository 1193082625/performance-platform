import type { MetricQueryResponse, MetricDefinition, WebMetric } from "@performance-platform/protocol";
import type { MetricQueryRepository } from "../repositories/event-repository.js";

interface MetricQueryServiceOptions {
    repository: MetricQueryRepository
    appId: string
    now(): number
}

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000

type MetricDefinitionMap = {
    [Type in WebMetric]: MetricDefinition & {
        type: Type
    }
}

const METRIC_DEFINITIONS = {
    'web.paint.fp': {
        type: 'web.paint.fp',
        unit: 'ms',
        metricVersion: 'paint-v1',
    },

    'web.paint.fcp': {
        type: 'web.paint.fcp',
        unit: 'ms',
        metricVersion: 'paint-v1',
    },

    'web.vital.lcp': {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },

    'web.vital.cls': {
        type: 'web.vital.cls',
        unit: 'score',
        metricVersion: 'cls-v1',
    },

    'web.vital.inp': {
        type: 'web.vital.inp',
        unit: 'ms',
        metricVersion: 'inp-v1',
    },

    'web.memory.used_heap': {
        type: 'web.memory.used_heap',
        unit: 'byte',
        metricVersion: 'memory-v1',
    },

    'web.memory.total_heap': {
        type: 'web.memory.total_heap',
        unit: 'byte',
        metricVersion: 'memory-v1',
    },

    'web.memory.heap_limit': {
        type: 'web.memory.heap_limit',
        unit: 'byte',
        metricVersion: 'memory-v1',
    },
} satisfies MetricDefinitionMap

export type MetricQueryResult =
    | {
        ok: true
        value: MetricQueryResponse
    }
    | {
        ok: false
        code: 'UNSUPPORTED_METRIC'
    }
    | {
        ok: false
        code: 'INVALID_DATE'
        field: 'from' | 'to'
    }
    | {
        ok: false
        code: 'INVALID_INTERVAL'
    }
    | {
        ok: false
        code: 'INVALID_TIME_RANGE'
    }
    | {
        ok: false
        code: 'TIME_RANGE_TOO_LARGE'
    }
    | {
        ok: false
        code: 'STORAGE_UNAVAILABLE'
        cause: unknown
    }

export interface MetricQueryService {
    query(
        input: unknown
    ): Promise<MetricQueryResult>
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
    )
}

function resolveMetricDefinition(
    value: unknown,
): MetricDefinition | undefined {
    if (
        typeof value !== 'string'
        || !Object.hasOwn(
            METRIC_DEFINITIONS,
            value,
        )
    ) {
        return undefined
    }

    return METRIC_DEFINITIONS[
        value as WebMetric
    ]
}

export function createMetricQueryService(
    options: MetricQueryServiceOptions
): MetricQueryService {
    return {
        async query(
            input: unknown
        ): Promise<MetricQueryResult> {
            const params = isRecord(input) ? input : {}

            const metric = resolveMetricDefinition(params.type)

            if (metric === undefined) {
                return {
                    ok: false,
                    code: "UNSUPPORTED_METRIC",
                }
            }

            const now = options.now()

            const from = params.from === undefined
                ? new Date(
                    now - DEFAULT_RANGE_MS
                )
                : typeof params.from === 'string'
                    ? new Date(params.from)
                    : new Date(Number.NaN)

            if (!Number.isFinite(from.getTime())) {
                return {
                    ok: false,
                    code: 'INVALID_DATE',
                    field: 'from'
                }
            }

            const to =
                params.to === undefined
                    ? new Date(now)
                    : typeof params.to === 'string'
                        ? new Date(params.to)
                        : new Date(Number.NaN)
            
            if (!Number.isFinite(to.getTime())) {
                return {
                    ok: false,
                    code: 'INVALID_DATE',
                    field: 'to',
                }
            }

            if (from.getTime() >= to.getTime()) {
                return {
                    ok: false,
                    code: 'INVALID_TIME_RANGE'
                }
            }
            const rangeDuration = to.getTime() - from.getTime()
            if (rangeDuration > MAX_RANGE_MS) {
                return {
                    ok: false,
                    code: 'TIME_RANGE_TOO_LARGE'
                }
            }

            if (
                params.interval !== undefined
                && (
                    typeof params.interval !== 'string'
                    || !['minute', 'hour', 'day'].includes(params.interval)
                )
            ) {
                return {
                    ok: false,
                    code: 'INVALID_INTERVAL'
                }
            }

            const interval = params.interval === 'minute'
                || params.interval === 'hour'
                || params.interval === 'day'
                    ? params.interval
                    : 'hour'

            try {
                const value = await options.repository.queryMetric({
                    appId: options.appId,
                    metric,
                    from,
                    to,
                    interval: interval
                })
                return {
                    ok: true,
                    value,
                }
            } catch(cause) {
                return {
                    ok: false,
                    code: 'STORAGE_UNAVAILABLE',
                    cause,
                }
            }
        }
    }
}
