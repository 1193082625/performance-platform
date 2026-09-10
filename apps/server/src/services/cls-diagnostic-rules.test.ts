import type { ClsDiagnosticResponse } from '@performance-platform/protocol'
import { describe, expect, it } from 'vitest'
import { evaluateClsDiagnosticRules } from './cls-diagnostic-rules.js'

const DIAGNOSTIC: ClsDiagnosticResponse = {
    metric: {
        type: 'web.vital.cls',
        unit: 'score',
        metricVersion: 'cls-v1',
    },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 100,
    evidenceSampleCount: 80,
    overall: { average: 0.16, p75: 0.18 },
    largestShift: { average: 0.12, p75: 0.14 },
    loadStates: {
        loading: 10,
        domInteractive: 10,
        domContentLoaded: 10,
        complete: 50,
    },
    dominantTarget: {
        selector: '.promo-banner',
        count: 32,
        share: 0.4,
    },
}

describe('evaluateClsDiagnosticRules', () => {
    it('reports a dominant late shift and repeated target', () => {
        expect(evaluateClsDiagnosticRules(DIAGNOSTIC)).toEqual([
            expect.objectContaining({
                ruleId: 'cls.late-layout-shift',
                ruleVersion: '1',
                loadPhase: 'complete',
            }),
            expect.objectContaining({
                ruleId: 'cls.repeated-shift-target',
                ruleVersion: '1',
                target: '.promo-banner',
            }),
        ])
    })

    it('reports shifts dominated by the loading lifecycle', () => {
        expect(evaluateClsDiagnosticRules({
            ...DIAGNOSTIC,
            loadStates: {
                loading: 30,
                domInteractive: 20,
                domContentLoaded: 10,
                complete: 20,
            },
            dominantTarget: null,
        })).toEqual([
            expect.objectContaining({
                ruleId: 'cls.early-load-shift',
                loadPhase: 'early',
            }),
        ])
    })

    it.each([
        {
            name: 'good CLS',
            value: { ...DIAGNOSTIC, overall: { average: 0.08, p75: 0.1 } },
        },
        {
            name: 'fewer than 10 evidence samples',
            value: { ...DIAGNOSTIC, evidenceSampleCount: 9 },
        },
        {
            name: 'less than 50% evidence coverage',
            value: { ...DIAGNOSTIC, evidenceSampleCount: 49 },
        },
    ])('does not diagnose with $name', ({ value }) => {
        expect(evaluateClsDiagnosticRules(value)).toEqual([])
    })

    it('does not choose a load phase when evidence is tied', () => {
        expect(evaluateClsDiagnosticRules({
            ...DIAGNOSTIC,
            loadStates: {
                loading: 20,
                domInteractive: 10,
                domContentLoaded: 10,
                complete: 40,
            },
            dominantTarget: null,
        })).toEqual([])
    })
})
