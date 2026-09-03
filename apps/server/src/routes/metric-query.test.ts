import Fastify from "fastify";

import {
    describe,
    it,
    expect,
    afterEach,
    vi,
} from 'vitest'

import type {
    MetricQueryResponse
} from '@performance-platform/protocol'

import type {
    MetricQueryService
} from '../services/metric-query-service.js'

import {
    registerMetricQueryRoutes
} from './metric-query.js'
import type { EventRepository, MetricQueryRepository } from "../repositories/event-repository.js";
import { buildApp } from "../app.js";

const RESPONSE = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },
    range: {
        from: '2026-09-02T00:00:00.000Z',
        to: '2026-09-03T00:00:00.000Z',
        interval: 'hour'
    },
    summary: {
        count: 1,
        average: 128,
        p50: 128,
        p75: 128,
        p90: 128,
    },
    series: []
} satisfies MetricQueryResponse

describe('GET /api/v2/metrics', () => {
    const apps: Array<{
        close(): Promise<void>
    }> = []

    afterEach(async () => {
        await Promise.all(apps.map(app => app.close()))
        apps.length = 0
    })

    async function createTestApp() {
        const query = vi.fn<MetricQueryService['query']>().mockResolvedValue({
            ok: true,
            value: RESPONSE
        })

        const app = Fastify()

        await app.register(
            registerMetricQueryRoutes,
            {
                metricQueryService: {
                    query
                }
            }
        )

        apps.push(app)

        return {
            app,
            query,
        }
    }

    it('returns a metric query response', async () => {
        const {
            app,
            query,
        } = await createTestApp()

        const response =
            await app.inject({
                method: 'GET',

                url:
                    '/api/v2/metrics'
                    + '?type=web.vital.lcp'
                    + '&interval=hour',
            })

        expect(
            response.statusCode,
        ).toBe(200)

        expect(
            response.json(),
        ).toEqual(RESPONSE)

        expect(query)
            .toHaveBeenCalledWith({
                type:
                    'web.vital.lcp',

                interval:
                    'hour',
            })
    })

    it('rejects an unsupported metric', async () => {
        const {
            app,
            query,
        } = await createTestApp()
    
        query.mockResolvedValueOnce({
            ok: false,
            code: 'UNSUPPORTED_METRIC',
        })
    
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/metrics?type=web.vital.unknown',
        })
    
        expect(response.statusCode).toBe(400)
    
        expect(response.json()).toEqual({
            error: {
                code: 'UNSUPPORTED_METRIC',
                message: 'metric type is unsupported',
                requestId: expect.any(String),
            },
        })
    })

    it('rejects an invalid from date', async () => {
        const {
            app,
            query,
        } = await createTestApp()
    
        query.mockResolvedValueOnce({
            ok: false,
            code: 'INVALID_DATE',
            field: 'from',
        })
    
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/metrics'
                + '?type=web.vital.lcp'
                + '&from=not-a-date',
        })
    
        expect(response.statusCode).toBe(400)
    
        expect(response.json()).toEqual({
            error: {
                code: 'INVALID_DATE',
                message: 'from must be a valid ISO 8601 date',
                requestId: expect.any(String),
            },
        })
    })

    it('rejects an invalid to date', async () => {
        const {
            app,
            query,
        } = await createTestApp()
    
        query.mockResolvedValueOnce({
            ok: false,
            code: 'INVALID_DATE',
            field: 'to',
        })
    
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/metrics'
                + '?type=web.vital.lcp'
                + '&to=not-a-date',
        })
    
        expect(response.statusCode).toBe(400)
    
        expect(response.json()).toEqual({
            error: {
                code: 'INVALID_DATE',
                message: 'to must be a valid ISO 8601 date',
                requestId: expect.any(String),
            },
        })
    })

    it.each([
        {
            result: {
                ok: false,
                code: 'INVALID_INTERVAL',
            } as const,
            message:
                'interval must be one of minute, hour, or day',
        },
        {
            result: {
                ok: false,
                code: 'INVALID_TIME_RANGE',
            } as const,
            message:
                'from must be earlier than to',
        },
        {
            result: {
                ok: false,
                code: 'TIME_RANGE_TOO_LARGE',
            } as const,
            message:
                'time range must not exceed 30 days',
        },
    ])(
        'maps $result.code to HTTP 400',
        async ({
            result,
            message,
        }) => {
            const {
                app,
                query,
            } = await createTestApp()
    
            query.mockResolvedValueOnce(result)
    
            const response = await app.inject({
                method: 'GET',
                url: '/api/v2/metrics?type=web.vital.lcp',
            })
    
            expect(response.statusCode).toBe(400)
    
            expect(response.json()).toEqual({
                error: {
                    code: result.code,
                    message,
                    requestId: expect.any(String),
                },
            })
        },
    )

    it('returns a stable error when storage is unavailable', async () => {
        const {
            app,
            query,
        } = await createTestApp()
    
        query.mockResolvedValueOnce({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
            cause: new Error(
                'connect ECONNREFUSED localhost:5432',
            ),
        })
    
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/metrics?type=web.vital.lcp',
        })
    
        expect(response.statusCode).toBe(503)
    
        expect(response.json()).toEqual({
            error: {
                code: 'STORAGE_UNAVAILABLE',
                message:
                    'metrics storage is temporarily unavailable',
                requestId: expect.any(String),
            },
        })
    
        expect(response.body).not.toContain(
            'ECONNREFUSED',
        )
    })

    it('is registered by buildApp', async () => {
        const eventRepository: EventRepository = {
            insertBatch:
                vi.fn<EventRepository['insertBatch']>(),
    
            queryPaintMetrics:
                vi.fn<EventRepository['queryPaintMetrics']>(),
        }
    
        const queryMetric =
            vi.fn<MetricQueryRepository['queryMetric']>()
                .mockResolvedValue(RESPONSE)
    
        const app = buildApp({
            eventRepository,
    
            metricQueryRepository: {
                queryMetric,
            },
    
            appId: 'demo-web',
    
            now: () =>
                Date.parse('2026-09-03T00:00:00.000Z'),
        })
    
        apps.push(app)
    
        const from =
            '2026-09-02T00:00:00.000Z'
    
        const to =
            '2026-09-03T00:00:00.000Z'
    
        const response = await app.inject({
            method: 'GET',
    
            url:
                '/api/v2/metrics'
                + '?type=web.vital.lcp'
                + `&from=${encodeURIComponent(from)}`
                + `&to=${encodeURIComponent(to)}`
                + '&interval=hour',
        })
    
        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(RESPONSE)
    
        expect(queryMetric).toHaveBeenCalledWith({
            appId: 'demo-web',
    
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
    
            from: new Date(from),
            to: new Date(to),
            interval: 'hour',
        })
    })
})