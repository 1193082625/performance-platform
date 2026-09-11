import {
    WEB_VITAL_THRESHOLDS,
    type AlertEvaluationResponse,
    type MetricDefinition,
    type WebVitalAlertEvent,
} from '@performance-platform/protocol'
import type {
    ClsDiagnosticRepository,
    InpDiagnosticRepository,
    LcpDiagnosticRepository,
    MetricQueryRepository,
} from '../repositories/event-repository.js'
import { evaluateClsDiagnosticRules } from './cls-diagnostic-rules.js'
import { evaluateInpDiagnosticRules } from './inp-diagnostic-rules.js'
import { evaluateLcpDiagnosticRules } from './lcp-diagnostic-rules.js'

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1_000
const MAX_RANGE_MS = 30 * DEFAULT_RANGE_MS
const MIN_SAMPLE_COUNT = 10

type AlertEvaluationResult =
    | { ok: true; value: AlertEvaluationResponse }
    | { ok: false; code: 'INVALID_DATE'; field: 'from' | 'to' }
    | { ok: false; code: 'INVALID_TIME_RANGE' }
    | { ok: false; code: 'TIME_RANGE_TOO_LARGE' }
    | { ok: false; code: 'STORAGE_UNAVAILABLE'; cause: unknown }

export interface AlertEvaluationService {
    evaluate(input: unknown): Promise<AlertEvaluationResult>
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDate(value: unknown, fallback: number): Date {
    if (value === undefined) return new Date(fallback)
    return typeof value === 'string' ? new Date(value) : new Date(Number.NaN)
}

const METRICS = {
    lcp: { type: 'web.vital.lcp', unit: 'ms', metricVersion: 'lcp-v1' },
    cls: { type: 'web.vital.cls', unit: 'score', metricVersion: 'cls-v1' },
    inp: { type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1' },
} as const satisfies Record<string, MetricDefinition>

export function createAlertEvaluationService(options: {
    metricRepository: MetricQueryRepository
    lcpDiagnosticRepository: LcpDiagnosticRepository
    clsDiagnosticRepository: ClsDiagnosticRepository
    inpDiagnosticRepository: InpDiagnosticRepository
    appId: string
    now(): number
}): AlertEvaluationService {
    return {
        async evaluate(input: unknown): Promise<AlertEvaluationResult> {
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
                const metricInput = { appId: options.appId, from, to, interval: 'hour' as const }
                const [lcp, cls, inp, lcpDiagnostic, clsDiagnostic, inpDiagnostic] =
                    await Promise.all([
                        options.metricRepository.queryMetric({ ...metricInput, metric: METRICS.lcp }),
                        options.metricRepository.queryMetric({ ...metricInput, metric: METRICS.cls }),
                        options.metricRepository.queryMetric({ ...metricInput, metric: METRICS.inp }),
                        options.lcpDiagnosticRepository.queryLcpDiagnostics(metricInput),
                        options.clsDiagnosticRepository.queryClsDiagnostics(metricInput),
                        options.inpDiagnosticRepository.queryInpDiagnostics(metricInput),
                    ])

                const range = { from: from.toISOString(), to: to.toISOString() }
                const observedAt = new Date(now).toISOString()
                const events: WebVitalAlertEvent[] = []
                const append = (
                    key: 'lcp' | 'cls' | 'inp',
                    metricResult: typeof lcp,
                    diagnostic: typeof lcpDiagnostic | typeof clsDiagnostic | typeof inpDiagnostic,
                    diagnosticFindings: WebVitalAlertEvent['diagnosticFindings'],
                ) => {
                    const value = metricResult.summary.p75
                    const threshold = WEB_VITAL_THRESHOLDS[METRICS[key].type].good
                    if (
                        value === null ||
                        metricResult.summary.count < MIN_SAMPLE_COUNT ||
                        value <= threshold
                    ) return

                    const ruleId = `web-vital.${key}-p75` as WebVitalAlertEvent['ruleId']
                    events.push({
                        schemaVersion: '1.0',
                        alertId: `${options.appId}:${ruleId}:${range.from}:${range.to}`,
                        status: 'triggered',
                        ruleId,
                        ruleVersion: '1',
                        application: { id: options.appId },
                        range,
                        observedAt,
                        metric: {
                            ...METRICS[key],
                            statistic: 'p75',
                            value,
                            threshold,
                            operator: 'gt',
                        },
                        evidence: {
                            sampleCount: metricResult.summary.count,
                            diagnosticSampleCount: diagnostic.sampleCount,
                            diagnosticEvidenceSampleCount: diagnostic.evidenceSampleCount,
                        },
                        diagnosticFindings,
                    } as WebVitalAlertEvent)
                }

                append('lcp', lcp, lcpDiagnostic, evaluateLcpDiagnosticRules(lcpDiagnostic))
                append('cls', cls, clsDiagnostic, evaluateClsDiagnosticRules(clsDiagnostic))
                append('inp', inp, inpDiagnostic, evaluateInpDiagnosticRules(inpDiagnostic))

                return { ok: true, value: { range, evaluatedAt: observedAt, events } }
            } catch (cause) {
                return { ok: false, code: 'STORAGE_UNAVAILABLE', cause }
            }
        },
    }
}
