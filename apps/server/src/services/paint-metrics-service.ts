import type { PaintMetricsData, PaintMetricsResponse } from "@performance-platform/protocol"
import type { EventRepository } from "../repositories/event-repository.js"
import { calculatePaintScore } from './paint-score.js'

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1_000

const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000

interface PaintMetricsServiceOptions {
    repository: EventRepository
    appId: string
    now: () => number
}

export type PaintMetricsResult = 
    | {
        ok: true,
        value: PaintMetricsResponse
    }
    | {
        ok: false,
        code: 'INVALID_DATE'
        field: 'from' | 'to'
    }
    | {
        ok: false,
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

export interface PaintMetricsService {
    query(
        input: unknown,
    ): Promise<PaintMetricsResult>
}
    
function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
    )
}

export function createPaintMetricsService(
    options: PaintMetricsServiceOptions
): PaintMetricsService {
    return {
        async query(
            input: unknown,
        ): Promise<PaintMetricsResult> {
            const now = options.now()
            const params = isRecord(input) ? input : {}
            
            const from = typeof params.from === 'string'
                ? new Date(params.from)
                : new Date(now - DEFAULT_RANGE_MS)

            if (!Number.isFinite(from.getTime())) {
                return {
                    ok: false,
                    code: "INVALID_DATE",
                    field: 'from'
                }
            }
            
            const to = typeof params.to === 'string'
                ? new Date(params.to)
                : new Date(now)

            if (!Number.isFinite(to.getTime())) {
                return {
                    ok: false,
                    code: "INVALID_DATE",
                    field: 'to'
                }
            }

            if(from.getTime() >= to.getTime()) {
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
                    typeof params.interval !== 'string' || !['minute', 'hour', 'day'].includes(params.interval)
                )) {
                return {
                    ok: false,
                    code: "INVALID_INTERVAL",
                }
            }

            const interval = params.interval === 'minute'
                || params.interval === 'hour'
                || params.interval === 'day'
                    ? params.interval
                    : 'hour'

            let value: PaintMetricsData

            try {
                value = await options.repository.queryPaintMetrics({
                    appId: options.appId,
                    from,
                    to,
                    interval,
                })
            } catch(cause) {
                return {
                    ok: false,
                    code: 'STORAGE_UNAVAILABLE',
                    cause
                }
            }

            const response: PaintMetricsResponse = {
                ...value,
                score: calculatePaintScore(value.summary)
            }
            return {
                ok: true,
                value: response,
            }
        }
    }
}