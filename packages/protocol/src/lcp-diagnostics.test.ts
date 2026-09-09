import { describe, expect, it } from 'vitest'

import type { LcpDiagnosticResponse } from './types'

describe('LcpDiagnosticResponse', () => {
    it('describes aggregated LCP phase evidence', () => {
        const response = {
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
            range: {
                from: '2026-09-01T00:00:00.000Z',
                to: '2026-09-02T00:00:00.000Z',
            },
            sampleCount: 120,
            evidenceSampleCount: 100,
            overall: {
                average: 2_000,
                p75: 2_400,
            },
            phases: {
                timeToFirstByte: {
                    average: 720,
                    p75: 850,
                },
                resourceLoadDelay: {
                    average: 280,
                    p75: 350,
                },
                resourceLoadDuration: {
                    average: 640,
                    p75: 780,
                },
                elementRenderDelay: {
                    average: 360,
                    p75: 420,
                },
            },
        } satisfies LcpDiagnosticResponse

        expect(response.sampleCount).toBe(120)
        expect(response.evidenceSampleCount).toBe(100)
        expect(response.phases.timeToFirstByte.p75).toBe(850)
    })

    it('represents an empty diagnostic result', () => {
        const emptyResponse = {
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
            range: {
                from: '2026-09-01T00:00:00.000Z',
                to: '2026-09-02T00:00:00.000Z',
            },
            sampleCount: 0,
            evidenceSampleCount: 0,
            overall: {
                average: null,
                p75: null,
            },
            phases: {
                timeToFirstByte: {
                    average: null,
                    p75: null,
                },
                resourceLoadDelay: {
                    average: null,
                    p75: null,
                },
                resourceLoadDuration: {
                    average: null,
                    p75: null,
                },
                elementRenderDelay: {
                    average: null,
                    p75: null,
                },
            },
        } satisfies LcpDiagnosticResponse

        expect(emptyResponse.phases.resourceLoadDuration.p75).toBeNull()
    })
})
