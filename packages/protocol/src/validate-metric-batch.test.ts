import { describe, it, expect } from 'vitest'
import type {
    MetricEventV2,
    MetricEventValidationContext,
} from './types'

import {
    validateMetricBatch,
} from './validate'

const NOW = Date.UTC(2026, 8, 2, 10, 0, 0)

const validationContext: MetricEventValidationContext = {
    expectedAppId: 'demo-web',
    now: NOW
}

function makeMetricEvent(): MetricEventV2 {
    return {
        schemaVersion: '2.0',
        eventId: '075f9a46-f934-45e3-b355-e20490e90bb4',
        type: 'web.vital.lcp',
        timestamp: NOW - 1_000,
        sampleRate: 0.5,
        metricVersion: 'lcp-v1',

        application: {
            id: 'demo-web',
            version: '0.2.0',
            environment: 'test',
        },

        runtime: {
            platform: 'web',
            sdk: {
                name: '@performance-platform/browser',
                version: '0.2.0',
            },
        },

        session: {
            sessionId: 'session-test-1',
            viewId: 'view-test-1',
        },

        payload: {
            value: 1_800,
            unit: 'ms',
        },
    }
}

describe('validateMetricBatch', () => {
    it('accepts a batch of valid metric events', () => {
        const event = makeMetricEvent()
    
        expect(
            validateMetricBatch(
                {
                    events: [event],
                },
                validationContext,
            ),
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [event],
                discarded: 0,
                reasons: {},
            },
        })
    })

    it.each([
        null,
        {},
        [],
        {
            events: null,
        },
        {
            events: {},
        },
        {
            events: [],
        },
    ])('rejects invalid batch %#', (input) => {
        expect(
            validateMetricBatch(input, validationContext),
        ).toEqual({
            ok: false,
            code: 'INVALID_BATCH',
        })
    })

    it('rejects a batch larger than 20 events', () => {
        const events = Array.from(
            {
                length: 21,
            },
            () => makeMetricEvent(),
        )
    
        expect(
            validateMetricBatch(
                {
                    events,
                },
                validationContext,
            ),
        ).toEqual({
            ok: false,
            code: 'BATCH_TOO_LARGE',
        })
    })

    it('accepts valid events and counts discarded events', () => {
        const validEvent = makeMetricEvent()
    
        const invalidEvent = {
            ...makeMetricEvent(),
            sampleRate: 0,
        }
    
        expect(
            validateMetricBatch(
                {
                    events: [
                        validEvent,
                        invalidEvent,
                    ],
                },
                validationContext,
            ),
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [validEvent],
                discarded: 1,
                reasons: {
                    invalid_sample_rate: 1,
                },
            },
        })
    })

    it('returns a successful batch result when all events are discarded', () => {
        const invalidSampleRateEvent = {
            ...makeMetricEvent(),
            sampleRate: 0,
        }
    
        const invalidMetricVersionEvent = {
            ...makeMetricEvent(),
            metricVersion: 'cls-v1',
        }
    
        expect(
            validateMetricBatch(
                {
                    events: [
                        invalidSampleRateEvent,
                        invalidMetricVersionEvent,
                    ],
                },
                validationContext,
            ),
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [],
                discarded: 2,
                reasons: {
                    invalid_sample_rate: 1,
                    invalid_metric_version: 1,
                },
            },
        })
    })

    it('counts repeated discard reasons', () => {
        const firstInvalidEvent = {
            ...makeMetricEvent(),
            sampleRate: 0,
        }
    
        const secondInvalidEvent = {
            ...makeMetricEvent(),
            sampleRate: 2,
        }
    
        expect(
            validateMetricBatch(
                {
                    events: [
                        firstInvalidEvent,
                        secondInvalidEvent,
                    ],
                },
                validationContext,
            ),
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [],
                discarded: 2,
                reasons: {
                    invalid_sample_rate: 2,
                },
            },
        })
    })

    it('accepts a batch containing exactly 20 events', () => {
        const events = Array.from(
            {
                length: 20,
            },
            () => makeMetricEvent(),
        )
    
        expect(
            validateMetricBatch(
                {
                    events,
                },
                validationContext,
            ),
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: events,
                discarded: 0,
                reasons: {},
            },
        })
    })
})
