import { describe, expect, it } from 'vitest'
import type { AlertEvaluationResponse } from './types.js'

describe('WebVitalAlertEvent', () => {
    it('represents a triggered metric alert with diagnostic findings', () => {
        const response: AlertEvaluationResponse = {
            range: {
                from: '2026-09-09T00:00:00.000Z',
                to: '2026-09-10T00:00:00.000Z',
            },
            evaluatedAt: '2026-09-10T00:00:00.000Z',
            events: [{
                schemaVersion: '1.0',
                alertId: 'demo-web:web-vital.inp-p75:2026-09-10T00:00:00.000Z',
                status: 'triggered',
                ruleId: 'web-vital.inp-p75',
                ruleVersion: '1',
                application: { id: 'demo-web' },
                range: {
                    from: '2026-09-09T00:00:00.000Z',
                    to: '2026-09-10T00:00:00.000Z',
                },
                observedAt: '2026-09-10T00:00:00.000Z',
                metric: {
                    type: 'web.vital.inp',
                    unit: 'ms',
                    metricVersion: 'inp-v1',
                    statistic: 'p75',
                    value: 280,
                    threshold: 200,
                    operator: 'gt',
                },
                evidence: {
                    sampleCount: 20,
                    diagnosticSampleCount: 20,
                    diagnosticEvidenceSampleCount: 18,
                },
                diagnosticFindings: [],
            }],
        }

        expect(response.events[0]?.status).toBe('triggered')
    })
})
