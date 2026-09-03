import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    PaintMetricsData,
} from '@performance-platform/protocol'

import type {
    EventRepository,
} from '../repositories/event-repository.js'

import {
    buildApp,
} from '../app.js'


const NOW =
    Date.UTC(2026, 7, 30, 8, 0, 0)

const ONE_DAY_MS =
    24 * 60 * 60 * 1_000

const FROM =
    new Date(NOW - ONE_DAY_MS)

const TO =
    new Date(NOW)

const EMPTY_STATS = {
    count: 0,
    average: null,
    p50: null,
    p75: null,
    p90: null,
}

const METRICS_RESPONSE: PaintMetricsData = {
        range: {
            from:
                FROM.toISOString(),

            to:
                TO.toISOString(),

            interval:
                'hour',
        },

        summary: {
            fp: EMPTY_STATS,
            fcp: EMPTY_STATS,
        },

        series: [],
    }

    describe('GET /api/v1/metrics/paint', () => {
        const apps: Array<{
            close(): Promise<void>
        }> = []

        afterEach(async () => {
            await Promise.all(
                apps.map(
                    (app) => app.close()
                )
            )
            apps.length = 0
        })

        function createTestApp() {
            const queryPaintMetrics =
                vi.fn<EventRepository['queryPaintMetrics']>()

            const repository: EventRepository = {
                insertBatch:
                    vi.fn<EventRepository['insertBatch']>(),

                queryPaintMetrics,
            }

            const metricQueryRepository = {
                queryMetric: vi.fn(),
            }

            const app = buildApp({
                eventRepository: repository,
                metricQueryRepository,
                appId: 'demo-web',
                now: () => NOW,
            })

            apps.push(app)

            return {
                app,
                queryPaintMetrics,
            }
        }

        it('uses the previous 24 hours and hour interval by default', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            queryPaintMetrics.mockResolvedValue(METRICS_RESPONSE)

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/metrics/paint',
            })

            expect(response.statusCode).toBe(200)

            expect(response.json()).toEqual({
                ...METRICS_RESPONSE,
                score: null,
            })

            expect(
                queryPaintMetrics,
            ).toHaveBeenCalledOnce()

            expect(
                queryPaintMetrics,
            ).toHaveBeenCalledWith({
                appId: 'demo-web',
                from: FROM,
                to: TO,
                interval: 'hour',
            })
        })

        it('uses an explicit range and interval', async () => {
            const from = '2026-08-29T00:00:00.000Z'
            const to = '2026-08-30T00:00:00.000Z'
            const metricsResponse: PaintMetricsData = {
                ...METRICS_RESPONSE,
                range: {
                    from,
                    to,
                    interval: 'day'
                }
            }

           const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            queryPaintMetrics.mockResolvedValue(
                metricsResponse,
            )

            const response = await app.inject({
                method: 'GET',

                url:
                    '/api/v1/metrics/paint'
                    + `?from=${encodeURIComponent(from)}`
                    + `&to=${encodeURIComponent(to)}`
                    + '&interval=day',
            })

            expect(response.statusCode).toBe(200)

            expect(response.json()).toEqual({
                ...metricsResponse,
                score: null
            })

            expect(
                queryPaintMetrics,
            ).toHaveBeenCalledWith({
                appId: 'demo-web',
                from: new Date(from),
                to: new Date(to),
                interval: 'day',
            })
        })

        it('rejects an invalid from date', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            const response = await app.inject({
                method: 'GET',
                url:
                    '/api/v1/metrics/paint'
                    + '?from=not-a-date',
            })

            expect(response.statusCode).toBe(400)
            expect(response.json()).toEqual({
                error: {
                    code: 'INVALID_DATE',
                    message: 'from must be a valid ISO 8601 date',
                    requestId: expect.any(String),
                }
            })
            expect(queryPaintMetrics).not.toHaveBeenCalled()
        })

        it('rejects an invalid to date', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            const response = await app.inject({
                method: 'GET',
                url:
                    '/api/v1/metrics/paint'
                    + '?to=not-a-date',
            })

            expect(response.statusCode).toBe(400)

            expect(response.json()).toEqual({
                error: {
                    code:
                        'INVALID_DATE',

                    message:
                        'to must be a valid ISO 8601 date',

                    requestId:
                        expect.any(String),
                },
            })

            expect(
                queryPaintMetrics,
            ).not.toHaveBeenCalled()
        })
        it('rejects an unsupported interval', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            const response = await app.inject({
                method: 'GET',

                url:
                    '/api/v1/metrics/paint'
                    + '?interval=week',
            })

            expect(response.statusCode).toBe(400)

            expect(response.json()).toEqual({
                error: {
                    code:
                        'INVALID_INTERVAL',

                    message:
                        'interval must be one of minute, hour, or day',

                    requestId:
                        expect.any(String),
                },
            })

            expect(
                queryPaintMetrics,
            ).not.toHaveBeenCalled()
        })

        it('rejects a range where from is not earlier than to', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            const from = '2026-08-30T08:00:00.000Z'

            const to = '2026-08-30T08:00:00.000Z'

            const response = await app.inject({
                method: 'GET',

                url:
                    '/api/v1/metrics/paint'
                    + `?from=${encodeURIComponent(from)}`
                    + `&to=${encodeURIComponent(to)}`,
            })

            expect(response.statusCode).toBe(400)

            expect(response.json()).toEqual({
                error: {
                    code:
                        'INVALID_TIME_RANGE',

                    message:
                        'from must be earlier than to',

                    requestId:
                        expect.any(String),
                },
            })

            expect(
                queryPaintMetrics,
            ).not.toHaveBeenCalled()
        })

        it('rejects a range longer than 30 days', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            const from =
                '2026-07-30T00:00:00.000Z'

            const to =
                '2026-08-30T00:00:00.000Z'

            const response = await app.inject({
                method: 'GET',

                url:
                    '/api/v1/metrics/paint'
                    + `?from=${encodeURIComponent(from)}`
                    + `&to=${encodeURIComponent(to)}`,
            })

            expect(response.statusCode).toBe(400)

            expect(response.json()).toEqual({
                error: {
                    code:
                        'TIME_RANGE_TOO_LARGE',

                    message:
                        'time range must not exceed 30 days',

                    requestId:
                        expect.any(String),
                },
            })

            expect(
                queryPaintMetrics,
            ).not.toHaveBeenCalled()
        })

        it('returns a stable error when metrics storage is unavailable', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            queryPaintMetrics.mockRejectedValue(
                new Error(
                    'connect ECONNREFUSED localhost:5432',
                ),
            )

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/metrics/paint',
            })

            expect(response.statusCode).toBe(503)

            expect(response.json()).toEqual({
                error: {
                    code:
                        'STORAGE_UNAVAILABLE',

                    message:
                        'metrics storage is temporarily unavailable',

                    requestId:
                        expect.any(String),
                },
            })

            expect(response.body).not.toContain(
                'ECONNREFUSED',
            )
        })
        it('includes a calculated paint score', async () => {
            const {
                app,
                queryPaintMetrics,
            } = createTestApp()

            queryPaintMetrics.mockResolvedValue({
                ...METRICS_RESPONSE,

                summary: {
                    fp: {
                        count: 100,
                        average: 800,
                        p50: 700,
                        p75: 1_000,
                        p90: 1_200,
                    },

                    fcp: {
                        count: 100,
                        average: 1_500,
                        p50: 1_400,
                        p75: 1_800,
                        p90: 2_100,
                    },
                },
            })

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/metrics/paint',
            })

            expect(response.statusCode).toBe(200)

            expect(response.json()).toMatchObject({
                score: {
                    value: 90,
                    status: 'good',
                    version: 'paint-v1',

                    components: {
                        fp: 90,
                        fcp: 90,
                    },
                },
            })
        })
    })