import { describe, expect, it } from 'vitest'

import type {
    BatchValidationResult,
    PaintEventV1,
    PaintEventValidationContext,
} from './types'
import { validatePaintEvent, validatePaintBatch } from './validate'

const NOW = Date.UTC(2026, 7, 24, 10, 0, 0)

const validationContext: PaintEventValidationContext = {
    expectedAppId: 'demo-web',
    now: NOW
}

function makeEvent(value = 260.4): PaintEventV1 {
    return {
        schemaVersion: '1.0',
        eventId: '075f9a46-f934-45e3-b355-e20490e90bb4',
        type: 'web.paint.fcp',
        timestamp: NOW - 1_000,
        application: {
            id: 'demo-web',
            version: '0.1.0+test',
            environment: 'test',
        },
        runtime: {
            platform: 'web',
            sdk: {
                name: '@performance-platform/browser',
                version: '0.1.0',
            },
        },

        session: {
            sessionId: 'session-test-1',
            viewId: 'view-test-1',
        },
    
        payload: {
            value,
            unit: 'ms',
        },
    }
}

describe('validatePaintEvent', () => {
    it('accepts a valid FCP event', () => {
        const event = makeEvent()

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: true,
            value: event
        })
    })

    it('accepts a valid FP event', () => {
        const event = {
            ...makeEvent(),
            type: 'web.paint.fp',
        } as const

        expect(
            validatePaintEvent(event, validationContext),
        ).toEqual({
            ok: true,
            value: event
        })
    })

    // %s 是测试名称中的格式化占位符，当前测试参数的字符串表示，类似 String(value)
    it.each([
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        86_400_000,
    ])('rejects invalid paint value %s', (value) => {
        const base = makeEvent()
        const event = {
            ...base,
            payload: {
                ...base.payload,
                value,
            }
        }

        expect(
            validatePaintEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'invalid_value'
        })
    })

    // %# 显示当前用例序号
    it.each([
        null,
        {},
        [],
        { schemaVersion: '2.0' }
    ]) ('rejects unsupported input %#', (event) => {
        expect(
            validatePaintEvent(event, validationContext),
        ).toEqual({
            ok: false,
            reason: 'unsupported_schema_version'
        })
    })

    it('rejects a invalid event ID', () => {
        const event = {
            ...makeEvent(),
            eventId: 'not-a-uuid',
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_event_id'
        })
    })

    it('rejects an unexpected application ID', () => {
        const base = makeEvent()
        const event = {
            ...base,
            application: {
                ...base.application,
                id: 'another-app',
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_app_id'
        })
    })

    it('rejects the latest application version', () => {
        const base = makeEvent()
        const event = {
            ...base,
            application: {
                ...base.application,
                version: 'latest',
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_app_version'
        })
    })

    it('rejects an unsupported event type', () => {
        const event = {
            ...makeEvent(),
            type: 'web.paint.unknown',
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'unsupported_event_type'
        })
    })

    it.each([
        NOW - 30 * 24 * 60 * 60 * 1000 - 1, // 最早允许值 - 1
        NOW + 5 * 60 * 1000 + 1, // 最晚允许值 + 1
        Number.NaN,
        1.5
    ]) ('rejects invalid timestamp %s', (timestamp) => {
        const event = {
            ...makeEvent(),
            timestamp,
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_timestamp'
        })
    })

    it.each([
        NOW - 30 * 24 * 60 * 60 * 1000,
        NOW + 5 * 60 * 1000,
    ]) ('accepts timestamp boundary %s', (timestamp) => {
        const event = {
            ...makeEvent(),
            timestamp,
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: true,
            value: event
        })
    })

    it.each([
        '',
        '   ',
        'x'.repeat(65),
    ])('rejects invalid application version %#', (version) => {
        const base = makeEvent()
        const event = {
            ...base,
            application: {
                ...base.application,
                version,
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_app_version'
        })
    })

    it('rejects an unsupported environment', () => {
        const base = makeEvent()
        const event = {
            ...base,
            application: {
                ...base.application,
                environment: 'preview',
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_environment'
        })
    })

    it.each([
        null,
        42
    ])('rejects malformed runtime platform %#', (platform) => {
        const base = makeEvent()
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                platform,
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_platform'
        })
    })

    it('rejects a platform and event type mismatch', () => {
        const base = makeEvent()
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                platform: 'android',
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'platform_event_mismatch'
        })
    })

    it.each([
        {
            name: '',
            version: '0.1.0'
        }, 
        {
            name: '@performance-platform/browser',
            version: '',
        },
        {
            name: 'x'.repeat(129),
            version: '0.1.0'
        },
        {
            name: '@performance-platform/browser',
            version: 'x'.repeat(65)
        }
    ])('rejects invalid SDK metadata %#', (sdk) => {
        const base = makeEvent()
        const event = {
            ...base,
            runtime: {
                ...base.runtime,
                sdk,
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_sdk'
        })
    })

    it.each([
        '',
        'x'.repeat(129)
    ])('rejects invalid session ID %#', (sessionId) => {
        const base = makeEvent()
        const event = {
            ...base,
            session: {
                ...base.session,
                sessionId,
            }
        }      
        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_session_id'
        })
    })

    it.each([
        '',
        'x'.repeat(129)
    ])('rejects invalid view ID %#', (viewId) => {
        const base = makeEvent()
        const event = {
            ...base,
            session: {
                ...base.session,
                viewId
            }
        }

        expect(
            validatePaintEvent(event, validationContext)
        ).toEqual({
            ok: false,
            reason: 'invalid_view_id'
        })
    })

    it('rejects an unsupported unit', () => {
        const base = makeEvent()
        const event = {
        ...base,
        payload: {
            ...base.payload,
            unit: 'seconds',
        },
        }
    
        expect(
        validatePaintEvent(event, validationContext),
        ).toEqual({
        ok: false,
        reason: 'invalid_unit',
        })
    })
    
    it('accepts unknown optional fields for forward compatibility', () => {
        const event = {
        ...makeEvent(),
        futureOptionalField: {
            enabled: true,
        },
        }
    
        expect(
        validatePaintEvent(event, validationContext),
        ).toEqual({
        ok: true,
        value: event,
        })
    })
})

describe('validatePaintBatch', () => {
    it('accepts a batch of valid events', () => {
        const fcp = makeEvent()
        const fp = {
            ...makeEvent(),
            eventId: '9915dc1e-3806-41c6-a158-bc74171e82cb',
            type: 'web.paint.fp',
        } as const

        expect(
            validatePaintBatch(
                {
                    events: [fcp, fp],
                },
                validationContext
            )
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [fcp, fp],
                discarded: 0,
                reasons: {},
            }
        })
    })

    it('keeps valid events when another event is invalid', () => {
        const validEvent = makeEvent()
        const invalidBase = makeEvent(-1)
        const invalidEvent = {
            ...invalidBase,
            eventId: 'a6cf90d5-40e0-48db-a5bd-87b91534ca08'
        }

        expect(
            validatePaintBatch(
                {
                    events: [validEvent, invalidEvent],
                },
                validationContext
            )
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [validEvent],
                discarded: 1,
                reasons: {
                    invalid_value: 1
                }
            }
        })
    })

    it('aggregates discard reasons', () => {
        const invalidValue1 = makeEvent(-1)
        const invalidValue2 = {
            ...makeEvent(Number.NaN),
            eventId: '811c5111-e559-485b-b113-42bd9b169103',
        }
        const invalidAppBase = makeEvent()
        const invalidApp = {
            ...invalidAppBase,
            eventId: '8e0f9157-90d9-4782-b8b9-8f93e13a033b',
            application: {
                ...invalidAppBase.application,
                id: 'another-app'
            }
        }

        expect(
            validatePaintBatch(
                {
                    events: [
                        invalidValue1,
                        invalidValue2,
                        invalidApp,
                    ],
                },
                validationContext
            )
        ).toEqual({
            ok: true,
            value: {
                acceptedEvents: [],
                discarded: 3,
                reasons: {
                    invalid_value: 2,
                    invalid_app_id: 1,
                }
            }
        })
    })

    it.each([
        null,
        {},
        {
            events: 'not-an-array',
        },
        {
            events: []
        }
    ])('rejects invalid batch structure %#', (batch) => {
        expect(
            validatePaintBatch(batch, validationContext),
        ).toEqual({
            ok: false,
            code: 'INVALID_BATCH',
        } satisfies BatchValidationResult)
    })

    it('rejects a batch containing more than 20 events', () => {
        const events = Array.from({
            length: 21,
        }, () => makeEvent())

        expect(
            validatePaintBatch(
                {
                    events
                },
                validationContext
            )
        ).toEqual({
            ok: false,
            code: 'BATCH_TOO_LARGE'
        })
    })
})