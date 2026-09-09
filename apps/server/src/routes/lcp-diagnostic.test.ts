import Fastify from 'fastify'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LcpDiagnosticResponse } from '@performance-platform/protocol'

import type { LcpDiagnosticService } from '../services/lcp-diagnostic-service.js'

import { registerLcpDiagnosticRoutes } from './lcp-diagnostic.js'
import type {
    EventRepository,
    LcpDiagnosticRepository,
    MetricQueryRepository,
} from '../repositories/event-repository.js'

import { buildApp } from '../app.js'

const RESPONSE: LcpDiagnosticResponse = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 10,
    evidenceSampleCount: 8,
    overall: {
        average: 2_000,
        p75: 2_400,
    },
    phases: {
        timeToFirstByte: {
            average: 700,
            p75: 850,
        },
        resourceLoadDelay: {
            average: 200,
            p75: 300,
        },
        resourceLoadDuration: {
            average: 600,
            p75: 750,
        },
        elementRenderDelay: {
            average: 300,
            p75: 400,
        },
    },
}

describe('GET /api/v2/diagnostics/lcp', () => {
    const apps: Array<{
        close(): Promise<void>
    }> = []

    afterEach(async () => {
        await Promise.all(apps.map((app) => app.close()))
        apps.length = 0
    })

    async function createTestApp() {
        const query = vi.fn<LcpDiagnosticService['query']>().mockResolvedValue({
            ok: true,
            value: RESPONSE,
        })

        const app = Fastify()

        await app.register(registerLcpDiagnosticRoutes, {
            lcpDiagnosticService: {
                query,
            },
        })

        apps.push(app)

        return {
            app,
            query,
        }
    }

    it('returns aggregated LCP diagnostics', async () => {
        const { app, query } = await createTestApp()

        const response = await app.inject({
            method: 'GET',
            url:
                '/api/v2/diagnostics/lcp' +
                '?from=2026-09-01T00:00:00.000Z' +
                '&to=2026-09-02T00:00:00.000Z',
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(RESPONSE)

        expect(query).toHaveBeenCalledWith({
            from: '2026-09-01T00:00:00.000Z',
            to: '2026-09-02T00:00:00.000Z',
        })
    })

    it.each([
        {
            result: {
                ok: false,
                code: 'INVALID_DATE',
                field: 'from',
            },
            status: 400,
            message: 'from must be a valid ISO 8601 date',
        },
        {
            result: {
                ok: false,
                code: 'INVALID_DATE',
                field: 'to',
            },
            status: 400,
            message: 'to must be a valid ISO 8601 date',
        },
        {
            result: {
                ok: false,
                code: 'INVALID_TIME_RANGE',
            },
            status: 400,
            message: 'from must be earlier than to',
        },
        {
            result: {
                ok: false,
                code: 'TIME_RANGE_TOO_LARGE',
            },
            status: 400,
            message: 'time range must not exceed 30 days',
        },
        {
            result: {
                ok: false,
                code: 'STORAGE_UNAVAILABLE',
                cause: new Error('database unavailable'),
            },
            status: 503,
            message: 'diagnostic storage is temporarily unavailable',
        },
    ] as const)(
        'maps $result.code to HTTP $status',
        async ({ result, status, message }) => {
            const { app, query } = await createTestApp()

            query.mockResolvedValueOnce(result)

            const response = await app.inject({
                method: 'GET',
                url: '/api/v2/diagnostics/lcp',
            })

            expect(response.statusCode).toBe(status)

            expect(response.json()).toEqual({
                error: {
                    code: result.code,
                    message,
                    requestId: expect.any(String),
                },
            })
        },
    )

    it('is registered by buildApp', async () => {
        const eventRepository: EventRepository = {
            insertBatch: vi.fn<EventRepository['insertBatch']>(),

            queryPaintMetrics: vi.fn<EventRepository['queryPaintMetrics']>(),
        }

        const metricQueryRepository: MetricQueryRepository = {
            queryMetric: vi.fn<MetricQueryRepository['queryMetric']>(),
        }

        const queryLcpDiagnostics = vi
            .fn<LcpDiagnosticRepository['queryLcpDiagnostics']>()
            .mockResolvedValue(RESPONSE)

        const app = buildApp({
            eventRepository,
            metricQueryRepository,
            lcpDiagnosticRepository: {
                queryLcpDiagnostics,
            },
            appId: 'demo-web',
            now: () => Date.parse('2026-09-02T00:00:00.000Z'),
        })

        apps.push(app)

        const response = await app.inject({
            method: 'GET',
            url:
                '/api/v2/diagnostics/lcp' +
                '?from=2026-09-01T00:00:00.000Z' +
                '&to=2026-09-02T00:00:00.000Z',
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(RESPONSE)

        expect(queryLcpDiagnostics).toHaveBeenCalledWith({
            appId: 'demo-web',
            from: new Date('2026-09-01T00:00:00.000Z'),
            to: new Date('2026-09-02T00:00:00.000Z'),
        })
    })
})
