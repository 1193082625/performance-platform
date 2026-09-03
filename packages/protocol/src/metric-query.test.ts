import {
    describe,
    expect,
    it,
} from 'vitest'

import type {
    MetricDefinition,
    MetricQueryParams,
    MetricQueryResponse,
} from './index.js'

describe('generic metric query type contract', () => {
    it('accepts a valid LCP query and response', () => {
        const query = {
            type: 'web.vital.lcp',
            interval: 'hour',
        } satisfies MetricQueryParams

        const response = {
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },

            range: {
                from: '2026-09-02T00:00:00.000Z',
                to: '2026-09-03T00:00:00.000Z',
                interval: 'hour',
            },

            summary: {
                count: 1,
                average: 128,
                p50: 128,
                p75: 128,
                p90: 128,
            },

            series: [],
        } satisfies MetricQueryResponse

        expect(query.type).toBe('web.vital.lcp')
        expect(response.metric.unit).toBe('ms')
    })

    it('requires a metric type', () => {
        // @ts-expect-error metric type is required
        const query: MetricQueryParams = {}

        expect(query).toEqual({})
    })

    it('rejects milliseconds as the CLS unit', () => {
        // @ts-expect-error CLS must use score
        const metric: MetricDefinition = {
            type: 'web.vital.cls',
            unit: 'ms',
            metricVersion: 'cls-v1',
        }

        expect(metric.type).toBe('web.vital.cls')
    })
})