import type {
    ClsDiagnosticAnalysisResponse,
} from '@performance-platform/protocol'
import type {
    ClsDiagnosticRepository,
} from '../repositories/event-repository.js'
import { evaluateClsDiagnosticRules } from './cls-diagnostic-rules.js'

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1_000
const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000

type QueryResult =
    | { ok: true; value: ClsDiagnosticAnalysisResponse }
    | { ok: false; code: 'INVALID_DATE'; field: 'from' | 'to' }
    | { ok: false; code: 'INVALID_TIME_RANGE' }
    | { ok: false; code: 'TIME_RANGE_TOO_LARGE' }
    | { ok: false; code: 'STORAGE_UNAVAILABLE'; cause: unknown }

export interface ClsDiagnosticService {
    query(input: unknown): Promise<QueryResult>
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDate(value: unknown, fallback: number): Date {
    if (value === undefined) return new Date(fallback)
    return typeof value === 'string'
        ? new Date(value)
        : new Date(Number.NaN)
}

export function createClsDiagnosticService(options: {
    repository: ClsDiagnosticRepository
    projectId?: string
    appId: string
    now(): number
}): ClsDiagnosticService {
    return {
        async query(input: unknown): Promise<QueryResult> {
            const params = isRecord(input) ? input : {}
            const now = options.now()
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
                const diagnostic = await options.repository.queryClsDiagnostics({
                    ...(options.projectId === undefined
                        ? {}
                        : { projectId: options.projectId }),
                    appId: options.appId,
                    from,
                    to,
                })
                return {
                    ok: true,
                    value: {
                        ...diagnostic,
                        findings: evaluateClsDiagnosticRules(diagnostic),
                    },
                }
            } catch (cause) {
                return { ok: false, code: 'STORAGE_UNAVAILABLE', cause }
            }
        },
    }
}
