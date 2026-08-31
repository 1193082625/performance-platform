import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    PaintMetricsResponse,
} from '@performance-platform/protocol'

import {
    createPaintMetricsApi,
} from './metrics.js'

const EMPTY_STATS = {
    count: 0,
    average: null,
    p50: null,
    p75: null,
    p90: null,
}
const METRICS_RESPONSE = {
    range: {
        from: '2026-08-29T00:00:00.000Z',
        to: '2026-08-30T00:00:00.000Z',
        interval: 'hour',
    },

    summary: {
        fp: EMPTY_STATS,
        fcp: EMPTY_STATS,
    },

    series: [],
    
    score: null,
} satisfies PaintMetricsResponse

describe('createPaintMetricsApi', () => {
    it('requests and returns paint metrics', async () => {
        const fetcher = vi.fn<typeof fetch>()

        fetcher.mockResolvedValue(
            new Response(
                JSON.stringify(
                    METRICS_RESPONSE,
                ),
                {
                    status: 200,

                    headers: {
                        'content-type':
                            'application/json',
                    },
                },
            ),
        )

        const api = createPaintMetricsApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        const result = await api.query({})

        expect(fetcher).toHaveBeenCalledWith(
            'http://localhost:5001/api/v1/metrics/paint',
            {
                headers: {
                    accept:
                        'application/json',
                },
            },
        )

        expect(result).toEqual(
            METRICS_RESPONSE,
        )
    })

    it('adds the selected range and interval to the URL', async () => {
        const fetcher = vi.fn<typeof fetch>()
    
        fetcher.mockResolvedValue(
            new Response(
                JSON.stringify(
                    METRICS_RESPONSE,
                ),
                {
                    status: 200,
    
                    headers: {
                        'content-type': 'application/json',
                    },
                },
            ),
        )
    
        const api = createPaintMetricsApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
    
        await api.query({
            from: '2026-08-29T00:00:00.000Z',
            to: '2026-08-30T00:00:00.000Z',
            interval: 'day',
        })
    
        expect(fetcher).toHaveBeenCalledOnce()
    
        const [requestedUrl] = fetcher.mock.calls[0]!
    
        const url = new URL(
            String(requestedUrl),
        )
    
        expect(
            Object.fromEntries(
                url.searchParams,
            ),
        ).toEqual({
            from: '2026-08-29T00:00:00.000Z',
            to: '2026-08-30T00:00:00.000Z',
            interval: 'day',
        })
    })
    it('rejects a non-successful response', async () => {
        const fetcher = vi.fn<typeof fetch>()
    
        fetcher.mockResolvedValue(
            new Response(
                JSON.stringify({
                    error: {
                        code: 'STORAGE_UNAVAILABLE',
                        message: 'metrics storage is temporarily unavailable',
                        requestId: 'request-1',
                    },
                }),
                {
                    status: 503,
                    headers: {
                        'content-type': 'application/json',
                    },
                },
            ),
        )
    
        const api = createPaintMetricsApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
    
        await expect(
            api.query({}),
        ).rejects.toThrow(
            'Metrics request failed with status 503',
        )
    })

})