import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    MetricQueryParams,
    MetricQueryResponse,
} from '@performance-platform/protocol'

import {
    useMetricQuery,
} from './use-metric-query.js'

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

describe('useMetricQuery', () => {
    it('loads and stores one metric', async () => {
        const query = vi.fn<
            (
                params: MetricQueryParams,
            ) => Promise<MetricQueryResponse>
        >()

        query.mockResolvedValue(RESPONSE)

        const {
            loading,
            data,
            error,
            load,
        } = useMetricQuery({
            type: 'web.vital.lcp',
            query,
        })

        await load({
            interval: 'hour',
        })

        expect(query).toHaveBeenCalledWith({
            type: 'web.vital.lcp',
            interval: 'hour',
        })

        expect(loading.value).toBe(false)
        expect(error.value).toBeNull()
        expect(data.value).toEqual(RESPONSE)
    })

    it('enters loading state while the request is pending', () => {
        const query = vi.fn<
            (
                params: MetricQueryParams,
            ) => Promise<MetricQueryResponse>
        >()

        query.mockReturnValue(
            new Promise(() => {
                // Keep the request pending.
            }),
        )

        const {
            loading,
            load,
        } = useMetricQuery({
            type: 'web.vital.lcp',
            query,
        })

        void load()

        expect(loading.value).toBe(true)
    })

    it('stores an error when loading fails', async () => {
        const query = vi.fn<
            (
                params: MetricQueryParams,
            ) => Promise<MetricQueryResponse>
        >()

        query.mockRejectedValue(
            new Error('network unavailable'),
        )

        const {
            loading,
            data,
            error,
            load,
        } = useMetricQuery({
            type: 'web.vital.lcp',
            query,
        })

        await expect(load()).resolves.toBeUndefined()

        expect(loading.value).toBe(false)
        expect(data.value).toBeNull()
        expect(error.value).toBe('Unable to load metric')
    })

    it('clears a previous error after a successful retry', async () => {
        const query = vi.fn<
            (
                params: MetricQueryParams,
            ) => Promise<MetricQueryResponse>
        >()

        query
            .mockRejectedValueOnce(
                new Error('network unavailable'),
            )
            .mockResolvedValueOnce(RESPONSE)

        const {
            data,
            error,
            load,
        } = useMetricQuery({
            type: 'web.vital.lcp',
            query,
        })

        await load()
        expect(error.value).toBe('Unable to load metric')

        await load()
        expect(error.value).toBeNull()
        expect(data.value).toEqual(RESPONSE)
    })

    it('does not let an older response overwrite newer data', async () => {
        const olderRequest = createDeferred<MetricQueryResponse>()
        const newerRequest = createDeferred<MetricQueryResponse>()
        const newerResponse = {
            ...RESPONSE,
            summary: {
                ...RESPONSE.summary,
                average: 220,
            },
        } satisfies MetricQueryResponse

        const query = vi.fn<
            (
                params: MetricQueryParams,
            ) => Promise<MetricQueryResponse>
        >()

        query
            .mockReturnValueOnce(olderRequest.promise)
            .mockReturnValueOnce(newerRequest.promise)

        const {
            data,
            load,
        } = useMetricQuery({
            type: 'web.vital.lcp',
            query,
        })

        const olderLoad = load({ interval: 'hour' })
        const newerLoad = load({ interval: 'day' })

        newerRequest.resolve(newerResponse)
        await newerLoad

        olderRequest.resolve(RESPONSE)
        await olderLoad

        expect(data.value).toEqual(newerResponse)
    })

    it('loads the selected range for the fixed metric', async () => {
        const now = Date.UTC(2026, 8, 3, 8, 0, 0)
        const query = vi.fn<
            (
                params: MetricQueryParams,
            ) => Promise<MetricQueryResponse>
        >()

        query.mockResolvedValue(RESPONSE)

        const {
            loadRange,
        } = useMetricQuery({
            type: 'web.vital.lcp',
            query,
            now: () => now,
        })

        await loadRange('7d')

        expect(query).toHaveBeenCalledWith({
            type: 'web.vital.lcp',
            from: new Date(
                now - 7 * 24 * 60 * 60 * 1_000,
            ).toISOString(),
            to: new Date(now).toISOString(),
            interval: 'day',
        })
    })
})
