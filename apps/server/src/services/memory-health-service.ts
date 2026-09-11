import {
    evaluateMemoryHealth,
    type MemoryHealthAssessment,
} from '@performance-platform/protocol'
import type {
    MemoryHealthRepository,
} from '../repositories/event-repository.js'

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1_000
const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000

type MemoryHealthQueryResult =
    | { ok: true; value: MemoryHealthAssessment }
    | { ok: false; code: 'INVALID_DATE'; field: 'from' | 'to' }
    | { ok: false; code: 'INVALID_TIME_RANGE' }
    | { ok: false; code: 'TIME_RANGE_TOO_LARGE' }
    | { ok: false; code: 'STORAGE_UNAVAILABLE'; cause: unknown }

export interface MemoryHealthService {
    query(input?: unknown): Promise<MemoryHealthQueryResult>
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDate(value: unknown, fallback: number): Date {
    if (value === undefined) return new Date(fallback)
    if (typeof value !== 'string') return new Date(Number.NaN)
    return new Date(value)
}

export function createMemoryHealthService(options: {
    repository: MemoryHealthRepository
    appId: string
    now(): number
}): MemoryHealthService {
    return {
        async query(input: unknown = {}) {
            const now = options.now()
            const params = isRecord(input) ? input : {}
            const from = parseDate(params.from, now - DEFAULT_RANGE_MS)
            const to = parseDate(params.to, now)

            if (!Number.isFinite(from.getTime())) {
                return { ok: false, code: 'INVALID_DATE', field: 'from' }
            }
            if (!Number.isFinite(to.getTime())) {
                return { ok: false, code: 'INVALID_DATE', field: 'to' }
            }
            if (from.getTime() >= to.getTime()) {
                return { ok: false, code: 'INVALID_TIME_RANGE' }
            }
            if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
                return { ok: false, code: 'TIME_RANGE_TOO_LARGE' }
            }

            try {
                const snapshots = await options.repository
                    .queryLatestViewMemorySnapshots({
                        appId: options.appId,
                        from,
                        to,
                    })

                return {
                    ok: true,
                    value: evaluateMemoryHealth(snapshots),
                }
            } catch (cause) {
                return {
                    ok: false,
                    code: 'STORAGE_UNAVAILABLE',
                    cause,
                }
            }
        },
    }
}
