import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    MetricQueryResponse,
} from '@performance-platform/protocol'

import type {
    MetricQueryRepository,
} from '../repositories/event-repository.js'

import {
    createMetricQueryService,
} from './metric-query-service.js'

const NOW = Date.UTC(2026, 8, 3, 12, 0, 0)
const DAY_MS = 24 * 60 * 60 * 1_000
const MAX_RANGE_MS = 30 * DAY_MS

const RESPONSE = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },

    range: {
        from:
            new Date(NOW - DAY_MS).toISOString(),
        to:
            new Date(NOW).toISOString(),
        interval: 'hour',
    },

    summary: {
        count: 0,
        average: null,
        p50: null,
        p75: null,
        p90: null,
    },

    series: [],
} satisfies MetricQueryResponse

describe('MetricQueryService', () => {
    it('queries LCP with the default range and interval', async () => {
        const queryMetric =
            vi.fn<
                MetricQueryRepository['queryMetric']
            >()
                .mockResolvedValue(RESPONSE)

        const service =
            createMetricQueryService({
                repository: {
                    queryMetric,
                },

                appId: 'demo-web',
                now: () => NOW,
            })

        const result =
            await service.query({
                type: 'web.vital.lcp',
            })

        expect(queryMetric).toHaveBeenCalledWith({
            appId: 'demo-web',

            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },

            from:
                new Date(NOW - DAY_MS),

            to:
                new Date(NOW),

            interval: 'hour',
        })

        expect(result).toEqual({
            ok: true,
            value: RESPONSE,
        })
    })

    it('resolves the CLS score definition', async () => {
        const clsResponse = {
            ...RESPONSE,
            metric: {
                type: 'web.vital.cls',
                unit: 'score',
                metricVersion: 'cls-v1',
            },
        } satisfies MetricQueryResponse
        const queryMetric = vi.fn<
            MetricQueryRepository['queryMetric']
        >().mockResolvedValue(clsResponse)
        const service = createMetricQueryService({
            repository: { queryMetric },
            appId: 'demo-web',
            now: () => NOW,
        })

        const result = await service.query({
            type: 'web.vital.cls',
        })

        expect(queryMetric).toHaveBeenCalledWith(
            expect.objectContaining({
                metric: {
                    type: 'web.vital.cls',
                    unit: 'score',
                    metricVersion: 'cls-v1',
                },
            }),
        )
        expect(result).toEqual({
            ok: true,
            value: clsResponse,
        })
    })

    it('uses an explicit range and interval', async () => {
        const queryMetric =
            vi.fn<
                MetricQueryRepository['queryMetric']
            >()
                .mockResolvedValue(RESPONSE)
    
        const service =
            createMetricQueryService({
                repository: {
                    queryMetric,
                },
    
                appId: 'demo-web',
                now: () => NOW,
            })
    
        await service.query({
            type: 'web.vital.lcp',
            from:
                '2026-09-03T10:00:00.000Z',
            to:
                '2026-09-03T11:00:00.000Z',
            interval: 'minute',
        })
    
        expect(queryMetric).toHaveBeenCalledWith({
            appId: 'demo-web',
    
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
    
            from:
                new Date(
                    '2026-09-03T10:00:00.000Z',
                ),
    
            to:
                new Date(
                    '2026-09-03T11:00:00.000Z',
                ),
    
            interval: 'minute',
        })
    })

    it.each([
        {},
        {
            type: 'web.vital.unknown',
        },
        {
            type: null,
        },
    ])(
        'rejects an unsupported metric %#',
        async (input) => {
            const queryMetric =
                vi.fn<
                    MetricQueryRepository[
                        'queryMetric'
                    ]
                >()
    
            const service =
                createMetricQueryService({
                    repository: {
                        queryMetric,
                    },
    
                    appId: 'demo-web',
                    now: () => NOW,
                })
    
            await expect(
                service.query(input),
            ).resolves.toEqual({
                ok: false,
                code: 'UNSUPPORTED_METRIC',
            })
    
            expect(
                queryMetric,
            ).not.toHaveBeenCalled()
        },
    )

    it.each([
        {
            field: 'from' as const,
            input: {
                type: 'web.vital.lcp',
                from: 'not-a-date',
            },
        },
    
        {
            field: 'to' as const,
            input: {
                type: 'web.vital.lcp',
                to: 'not-a-date',
            },
        },
    ])(
        'rejects an invalid $field date',
        async ({
            field,
            input,
        }) => {
            const queryMetric =
                vi.fn<
                    MetricQueryRepository[
                        'queryMetric'
                    ]
                >()
    
            const service =
                createMetricQueryService({
                    repository: {
                        queryMetric,
                    },
    
                    appId: 'demo-web',
                    now: () => NOW,
                })
    
            await expect(
                service.query(input),
            ).resolves.toEqual({
                ok: false,
                code: 'INVALID_DATE',
                field,
            })
    
            expect(
                queryMetric,
            ).not.toHaveBeenCalled()
        },
    )

    it.each([
        {
            from:
                '2026-09-03T11:00:00.000Z',
            to:
                '2026-09-03T11:00:00.000Z',
        },
        {
            from:
                '2026-09-03T12:00:00.000Z',
            to:
                '2026-09-03T11:00:00.000Z',
        },
    ])(
        'rejects a non-increasing time range %#',
        async (input) => {
            const queryMetric =
                vi.fn<
                    MetricQueryRepository[
                        'queryMetric'
                    ]
                >()
    
            const service =
                createMetricQueryService({
                    repository: {
                        queryMetric,
                    },
    
                    appId: 'demo-web',
                    now: () => NOW,
                })
    
            await expect(
                service.query({
                    type: 'web.vital.lcp',
                    ...input,
                }),
            ).resolves.toEqual({
                ok: false,
                code: 'INVALID_TIME_RANGE',
            })
    
            expect(
                queryMetric,
            ).not.toHaveBeenCalled()
        },
    )

    it('rejects a time range longer than 30 days', async () => {
        const queryMetric =
            vi.fn<
                MetricQueryRepository[
                    'queryMetric'
                ]
            >()
    
        const service =
            createMetricQueryService({
                repository: {
                    queryMetric,
                },
    
                appId: 'demo-web',
                now: () => NOW,
            })
    
        await expect(
            service.query({
                type: 'web.vital.lcp',
    
                from:
                    new Date(
                        NOW - MAX_RANGE_MS - 1,
                    ).toISOString(),
    
                to:
                    new Date(NOW)
                        .toISOString(),
            }),
        ).resolves.toEqual({
            ok: false,
            code: 'TIME_RANGE_TOO_LARGE',
        })
    
        expect(
            queryMetric,
        ).not.toHaveBeenCalled()
    })

    it.each([
        'week',
        1,
        null,
    ])(
        'rejects invalid interval %s',
        async (interval) => {
            const queryMetric =
                vi.fn<
                    MetricQueryRepository[
                        'queryMetric'
                    ]
                >()
    
            const service =
                createMetricQueryService({
                    repository: {
                        queryMetric,
                    },
    
                    appId: 'demo-web',
                    now: () => NOW,
                })
    
            await expect(
                service.query({
                    type: 'web.vital.lcp',
                    interval,
                }),
            ).resolves.toEqual({
                ok: false,
                code: 'INVALID_INTERVAL',
            })
    
            expect(
                queryMetric,
            ).not.toHaveBeenCalled()
        },
    )

    it('accepts a time range of exactly 30 days', async () => {
        const queryMetric =
            vi.fn<
                MetricQueryRepository[
                    'queryMetric'
                ]
            >()
                .mockResolvedValue(RESPONSE)
    
        const service =
            createMetricQueryService({
                repository: {
                    queryMetric,
                },
    
                appId: 'demo-web',
                now: () => NOW,
            })
    
        const from =
            new Date(
                NOW - MAX_RANGE_MS,
            )
    
        const to =
            new Date(NOW)
    
        const result =
            await service.query({
                type: 'web.vital.lcp',
                from: from.toISOString(),
                to: to.toISOString(),
            })
    
        expect(result).toEqual({
            ok: true,
            value: RESPONSE,
        })
    
        expect(queryMetric)
            .toHaveBeenCalledWith(
                expect.objectContaining({
                    from,
                    to,
                }),
            )
    })

    it('reports storage failures', async () => {
        const cause =
            new Error(
                'database unavailable',
            )
    
        const queryMetric =
            vi.fn<
                MetricQueryRepository[
                    'queryMetric'
                ]
            >()
                .mockRejectedValue(cause)
    
        const service =
            createMetricQueryService({
                repository: {
                    queryMetric,
                },
    
                appId: 'demo-web',
                now: () => NOW,
            })
    
        await expect(
            service.query({
                type: 'web.vital.lcp',
            }),
        ).resolves.toEqual({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
            cause,
        })
    })
})
