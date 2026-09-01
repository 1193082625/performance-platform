import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    PaintEventV1,
} from '@performance-platform/protocol'

import type {
    EventRepository,
} from '../repositories/event-repository.js'

import { buildApp } from '../app.js'

const NOW = Date.UTC(2026, 7, 28, 8, 0, 0)

const EVENT: PaintEventV1 = {
    schemaVersion: '1.0',

    eventId:
        '7ae498ca-1dc3-4cf7-be84-67e3c8cd2e1a',

    type: 'web.paint.fcp',
    timestamp: NOW,

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
        value: 260.4,
        unit: 'ms',
    },
}

describe('POST /api/v1/events/batch', () => {
    const apps: Array<{
        close(): Promise<void>
    }> = []

    afterEach(async () => {
        await Promise.all(
            apps.map((app) => app.close()),
        )
        apps.length = 0
    })

    function createTestApp() {
        const insertBatch = vi.fn<EventRepository['insertBatch']>()
        const repository: EventRepository = {
            insertBatch,
    
            queryPaintMetrics:
                vi.fn<
                    EventRepository[
                        'queryPaintMetrics'
                    ]
                >(),
        }

        const app = buildApp({
            eventRepository: repository,
            appId: 'demo-web',
            now: () => NOW,
        })
    
        apps.push(app)

        return {
            app,
            insertBatch,
        }
    }

    it('accepts a valid event batch', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',

            payload: {
                events: [
                    EVENT,
                ],
            },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({
            accepted: 1,
            discarded: 0,
            reasons: {}
        })
        expect(insertBatch).toHaveBeenCalledOnce()
        expect(insertBatch).toHaveBeenCalledWith([
            EVENT
        ])
    })


    it('accepts valid events and reports discarded events', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const invalidEvent: PaintEventV1 = {
            ...EVENT,

            eventId:
                '178714a8-1cd5-4900-baf4-4d8761451806',
    
            payload: {
                value: -1,
                unit: 'ms',
            },
        }

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
    
            payload: {
                events: [
                    EVENT,
                    invalidEvent,
                ],
            },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({
            accepted: 1,
            discarded: 1,
            reasons: {
                invalid_value: 1
            }
        })

        expect(insertBatch).toHaveBeenCalledOnce()

        expect(insertBatch).toHaveBeenCalledWith([
            EVENT,
        ])
    })

    it('rejects an empty event batch with a stable error response', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
    
            payload: {
                events: [],
            },
        })

        expect(response.statusCode).toBe(400)

        expect(response.json()).toEqual({
            error: {
                code: 'INVALID_BATCH',
                message: 'events must be a non-empty array',
                requestId: expect.any(String)
            }
        })

        expect(insertBatch).not.toHaveBeenCalled()
    })

    it('rejects a batch containing more than 20 events', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
    
            payload: {
                events:
                    Array.from(
                        {
                            length: 21,
                        },
                        () => EVENT,
                    ),
            },
        })

        expect(response.statusCode).toBe(400)
        expect(response.json()).toEqual({
            error: {
                code: 'BATCH_TOO_LARGE',
                message: 'events must contain at most 20 items',
                requestId: expect.any(String),
            }
        })
        expect(insertBatch).not.toHaveBeenCalled()
    })

    it('rejects request bodies larger than 32 KiB', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const oversizedEvent: PaintEventV1 = {
            ...EVENT,

            application: {
                ...EVENT.application,

                version:
                    'x'.repeat(33 * 1024),
            },
        }

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',

            payload: {
                events: [
                    oversizedEvent,
                ],
            },
        })

        expect(response.statusCode).toBe(413)
        expect(response.json()).toEqual({
            error: {
                code: 'PAYLOAD_TOO_LARGE',
    
                message:
                    'request body must not exceed 32 KiB',
    
                requestId:
                    expect.any(String),
            },
        })
        expect(insertBatch).not.toHaveBeenCalled()
    })

    it('rejects malformed JSON with a stable error response', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()
    
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
    
            headers: {
                'content-type':
                    'application/json',
            },
    
            payload:
                '{"events":',
        })
    
        expect(response.statusCode).toBe(400)
    
        expect(response.json()).toEqual({
            error: {
                code: 'INVALID_JSON',
    
                message:
                    'request body must contain valid JSON',
    
                requestId:
                    expect.any(String),
            },
        })
    
        expect(insertBatch).not.toHaveBeenCalled()
    })
    it('rejects unsupported media types with a stable error response', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
    
            headers: {
                'content-type':
                    'application/xml',
            },
    
            payload:
                '<events></events>',
        })

        expect(response.statusCode).toBe(415)
        expect(response.json()).toEqual({
            error: {
                code:
                    'UNSUPPORTED_MEDIA_TYPE',
    
                message:
                    'content-type must be application/json',
    
                requestId:
                    expect.any(String),
            },
        })

        expect(insertBatch).not.toHaveBeenCalled()
    })

    it('discards events belonging to another app', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const wrongAppEvent: PaintEventV1 = {
            ...EVENT,
            application: {
                ...EVENT.application,
                id: 'another-app',
            },
        }

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
            payload: {
                events: [wrongAppEvent]
            }
        })


        expect(response.statusCode).toBe(200)

        expect(response.json()).toEqual({
            accepted: 0,
            discarded: 1,

            reasons: {
                invalid_app_id: 1,
            },
        })

        expect(insertBatch).toHaveBeenCalledOnce()

        expect(insertBatch).toHaveBeenCalledWith([])
    })

    it('returns a stable error when event storage is unavailable', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()
        
        insertBatch.mockRejectedValue(
            new Error(
                'connect ECONNREFUSED localhost:5432',
            ),
        )

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',

            payload: {
                events: [
                    EVENT,
                ],
            },
        })

        expect(response.statusCode).toBe(503)

        expect(response.json()).toEqual({
            error: {
                code:
                    'STORAGE_UNAVAILABLE',

                message:
                    'event storage is temporarily unavailable',

                requestId:
                    expect.any(String),
            },
        })

        expect(response.body).not.toContain(
            'ECONNREFUSED',
        )
    })

    it('treats duplicate event IDs as accepted', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',

            payload: {
                events: [
                    EVENT,
                    EVENT,
                ],
            },
        })

        expect(response.statusCode).toBe(200)

        expect(response.json()).toEqual({
            accepted: 2,
            discarded: 0,
            reasons: {},
        })

        expect(insertBatch).toHaveBeenCalledOnce()

        expect(insertBatch).toHaveBeenCalledWith([
            EVENT,
            EVENT,
        ])
    })

    it('accepts a Beacon JSON batch sent as text/plain', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',

            headers: {
                'content-type':
                    'text/plain;charset=UTF-8',
            },

            payload: JSON.stringify({
                events: [
                    EVENT,
                ],
            }),
        })

        expect(response.statusCode).toBe(200)

        expect(response.json()).toEqual({
            accepted: 1,
            discarded: 0,
            reasons: {},
        })

        expect(insertBatch).toHaveBeenCalledOnce()
        expect(insertBatch).toHaveBeenCalledWith([
            EVENT,
        ])
    })

    it('rejects malformed Beacon JSON with a stable error response', async () => {
        const {
            app,
            insertBatch,
        } = createTestApp()
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/events/batch',
            headers: {
                'content-type':
                    'text/plain;charset=UTF-8',
            },
            payload: '{"events":',
        })
        expect(response.statusCode).toBe(400)
        expect(response.json()).toEqual({
            error: {
                code: 'INVALID_JSON',
                message:
                    'request body must contain valid JSON',
                requestId: expect.any(String),
            },
        })
        expect(insertBatch).not.toHaveBeenCalled()
    })
})
