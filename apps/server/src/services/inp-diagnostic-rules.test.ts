import type { InpDiagnosticResponse } from '@performance-platform/protocol'
import { describe, expect, it } from 'vitest'
import { evaluateInpDiagnosticRules } from './inp-diagnostic-rules.js'

const DIAGNOSTIC: InpDiagnosticResponse = {
    metric: { type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1' },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 100,
    evidenceSampleCount: 80,
    overall: { average: 260, p75: 280 },
    phases: {
        inputDelay: { average: 40, p75: 50 },
        processingDuration: { average: 140, p75: 160 },
        presentationDelay: { average: 80, p75: 90 },
    },
    dominantTarget: { selector: '#checkout', count: 32, share: 0.4 },
}

describe('evaluateInpDiagnosticRules', () => {
    it('reports the dominant phase and a repeated interaction target', () => {
        expect(evaluateInpDiagnosticRules(DIAGNOSTIC)).toEqual([
            {
                ruleId: 'inp.slow-event-handler',
                ruleVersion: '1',
                phase: 'processingDuration',
                evidence: {
                    overallP75: 280,
                    phaseAverage: 140,
                    contribution: 140 / 260,
                    sampleCount: 100,
                    evidenceSampleCount: 80,
                },
            },
            expect.objectContaining({
                ruleId: 'inp.repeated-interaction-target',
                target: '#checkout',
            }),
        ])
    })

    it.each([
        ['input delay', 'inp.high-input-delay', {
            inputDelay: { average: 160, p75: 170 },
            processingDuration: { average: 60, p75: 70 },
            presentationDelay: { average: 40, p75: 50 },
        }],
        ['presentation delay', 'inp.high-presentation-delay', {
            inputDelay: { average: 40, p75: 50 },
            processingDuration: { average: 60, p75: 70 },
            presentationDelay: { average: 160, p75: 170 },
        }],
    ] as const)('reports dominant $0', (_name, ruleId, phases) => {
        expect(evaluateInpDiagnosticRules({
            ...DIAGNOSTIC,
            phases,
            dominantTarget: null,
        })).toEqual([expect.objectContaining({ ruleId })])
    })

    it.each([
        ['good INP', { ...DIAGNOSTIC, overall: { average: 180, p75: 200 } }],
        ['fewer than 10 evidence samples', { ...DIAGNOSTIC, evidenceSampleCount: 9 }],
        ['less than 50% evidence coverage', { ...DIAGNOSTIC, evidenceSampleCount: 49 }],
        ['incomplete phase evidence', {
            ...DIAGNOSTIC,
            phases: {
                ...DIAGNOSTIC.phases,
                inputDelay: { average: null, p75: null },
            },
        }],
        ['zero phase duration', {
            ...DIAGNOSTIC,
            phases: {
                inputDelay: { average: 0, p75: 0 },
                processingDuration: { average: 0, p75: 0 },
                presentationDelay: { average: 0, p75: 0 },
            },
        }],
    ] as const)('does not diagnose with %s', (_name, diagnostic) => {
        expect(evaluateInpDiagnosticRules(diagnostic)).toEqual([])
    })

    it('does not report a target below its evidence threshold', () => {
        expect(evaluateInpDiagnosticRules({
            ...DIAGNOSTIC,
            dominantTarget: { selector: '#checkout', count: 9, share: 0.4 },
        })).toHaveLength(1)
    })
})
