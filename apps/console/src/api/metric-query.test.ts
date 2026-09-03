import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    MetricQueryResponse,
} from '@performance-platform/protocol'

import {
    createMetricQueryApi,
} from './metric-query.js'

const RESPONSE = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },

    range: {
        from: '2026-09-02T00:00:00.000Z',
        to: '2026-09-03T00:00:00.000Z',
        interval: 'hour',
    },

    summary: {
        count: 2,
        average: 156,
        p50: 128,
        p75: 184,
        p90: 184,
    },

    series: [],
} satisfies MetricQueryResponse

describe('createMetricQueryApi', () => {
    it('requests and returns one metric', async () => {
        const fetcher = vi.fn<typeof fetch>()

        fetcher.mockResolvedValue(
            new Response(
                JSON.stringify(RESPONSE),
                {
                    status: 200,

                    headers: {
                        'content-type':
                            'application/json',
                    },
                },
            ),
        )

        const api = createMetricQueryApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        const result = await api.query({
            type: 'web.vital.lcp',
            from: '2026-09-02T00:00:00.000Z',
            to: '2026-09-03T00:00:00.000Z',
            interval: 'hour',
        })

        expect(result).toEqual(RESPONSE)
        expect(fetcher).toHaveBeenCalledOnce()

        const [requestedUrl, init] =
            fetcher.mock.calls[0]!

        const url = new URL(
            String(requestedUrl),
        )

        expect(url.pathname).toBe(
            '/api/v2/metrics',
        )

        expect(
            Object.fromEntries(url.searchParams),
        ).toEqual({
            type: 'web.vital.lcp',
            from: '2026-09-02T00:00:00.000Z',
            to: '2026-09-03T00:00:00.000Z',
            interval: 'hour',
        })

        expect(init).toEqual({
            headers: {
                accept: 'application/json',
            },
        })
    })

    it('omits optional query parameters', async () => {
        const fetcher = vi.fn<typeof fetch>()
    
        fetcher.mockResolvedValue(
            new Response(
                JSON.stringify(RESPONSE),
                {
                    status: 200,
    
                    headers: {
                        'content-type':
                            'application/json',
                    },
                },
            ),
        )
    
        const api = createMetricQueryApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
    
        await api.query({
            type: 'web.vital.lcp',
        })
    
        const [requestedUrl] =
            fetcher.mock.calls[0]!
    
        const url = new URL(
            String(requestedUrl),
        )
    
        expect(
            Object.fromEntries(url.searchParams),
        ).toEqual({
            type: 'web.vital.lcp',
        })
    })

    it('rejects a non-successful response', async () => {
        const fetcher = vi.fn<typeof fetch>()
    
        fetcher.mockResolvedValue(
            new Response(
                JSON.stringify({
                    error: {
                        code: 'STORAGE_UNAVAILABLE',
                        message:
                            'metrics storage is temporarily unavailable',
                        requestId: 'request-1',
                    },
                }),
                {
                    status: 503,
    
                    headers: {
                        'content-type':
                            'application/json',
                    },
                },
            ),
        )
    
        const api = createMetricQueryApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
    
        await expect(
            api.query({
                type: 'web.vital.lcp',
            }),
        ).rejects.toThrow(
            'Metric query failed with status 503',
        )
    })
})