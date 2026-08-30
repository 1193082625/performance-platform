import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    PaintMetricsQueryParams,
    PaintMetricsResponse,
} from '@performance-platform/protocol'

import {
    usePaintMetrics,
} from './use-paint-metrics.js'

const NOW = Date.UTC(2026, 7, 30, 8, 0, 0)
const ONE_DAY_MS = 24 * 60 * 60 * 1_000
const ONE_HOUR_MS = 60 * 60 * 1_000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000
const METRICS_RESPONSE: PaintMetricsResponse = {
    range: {
        from: '2026-08-29T00:00:00.000Z',
        to: '2026-08-30T00:00:00.000Z',
        interval: 'hour',
    },

    summary: {
        fp: {
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
        },

        fcp: {
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
        },
    },

    series: [],
}

function createDeferred<T>() {
    let resolve!: (value: T) => void

    const promise = new Promise<T>(
        (resolvePromise) => {
            resolve = resolvePromise
        },
    )

    return {
        promise,
        resolve,
    }
}

describe('usePaintMetrics', () => {
    it('enters loading state while the request is pending', () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()

        query.mockReturnValue(
            new Promise(() => {
                // 故意保持 pending
            }),
        )

        const {
            loading,
            load,
        } = usePaintMetrics({
            query,
        })

        void load({})

        expect(loading.value).toBe(true)
    })
    it('stores data after a successful request', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query.mockResolvedValue(
            METRICS_RESPONSE,
        )
    
        const {
            loading,
            data,
            load,
        } = usePaintMetrics({
            query,
        })
    
        await load({})
    
        expect(loading.value).toBe(false)
    
        expect(data.value).toEqual(
            METRICS_RESPONSE,
        )
    })
    it('stores an error when the request fails', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query.mockRejectedValue(
            new Error('network unavailable'),
        )
    
        const {
            loading,
            data,
            error,
            load,
        } = usePaintMetrics({
            query,
        })
    
        await expect(
            load({}),
        ).resolves.toBeUndefined()
    
        expect(loading.value).toBe(false)
        expect(data.value).toBeNull()
    
        expect(error.value).toBe(
            'Unable to load performance metrics',
        )
    })
    it('clears the previous error after a successful retry', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query
            .mockRejectedValueOnce(
                new Error('network unavailable'),
            )
            .mockResolvedValueOnce(
                METRICS_RESPONSE,
            )
    
        const {
            data,
            error,
            load,
        } = usePaintMetrics({
            query,
        })
    
        await load({})
    
        expect(error.value).toBe(
            'Unable to load performance metrics',
        )
    
        await load({})
    
        expect(error.value).toBeNull()
    
        expect(data.value).toEqual(
            METRICS_RESPONSE,
        )
    })
    it('does not let an older response overwrite newer data', async () => {
        const olderRequest = createDeferred<PaintMetricsResponse>()
    
        const newerRequest = createDeferred<PaintMetricsResponse>()
    
        const newerResponse: PaintMetricsResponse = {
            ...METRICS_RESPONSE,
    
            range: {
                ...METRICS_RESPONSE.range,
                interval: 'day',
            },
        }
    
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query
            .mockReturnValueOnce(
                olderRequest.promise,
            )
            .mockReturnValueOnce(
                newerRequest.promise,
            )
    
        const {
            data,
            load,
        } = usePaintMetrics({
            query,
        })
    
        const olderLoad = load({
            interval: 'hour',
        })
    
        const newerLoad = load({
            interval: 'day',
        })
    
        newerRequest.resolve(
            newerResponse,
        )
    
        await newerLoad
    
        expect(data.value).toEqual(
            newerResponse,
        )
    
        olderRequest.resolve(
            METRICS_RESPONSE,
        )
    
        await olderLoad
    
        expect(data.value).toEqual(
            newerResponse,
        )
    })
    it('loads the previous 24 hours by default', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query.mockResolvedValue(
            METRICS_RESPONSE,
        )
    
        const {
            loadRange,
        } = usePaintMetrics({
            query,
            now: () => NOW,
        })
    
        await loadRange()
    
        expect(query).toHaveBeenCalledWith({
            from:
                new Date(
                    NOW - ONE_DAY_MS,
                ).toISOString(),
    
            to:
                new Date(NOW).toISOString(),
    
            interval:
                'hour',
        })
    })
    it('uses minute buckets for the previous hour', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query.mockResolvedValue(
            METRICS_RESPONSE,
        )
    
        const {
            loadRange,
        } = usePaintMetrics({
            query,
            now: () => NOW,
        })
    
        await loadRange('1h')
    
        expect(query).toHaveBeenCalledWith({
            from: new Date(
                    NOW - ONE_HOUR_MS,
                ).toISOString(),
            to: new Date(NOW).toISOString(),
            interval: 'minute',
        })
    })
    it('uses day buckets for the previous seven days', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query.mockResolvedValue(
            METRICS_RESPONSE,
        )
    
        const {
            loadRange,
        } = usePaintMetrics({
            query,
            now: () => NOW,
        })
    
        await loadRange('7d')
    
        expect(query).toHaveBeenCalledWith({
            from:
                new Date(
                    NOW - SEVEN_DAYS_MS,
                ).toISOString(),
    
            to:
                new Date(NOW).toISOString(),
    
            interval:
                'day',
        })
    })
    it('uses day buckets for the previous thirty days', async () => {
        const query = vi.fn<
            (
                params: PaintMetricsQueryParams,
            ) => Promise<PaintMetricsResponse>
        >()
    
        query.mockResolvedValue(
            METRICS_RESPONSE,
        )
    
        const {
            loadRange,
        } = usePaintMetrics({
            query,
            now: () => NOW,
        })
    
        await loadRange('30d')
    
        expect(query).toHaveBeenCalledWith({
            from:
                new Date(
                    NOW - THIRTY_DAYS_MS,
                ).toISOString(),
    
            to:
                new Date(NOW).toISOString(),
    
            interval:
                'day',
        })
    })
})