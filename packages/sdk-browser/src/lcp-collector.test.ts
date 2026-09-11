import { describe, expect, it, vi } from 'vitest'

import type { LcpMetricLike } from './types/lcpCollector.type'

import { createLcpCollector } from './lcp-collector'

describe('createLcpCollector', () => {
    it('registers the LCP observer only once', () => {
        const observeLcp = vi.fn()

        const collector = createLcpCollector({
            timeOrigin: 1_000_000,
            observeLcp,
            onSample: vi.fn(),
        })

        collector.start()
        collector.start()
        collector.start()

        expect(observeLcp).toHaveBeenCalledTimes(1)
    })

    it('converts the final LCP metric into a sample', () => {
        let callback: ((metric: LcpMetricLike) => void) | undefined

        const onSample = vi.fn()

        const collector = createLcpCollector({
            timeOrigin: 1_000_000,
            observeLcp: (listener) => {
                callback = listener
            },
            onSample,
        })

        collector.start()

        if (callback === undefined) {
            throw new Error('LCP callback was not registered')
        }

        callback({
            value: 2300.4,
            attribution: {
                timeToFirstByte: 800,
                resourceLoadDelay: 300,
                resourceLoadDuration: 900,
                elementRenderDelay: 300.4,
                element: '.hero-image',
                url: 'https://example.com/hero.webp',
            },
        })
        collector.finalize()

        expect(onSample).toHaveBeenCalledWith({
            type: 'web.vital.lcp',
            occurredAt: 1_002_300,
            metricVersion: 'lcp-v1',

            payload: {
                value: 2300.4,
                unit: 'ms',
                attribution: {
                    timeToFirstByte: 800,
                    resourceLoadDelay: 300,
                    resourceLoadDuration: 900,
                    elementRenderDelay: 300.4,
                    element: '.hero-image',
                    url: 'https://example.com/hero.webp',
                },
            },
        })
    })

    it('ignores callbacks after being destroyed', () => {
        let callback: ((metric: LcpMetricLike) => void) | undefined

        const onSample = vi.fn()

        const collector = createLcpCollector({
            timeOrigin: 1_000_000,

            observeLcp: (listener) => {
                callback = listener
            },

            onSample,
        })

        collector.start()
        collector.destroy()

        if (callback === undefined) {
            throw new Error('LCP callback was not registered')
        }

        callback({
            value: 2300,
        })

        expect(onSample).not.toHaveBeenCalled()
    })

    it('reports at most one LCP sample per view', () => {
        let callback: ((metric: LcpMetricLike) => void) | undefined

        const onSample = vi.fn()

        const collector = createLcpCollector({
            timeOrigin: 1_000_000,

            observeLcp: (listener) => {
                callback = listener
            },

            onSample,
        })

        collector.start()

        if (callback === undefined) {
            throw new Error('LCP callback was not registered')
        }

        callback({ value: 2300 })
        callback({ value: 2500 })
        collector.finalize()
        collector.finalize()

        expect(onSample).toHaveBeenCalledTimes(1)

        expect(onSample).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: {
                    value: 2500,
                    unit: 'ms',
                },
            }),
        )
    })

    it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
        'ignores invalid LCP value %s',
        (value) => {
            let callback: ((metric: LcpMetricLike) => void) | undefined

            const onSample = vi.fn()

            const collector = createLcpCollector({
                timeOrigin: 1_000_000,

                observeLcp: (listener) => {
                    callback = listener
                },

                onSample,
            })

            collector.start()

            if (callback === undefined) {
                throw new Error('LCP callback was not registered')
            }

            callback({ value })
            collector.finalize()

            expect(onSample).not.toHaveBeenCalled()
        },
    )

    it('does not throw when the LCP API is unavailable', () => {
        const collector = createLcpCollector({
            timeOrigin: 1_000_000,
            onSample: vi.fn(),
        })

        expect(() => {
            collector.start()
        }).not.toThrow()
    })

    it('does not throw when LCP registration fails', () => {
        const collector = createLcpCollector({
            timeOrigin: 1_000_000,

            observeLcp: () => {
                throw new Error('LCP registration failed')
            },

            onSample: vi.fn(),
        })

        expect(() => {
            collector.start()
        }).not.toThrow()
    })
})
