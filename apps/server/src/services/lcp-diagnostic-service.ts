import type { LcpDiagnosticAnalysisResponse } from '@performance-platform/protocol'
import type { LcpDiagnosticRepository } from '../repositories/event-repository.js'
import { evaluateLcpDiagnosticRules } from './lcp-diagnostic-rules.js'

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_MS = 30 * 24 * 60 * 60 * 1_000

interface LcpDiagnosticServiceOptions {
    repository: LcpDiagnosticRepository
    appId: string
    now(): number
}

type LcpDiagnosticQueryResult =
    | {
      ok: true
          value: LcpDiagnosticAnalysisResponse
      }
    | {
          ok: false
          code: 'INVALID_DATE'
          field: 'from' | 'to'
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

export interface LcpDiagnosticService {
    query(input: unknown): Promise<LcpDiagnosticQueryResult>
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDate(value: unknown, fallback: number): Date {
    // 参数缺省 → 使用默认时间
    if (value === undefined) {
        return new Date(fallback)
    }

    // 参数存在但类型错误 → Invalid Date
    if (typeof value !== 'string') {
        return new Date(Number.NaN)
    }

    return new Date(value)
}

export function createLcpDiagnosticService(
    options: LcpDiagnosticServiceOptions,
): LcpDiagnosticService {
    return {
        async query(input: unknown): Promise<LcpDiagnosticQueryResult> {
            const params = isRecord(input) ? input : {}

            const now = options.now()

            const from = parseDate(params.from, now - DEFAULT_RANGE_MS)

            const to = parseDate(params.to, now)

            if (!Number.isFinite(from.getTime())) {
                return {
                    ok: false,
                    code: 'INVALID_DATE',
                    field: 'from',
                }
            }

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
                    code: 'INVALID_TIME_RANGE',
                }
            }

            if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
                return {
                    ok: false,
                    code: 'TIME_RANGE_TOO_LARGE',
                }
            }

            try {
                const diagnostic = await options.repository.queryLcpDiagnostics({
                    appId: options.appId,
                    from,
                    to,
                })
                return {
                    ok: true,
                    value: {
                        ...diagnostic,
                        findings: evaluateLcpDiagnosticRules(diagnostic),
                    },
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
