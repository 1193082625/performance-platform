import {
    describe,
    it,
    expect
} from 'vitest'

import type {
    MetricSample
} from './types/metricSample.type.js'

import type {
    MetricEventContext
} from './types/paintMonitor.type'

import {
    createMetricEvent
} from './metric-event'

const sample = {
    type: 'web.vital.lcp',
    occurredAt: 1_002_300,
    metricVersion: 'lcp-v1',
    payload: {
        value: 2300,
        unit: 'ms',
    }
} satisfies MetricSample

const context: MetricEventContext = {
    eventId: '075f9a46-f934-45e3-b355-e20490e90bb4',
    appId: 'demo-web',
    appVersion: '0.2.0+test',
    environment: 'test',
    sessionId: 'session-test-1',
    viewId: 'view-test-1',
    sampleRate: 0.5,
}

describe('createMetricEvent', () => {
    it('combines an LCP sample with shared V2 context', () => {
        const event = createMetricEvent(sample, context)

        expect(event).toEqual({
            schemaVersion: '2.0',
            eventId: context.eventId,
            type: 'web.vital.lcp',
            timestamp: 1_002_300,

            sampleRate: 0.5,
            metricVersion: 'lcp-v1',

            application: {
                id: 'demo-web',
                version: '0.2.0+test',
                environment: 'test',
            },

            runtime: {
                platform: 'web',

                sdk: {
                    name:
                        '@performance-platform/browser',

                    version:
                        '0.1.0',
                },
            },

            session: {
                sessionId:
                    'session-test-1',

                viewId:
                    'view-test-1',
            },

            payload: {
                value: 2300,
                unit: 'ms',
            },
        })
    })

    it('combines a paint sample with shared V2 context', () => {
        const event = createMetricEvent(
            {
                type: 'web.paint.fcp',
                occurredAt: 1_000_260,
                metricVersion: 'paint-v1',
    
                payload: {
                    value: 260,
                    unit: 'ms',
                },
            },
            context,
        )
    
        expect(event).toMatchObject({
            schemaVersion: '2.0',
            type: 'web.paint.fcp',
            timestamp: 1_000_260,
            sampleRate: 0.5,
            metricVersion: 'paint-v1',
    
            payload: {
                value: 260,
                unit: 'ms',
            },
        })
    })
})