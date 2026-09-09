import type { LcpDiagnosticResponse } from '@performance-platform/protocol'
import { describe, expect, it } from 'vitest'
import { evaluateLcpDiagnosticRules } from './lcp-diagnostic-rules.js'

const DIAGNOSTIC: LcpDiagnosticResponse = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 100,
    evidenceSampleCount: 80,
    overall: {
        average: 3_000,
        p75: 3_200,
    },
    phases: {
        timeToFirstByte: {
            average: 900,
            p75: 1_000,
        },
        resourceLoadDelay: {
            average: 600,
            p75: 700,
        },
        resourceLoadDuration: {
            average: 1_200,
            p75: 1_200,
        },
        elementRenderDelay: {
            average: 300,
            p75: 500,
        },
    },
}

describe('evaluateLcpDiagnosticRules', () => {
    it('reports late LCP resource discovery', () => {
        expect(evaluateLcpDiagnosticRules(DIAGNOSTIC)).toEqual([
            {
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
            },
        ])
    })

    it.each([
        {
            ruleId: 'lcp.slow-server-response',
            phase: 'timeToFirstByte',
            phases: {
                timeToFirstByte: { average: 1_500, p75: 1_600 },
                resourceLoadDelay: { average: 300, p75: 350 },
                resourceLoadDuration: { average: 900, p75: 1_000 },
                elementRenderDelay: { average: 300, p75: 350 },
            },
        },
        {
            ruleId: 'lcp.slow-resource-load',
            phase: 'resourceLoadDuration',
            phases: {
                timeToFirstByte: { average: 900, p75: 1_000 },
                resourceLoadDelay: { average: 300, p75: 350 },
                resourceLoadDuration: { average: 1_500, p75: 1_600 },
                elementRenderDelay: { average: 300, p75: 350 },
            },
        },
        {
            ruleId: 'lcp.slow-element-render',
            phase: 'elementRenderDelay',
            phases: {
                timeToFirstByte: { average: 900, p75: 1_000 },
                resourceLoadDelay: { average: 300, p75: 350 },
                resourceLoadDuration: { average: 900, p75: 1_000 },
                elementRenderDelay: { average: 900, p75: 950 },
            },
        },
    ] as const)('reports $ruleId', ({ ruleId, phase, phases }) => {
        expect(
            evaluateLcpDiagnosticRules({
                ...DIAGNOSTIC,
                phases,
            }),
        ).toEqual([
            expect.objectContaining({
                ruleId,
                ruleVersion: '1',
                phase,
            }),
        ])
    })

    it('does not report a phase problem when overall LCP is good', () => {
        expect(
            evaluateLcpDiagnosticRules({
                ...DIAGNOSTIC,
                overall: {
                    average: 2_000,
                    p75: 2_400,
                },
            }),
        ).toEqual([])
    })

    it.each([
        {
            name: 'fewer than 10 evidence samples',
            sampleCount: 100,
            evidenceSampleCount: 9,
        },
        {
            name: 'less than 50% evidence coverage',
            sampleCount: 100,
            evidenceSampleCount: 49,
        },
    ])(
        'does not diagnose with $name',
        ({ sampleCount, evidenceSampleCount }) => {
            expect(
                evaluateLcpDiagnosticRules({
                    ...DIAGNOSTIC,
                    sampleCount,
                    evidenceSampleCount,
                }),
            ).toEqual([])
        },
    )

    it('diagnoses when evidence meets the minimum thresholds exactly', () => {
        expect(
            evaluateLcpDiagnosticRules({
                ...DIAGNOSTIC,
                sampleCount: 20,
                evidenceSampleCount: 10,
            }),
        ).toHaveLength(1)
    })

    it('does not diagnose when phase evidence is incomplete', () => {
        expect(
            evaluateLcpDiagnosticRules({
                ...DIAGNOSTIC,
                phases: {
                    ...DIAGNOSTIC.phases,
                    resourceLoadDuration: {
                        average: null,
                        p75: null,
                    },
                },
            }),
        ).toEqual([])
    })

    it('does not diagnose when total phase duration is zero', () => {
        const emptyPhase = {
            average: 0,
            p75: 0,
        }

        expect(
            evaluateLcpDiagnosticRules({
                ...DIAGNOSTIC,
                phases: {
                    timeToFirstByte: emptyPhase,
                    resourceLoadDelay: emptyPhase,
                    resourceLoadDuration: emptyPhase,
                    elementRenderDelay: emptyPhase,
                },
            }),
        ).toEqual([])
    })

    it('does not diagnose when resource load delay is exactly 10%', () => {
        expect(
            evaluateLcpDiagnosticRules({
                ...DIAGNOSTIC,
                phases: {
                    timeToFirstByte: {
                        average: 1_200,
                        p75: 1_000,
                    },
                    resourceLoadDelay: {
                        average: 300,
                        p75: 400,
                    },
                    resourceLoadDuration: {
                        average: 1_200,
                        p75: 1_200,
                    },
                    elementRenderDelay: {
                        average: 300,
                        p75: 800,
                    },
                },
            }),
        ).toEqual([])
    })
})
