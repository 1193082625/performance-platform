import { describe, expect, it, vi } from 'vitest'
import { createAlertEvaluationService } from './alert-evaluation-service.js'

const FROM = '2026-09-09T00:00:00.000Z'
const TO = '2026-09-10T00:00:00.000Z'

function metric(type: 'lcp' | 'cls' | 'inp', p75: number, count = 20) {
    const definitions = {
        lcp: { type: 'web.vital.lcp', unit: 'ms', metricVersion: 'lcp-v1' },
        cls: { type: 'web.vital.cls', unit: 'score', metricVersion: 'cls-v1' },
        inp: { type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1' },
    } as const
    return {
        metric: definitions[type],
        range: { from: FROM, to: TO, interval: 'hour' as const },
        summary: { count, average: p75, p50: p75, p75, p90: p75 },
        series: [],
    }
}

function setup() {
    const lcpDiagnostic = {
        metric: metric('lcp', 3_200).metric,
        range: { from: FROM, to: TO }, sampleCount: 20, evidenceSampleCount: 20,
        overall: { average: 3_000, p75: 3_200 },
        phases: {
            timeToFirstByte: { average: 500, p75: 500 },
            resourceLoadDelay: { average: 1_000, p75: 1_000 },
            resourceLoadDuration: { average: 1_000, p75: 1_000 },
            elementRenderDelay: { average: 500, p75: 500 },
        },
    }
    const clsDiagnostic = {
        metric: metric('cls', 0.08).metric,
        range: { from: FROM, to: TO }, sampleCount: 20, evidenceSampleCount: 20,
        overall: { average: 0.08, p75: 0.08 }, largestShift: { average: 0.04, p75: 0.04 },
        loadStates: { loading: 5, domInteractive: 5, domContentLoaded: 5, complete: 5 },
        dominantTarget: null,
    }
    const inpDiagnostic = {
        metric: metric('inp', 180).metric,
        range: { from: FROM, to: TO }, sampleCount: 20, evidenceSampleCount: 20,
        overall: { average: 180, p75: 180 },
        phases: {
            inputDelay: { average: 40, p75: 40 },
            processingDuration: { average: 100, p75: 100 },
            presentationDelay: { average: 40, p75: 40 },
        },
        dominantTarget: null,
    }
    const metricRepository = {
        queryMetric: vi.fn()
            .mockResolvedValueOnce(metric('lcp', 3_200))
            .mockResolvedValueOnce(metric('cls', 0.08))
            .mockResolvedValueOnce(metric('inp', 180)),
    }
    return {
        metricRepository,
        service: createAlertEvaluationService({
            metricRepository,
            lcpDiagnosticRepository: { queryLcpDiagnostics: vi.fn().mockResolvedValue(lcpDiagnostic) },
            clsDiagnosticRepository: { queryClsDiagnostics: vi.fn().mockResolvedValue(clsDiagnostic) },
            inpDiagnosticRepository: { queryInpDiagnostics: vi.fn().mockResolvedValue(inpDiagnostic) },
            appId: 'demo-web',
            now: () => Date.parse(TO),
        }),
    }
}

describe('AlertEvaluationService', () => {
    it('creates an alert event with precise diagnostics for an abnormal metric', async () => {
        const { service } = setup()
        const result = await service.evaluate({ from: FROM, to: TO })
        expect(result).toMatchObject({
            ok: true,
            value: {
                events: [{
                    status: 'triggered',
                    ruleId: 'web-vital.lcp-p75',
                    ruleVersion: '1',
                    metric: { value: 3_200, threshold: 2_500, operator: 'gt' },
                    evidence: {
                        sampleCount: 20,
                        diagnosticSampleCount: 20,
                        diagnosticEvidenceSampleCount: 20,
                    },
                    diagnosticFindings: expect.arrayContaining([expect.objectContaining({
                        ruleId: 'lcp.late-resource-discovery',
                    })]),
                }],
            },
        })
    })

    it('does not alert on healthy or insufficient metrics', async () => {
        const { metricRepository, service } = setup()
        metricRepository.queryMetric.mockReset()
            .mockResolvedValueOnce(metric('lcp', 3_200, 9))
            .mockResolvedValueOnce(metric('cls', 0.1))
            .mockResolvedValueOnce(metric('inp', 200))
        await expect(service.evaluate({ from: FROM, to: TO })).resolves.toMatchObject({
            ok: true,
            value: { events: [] },
        })
    })

    it.each([
        [{ from: 'bad', to: TO }, 'INVALID_DATE'],
        [{ from: TO, to: FROM }, 'INVALID_TIME_RANGE'],
        [{ from: '2026-07-01T00:00:00.000Z', to: TO }, 'TIME_RANGE_TOO_LARGE'],
    ] as const)('validates the evaluation range', async (input, code) => {
        await expect(setup().service.evaluate(input)).resolves.toMatchObject({ ok: false, code })
    })

    it('maps repository failures to storage unavailable', async () => {
        const { metricRepository, service } = setup()
        metricRepository.queryMetric.mockReset().mockRejectedValue(new Error('offline'))
        await expect(service.evaluate({ from: FROM, to: TO })).resolves.toMatchObject({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
        })
    })
})
