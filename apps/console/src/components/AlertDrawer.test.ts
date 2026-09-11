import type { AlertEvaluationResponse } from '@performance-platform/protocol'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '../i18n.js'
import AlertDrawer from './AlertDrawer.vue'

const EVALUATION: AlertEvaluationResponse = {
    range: { from: '2026-09-10T00:00:00.000Z', to: '2026-09-11T00:00:00.000Z' },
    evaluatedAt: '2026-09-11T00:00:00.000Z',
    events: [{
        schemaVersion: '1.0',
        alertId: 'alert-inp',
        status: 'triggered',
        ruleId: 'web-vital.inp-p75',
        ruleVersion: '1',
        application: { id: 'demo-web' },
        range: { from: '2026-09-10T00:00:00.000Z', to: '2026-09-11T00:00:00.000Z' },
        observedAt: '2026-09-11T00:00:00.000Z',
        metric: {
            type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1',
            statistic: 'p75', value: 520, threshold: 200, operator: 'gt',
        },
        evidence: {
            sampleCount: 100,
            diagnosticSampleCount: 100,
            diagnosticEvidenceSampleCount: 80,
        },
        diagnosticFindings: [{
            ruleId: 'inp.slow-event-handler',
            ruleVersion: '1',
            phase: 'processingDuration',
            evidence: {
                overallP75: 520, phaseAverage: 300, contribution: 0.6,
                sampleCount: 100, evidenceSampleCount: 80,
            },
        }],
    }],
}

describe('AlertDrawer', () => {
    it('shows alert summary and expandable diagnostic advice', async () => {
        const wrapper = mount(AlertDrawer, {
            props: { open: true, loading: false, error: null, evaluation: EVALUATION },
            global: { plugins: [i18n] },
        })
        expect(wrapper.get('[role="dialog"]').text()).toContain('INP')
        expect(wrapper.get('[role="dialog"]').text()).toContain('520 ms')
        await wrapper.get('.alert-card summary').trigger('click')
        expect(wrapper.get('.alert-card__findings').text()).toContain(
            'Simplify event handlers and defer non-essential synchronous work.',
        )
    })

    it('closes on Escape', async () => {
        const wrapper = mount(AlertDrawer, {
            props: { open: true, loading: false, error: null, evaluation: EVALUATION },
            global: { plugins: [i18n] },
        })
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(wrapper.emitted('close')).toHaveLength(1)
    })
})
