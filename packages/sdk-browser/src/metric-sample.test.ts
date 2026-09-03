import {
    describe,
    expect,
    it,
} from 'vitest'

import type {
    MetricSample
} from './types/metricSample.type.js'

describe('MetricSample type contract', () => {
    it('accepts valid paint and LCP samples', () => {
        const samples = [
            {
                type: 'web.paint.fcp',
                occurredAt: 1_000_260,
                metricVersion: 'paint-v1',

                payload: {
                    value: 260,
                    unit: 'ms',
                }
            },
            {
                type: 'web.vital.lcp',
                occurredAt: 1_002_300,
                metricVersion: 'lcp-v1',
                payload: {
                    value: 2300,
                    unit: 'ms',
                }
            }
        ] satisfies MetricSample[]

        expect(samples).toHaveLength(2)
    })

    it('rejects score as the LCP unit', () => {
        // @ts-expect-error LCP must use milliseconds
        const sample: MetricSample = {
            type: 'web.vital.lcp',
            occurredAt: 1_002_300,
            metricVersion: 'lcp-v1',
            payload: {
                value: 2300,
                unit: 'score',
            },
        }

        expect(sample.payload.unit).toBe(
            'score',
        )
    })

    it('rejects the paint algorithm for LCP', () => {
        // @ts-expect-error LCP must use lcp-v1
        const sample: MetricSample = {
            type: 'web.vital.lcp',
            occurredAt: 1_002_300,
            metricVersion: 'paint-v1',
            payload: {
                value: 2300,
                unit: 'ms',
            },
        }

        expect(sample.metricVersion).toBe(
            'paint-v1',
        )
    })
})