import { describe, it, expect, } from 'vitest'
import type { MetricEventV2, MetricEventValidationContext, } from './types'
import { validateMetricEvent } from './validate'

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

describe('ValidateMetricEvent', () => {
    it.each([
        0.1,
        0.5,
        1
    ])('accepts sample rate %s', (sampleRate) => {
        const event = {
            ...makeMetricEvent(),
            sampleRate,
        }

        expect(
            validateMetricEvent(event, validationContext)
        ).toEqual({
            ok: true,
            value: event
        })
    })

    it.each([
        0,
        -0.1,
        1.1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        '0.5',
        null,
    ])('rejects invalid sample rate %s', (sampleRate) => {
        const event = {
            ...makeMetricEvent(),
            sampleRate,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_sample_rate',
        })
    })

    it.each([
        ['web.paint.fp', 'ms', 'paint-v1'],
        ['web.paint.fcp', 'ms', 'paint-v1'],
        ['web.vital.lcp', 'ms', 'lcp-v1'],
        ['web.vital.inp', 'ms', 'inp-v1'],
        ['web.vital.cls', 'score', 'cls-v1'],
        ['web.memory.used_heap', 'byte', 'memory-v1'],
        ['web.memory.total_heap', 'byte', 'memory-v1'],
        ['web.memory.heap_limit', 'byte', 'memory-v1'],
    ])(
        'accepts metric %s with unit %s and version %s',
        (type, unit, metricVersion) => {
            const base = makeMetricEvent()
    
            const event = {
                ...base,
                type,
                metricVersion,
                payload: {
                    ...base.payload,
                    unit,
                },
            }
    
            expect(
                validateMetricEvent(event, validationContext),
            ).toEqual({
                ok: true,
                value: event,
            })
        },
    )

    it.each([
        ['web.vital.lcp', 'ms', 'cls-v1'],
        ['web.vital.cls', 'score', 'lcp-v1'],
        ['web.vital.inp', 'ms', 'memory-v1'],
        ['web.memory.used_heap', 'byte', 'paint-v1'],
    ])(
        'rejects metric %s with version %s',
        (type, unit, metricVersion) => {
            const base = makeMetricEvent()
    
            const event = {
                ...base,
                type,
                metricVersion,
                payload: {
                    ...base.payload,
                    unit,
                },
            }
    
            expect(
                validateMetricEvent(event, validationContext),
            ).toEqual({
                ok: false,
                reason: 'invalid_metric_version',
            })
        },
    )

    it.each([
        '',
        '   ',
        'x'.repeat(65),
        null,
        42,
        undefined,
    ])('rejects invalid metric version %#', (metricVersion) => {
        const event = {
            ...makeMetricEvent(),
            metricVersion,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_metric_version',
        })
    })

    it.each([
        '1.0',
        '3.0',
        '',
        null,
        2,
        undefined,
    ])('rejects unsupported schema version %s', (schemaVersion) => {
        const event = {
            ...makeMetricEvent(),
            schemaVersion,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'unsupported_schema_version',
        })
    })

    it.each([
        null,
        [],
        'event',
        42,
    ])('rejects malformed event input %s', (input) => {
        expect(
            validateMetricEvent(input, validationContext),
        ).toEqual({
            ok: false,
            reason: 'unsupported_schema_version',
        })
    })

    it.each([
        '',
        'not-a-uuid',
        '075f9a46-f934-45e3-b355',
        null,
        42,
        undefined,
    ])('rejects invalid event ID %s', (eventId) => {
        const event = {
            ...makeMetricEvent(),
            eventId,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_event_id',
        })
    })

    it.each([
        ['web.paint.fp', 'ms', 'paint-v1'],
        ['web.paint.fcp', 'ms', 'paint-v1'],
        ['web.vital.lcp', 'ms', 'lcp-v1'],
        ['web.vital.inp', 'ms', 'inp-v1'],
        ['web.vital.cls', 'score', 'cls-v1'],
        ['web.memory.used_heap', 'byte', 'memory-v1'],
        ['web.memory.total_heap', 'byte', 'memory-v1'],
        ['web.memory.heap_limit', 'byte', 'memory-v1'],
    ])(
        'accepts metric %s with unit %s and version %s',
        (type, unit, metricVersion) => {
            const base = makeMetricEvent()
    
            const event = {
                ...base,
                type,
                metricVersion,
                payload: {
                    ...base.payload,
                    unit,
                },
            }
    
            expect(
                validateMetricEvent(event, validationContext),
            ).toEqual({
                ok: true,
                value: event,
            })
        },
    )

    it.each([
        'web.vital.fid',
        'web.vital.unknown',
        'web.memory',
        '',
        null,
        42,
        undefined,
    ])('rejects unsupported metric type %s', (type) => {
        const event = {
            ...makeMetricEvent(),
            type,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'unsupported_event_type',
        })
    })

    it.each([
        ['web.vital.lcp', 'score', 'lcp-v1'],
        ['web.vital.cls', 'ms', 'cls-v1'],
        ['web.vital.cls', 'byte', 'cls-v1'],
        ['web.memory.used_heap', 'ms', 'memory-v1'],
        ['web.memory.heap_limit', 'score', 'memory-v1'],
    ])(
        'rejects metric %s with unit %s',
        (type, unit, metricVersion) => {
            const base = makeMetricEvent()
    
            const event = {
                ...base,
                type,
                metricVersion,
                payload: {
                    ...base.payload,
                    unit,
                },
            }
    
            expect(
                validateMetricEvent(event, validationContext),
            ).toEqual({
                ok: false,
                reason: 'invalid_unit',
            })
        },
    )

    it.each([
        null,
        [],
        'payload',
        42,
        undefined,
    ])('rejects malformed payload %#', (payload) => {
        const event = {
            ...makeMetricEvent(),
            payload,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_value',
        })
    })

    it.each([
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        '1800',
        null,
        undefined,
    ])('rejects invalid metric value %s', (value) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            payload: {
                ...base.payload,
                value,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_value',
        })
    })

    it.each([
        0,
        86_399_999,
    ])('accepts timing value %s', (value) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            payload: {
                ...base.payload,
                value,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event,
        })
    })
    
    it.each([
        86_400_000,
        86_400_001,
    ])('rejects timing value %s', (value) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            payload: {
                ...base.payload,
                value,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_value',
        })
    })

    it.each([
        0,
        0.1,
        1.5,
    ])('accepts CLS score %s', (value) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            type: 'web.vital.cls',
            metricVersion: 'cls-v1',
            payload: {
                value,
                unit: 'score',
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event,
        })
    })

    it.each([
        0,
        1_048_576,
        Number.MAX_SAFE_INTEGER,
    ])('accepts memory value %s', (value) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            type: 'web.memory.used_heap',
            metricVersion: 'memory-v1',
            payload: {
                value,
                unit: 'byte',
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event,
        })
    })

    it.each([
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
    ])('rejects memory value %s', (value) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            type: 'web.memory.used_heap',
            metricVersion: 'memory-v1',
            payload: {
                value,
                unit: 'byte',
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_value',
        })
    })

    it.each([
        NOW - 30 * 24 * 60 * 60 * 1000 - 1,
        NOW + 5 * 60 * 1000 + 1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        1.5,
        '2026-09-02',
        null,
        undefined,
    ])('rejects invalid timestamp %s', (timestamp) => {
        const event = {
            ...makeMetricEvent(),
            timestamp,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_timestamp',
        })
    })

    it.each([
        NOW - 30 * 24 * 60 * 60 * 1000,
        NOW + 5 * 60 * 1000,
    ])('accepts timestamp boundary %s', (timestamp) => {
        const event = {
            ...makeMetricEvent(),
            timestamp,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event,
        })
    })

    it.each([
        null,
        [],
        'application',
        42,
        undefined,
    ])('rejects malformed application %#', (application) => {
        const event = {
            ...makeMetricEvent(),
            application,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_app_id',
        })
    })

    it.each([
        '',
        '   ',
        'x'.repeat(65),
        'another-app',
        null,
        42,
        undefined,
    ])('rejects invalid application ID %s', (id) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            application: {
                ...base.application,
                id,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_app_id',
        })
    })

    it.each([
        '',
        '   ',
        'latest',
        'LATEST',
        'x'.repeat(65),
        null,
        42,
        undefined,
    ])('rejects invalid application version %s', (version) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            application: {
                ...base.application,
                version,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_app_version',
        })
    })

    it.each([
        'development',
        'test',
        'staging',
        'production',
    ])('accepts environment %s', (environment) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            application: {
                ...base.application,
                environment,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event,
        })
    })

    it.each([
        'preview',
        '',
        null,
        42,
        undefined,
    ])('rejects invalid environment %s', (environment) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            application: {
                ...base.application,
                environment,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_environment',
        })
    })

    it.each([
        null,
        [],
        'runtime',
        42,
        undefined,
    ])('rejects malformed runtime %#', (runtime) => {
        const event = {
            ...makeMetricEvent(),
            runtime,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_platform',
        })
    })

    it.each([
        null,
        42,
        {},
        undefined,
    ])('rejects malformed platform %#', (platform) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                platform,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_platform',
        })
    })

    it.each([
        'android',
        'ios',
        'miniapp',
        'desktop',
    ])('rejects platform mismatch %s', (platform) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                platform,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'platform_event_mismatch',
        })
    })

    it.each([
        null,
        [],
        'sdk',
        42,
        undefined,
    ])('rejects malformed SDK metadata %#', (sdk) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                sdk,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_sdk',
        })
    })

    it.each([
        {
            name: '',
            version: '0.2.0',
        },
        {
            name: '   ',
            version: '0.2.0',
        },
        {
            name: 'x'.repeat(129),
            version: '0.2.0',
        },
        {
            name: '@performance-platform/browser',
            version: '',
        },
        {
            name: '@performance-platform/browser',
            version: '   ',
        },
        {
            name: '@performance-platform/browser',
            version: 'x'.repeat(65),
        },
        {
            name: null,
            version: '0.2.0',
        },
        {
            name: '@performance-platform/browser',
            version: null,
        },
    ])('rejects invalid SDK metadata %#', (sdk) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                sdk,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_sdk',
        })
    })
    
    it.each([
        null,
        [],
        'session',
        42,
        undefined,
    ])('rejects malformed session %#', (session) => {
        const event = {
            ...makeMetricEvent(),
            session,
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_session_id',
        })
    })

    it.each([
        '',
        '   ',
        'x'.repeat(129),
        null,
        42,
        undefined,
    ])('rejects invalid session ID %s', (sessionId) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            session: {
                ...base.session,
                sessionId,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_session_id',
        })
    })

    it.each([
        '',
        '   ',
        'x'.repeat(129),
        null,
        42,
        undefined,
    ])('rejects invalid view ID %s', (viewId) => {
        const base = makeMetricEvent()
    
        const event = {
            ...base,
            session: {
                ...base.session,
                viewId,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_view_id',
        })
    })

    it('accepts unknown optional fields for forward compatibility', () => {
        const event = {
            ...makeMetricEvent(),
            futureOptionalField: {
                enabled: true,
            },
        }
    
        expect(
            validateMetricEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event,
        })
    })
})