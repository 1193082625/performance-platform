import { describe, expect, it } from 'vitest'

import type {
    LcpDiagnosticAnalysisResponse,
    LcpDiagnosticFinding,
    LcpDiagnosticResponse,
} from './types'

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
            findings: [
                {
                    ruleId: 'lcp.late-resource-discovery',
                    ruleVersion: '1',
                    phase: 'resourceLoadDelay',
                    evidence: {
                        overallP75: 2_900,
                        phaseAverage: 280,
                        contribution: 0.14,
                        targetShare: 0.1,
                        sampleCount: 120,
                        evidenceSampleCount: 100,
                    },
                },
            ],
        } satisfies LcpDiagnosticAnalysisResponse

        expect(response.sampleCount).toBe(120)
        expect(response.evidenceSampleCount).toBe(100)
        expect(response.phases.timeToFirstByte.p75).toBe(850)
        expect(response.findings).toHaveLength(1)
        expect(response.findings[0]?.ruleVersion).toBe('1')
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

    it('describes a versioned LCP diagnostic finding', () => {
        const finding = {
            ruleId: 'lcp.late-resource-discovery',
            ruleVersion: '1',
            phase: 'resourceLoadDelay',
            evidence: {
                overallP75: 3_200,
                phaseAverage: 600,
                contribution: 0.2,
                targetShare: 0.1,
                sampleCount: 100,
                evidenceSampleCount: 80,
            },
        } satisfies LcpDiagnosticFinding

        expect(finding.ruleId).toBe('lcp.late-resource-discovery')
        expect(finding.ruleVersion).toBe('1')
        expect(finding.evidence.contribution).toBe(0.2)
    })
})
