import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    MetricEventV2,
} from '@performance-platform/protocol'

import type {
    EventRepository,
} from '../repositories/event-repository.js'

import {
    createMetricEventIngestionService
} from './metric-event-ingestion-service.js'

const NOW = Date.UTC(
    2026, 7, 28, 8, 0, 0
)

const EVENT: MetricEventV2 = {
    schemaVersion: '2.0',

    eventId:
        '30000000-0000-4000-8000-000000000001',

    type: 'web.vital.lcp',
    timestamp: NOW,

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
        sessionId: 'session-v2-1',
        viewId: 'view-v2-1',
    },

    payload: {
        value: 2300,
        unit: 'ms',
    },
}

describe('MetricEventIngestionService', () => {

    function createTestService() {
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

        const service =
            createMetricEventIngestionService({
                repository,
                appId: 'demo-web',
                now: () => NOW,
            })

        return {
            service,
            insertBatch,
        }
    }

    it('stores accepted V2 events', async () => {
        const {
            service,
            insertBatch,
        } = createTestService()

        const result = await service.ingest({
            events: [EVENT]
        })

        expect(result).toEqual({
            ok: true,
            value: {
                accepted: 1,
                discarded: 0,
                reasons: {},
            }
        })

        expect(insertBatch).toHaveBeenCalledOnce()
        expect(insertBatch).toHaveBeenCalledWith([EVENT])
    })
    it('stores valid events and reports discarded events', async () => {
        const {
            service,
            insertBatch,
        } = createTestService()
    
        const invalidEvent = {
            ...EVENT,
    
            eventId:
                '30000000-0000-4000-8000-000000000002',
    
            payload: {
                value: 2300,
                unit: 'score',
            },
        }
    
        const result = await service.ingest({
            events: [
                EVENT,
                invalidEvent,
            ],
        })
    
        expect(result).toEqual({
            ok: true,
            value: {
                accepted: 1,
                discarded: 1,
                reasons: {
                    invalid_unit: 1,
                },
            },
        })
    
        expect(insertBatch).toHaveBeenCalledWith([
            EVENT,
        ])
    })

    it('rejects an empty batch without accessing storage', async () => {
        const {
            service,
            insertBatch,
        } = createTestService()
    
        const result = await service.ingest({
            events: [],
        })
    
        expect(result).toEqual({
            ok: false,
            code: 'INVALID_BATCH',
        })
    
        expect(insertBatch).not.toHaveBeenCalled()
    })

    it('reports storage failures', async () => {
        const {
            service,
            insertBatch,
        } = createTestService()
    
        const cause =
            new Error('database unavailable')
    
        insertBatch.mockRejectedValueOnce(
            cause,
        )
    
        const result = await service.ingest({
            events: [
                EVENT,
            ],
        })
    
        expect(result).toEqual({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
            cause,
        })
    })
})