import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    LcpMetricLike
} from './types/lcpCollector.type'

import {
    createLcpCollector,
} from './lcp-collector'

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
        let callback:
            | ((metric: LcpMetricLike) => void)
            | undefined
        
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
            throw new Error(
                'LCP callback was not registered',
            )
        }

        callback({
            value: 2300.4,
        })

        expect(onSample).toHaveBeenCalledWith({
            type: 'web.vital.lcp',
            occurredAt: 1_002_300,
            metricVersion: 'lcp-v1',

            payload: {
                value: 2300.4,
                unit: 'ms',
            },
        })
    })

    it('ignores callbacks after being destroyed', () => {
        let callback:
            | ((
                metric: LcpMetricLike,
            ) => void)
            | undefined

        const onSample = vi.fn()

        const collector =
            createLcpCollector({
                timeOrigin: 1_000_000,

                observeLcp: (listener) => {
                    callback = listener
                },

                onSample,
            })

        collector.start()
        collector.destroy()

        if (callback === undefined) {
            throw new Error(
                'LCP callback was not registered',
            )
        }

        callback({
            value: 2300,
        })

        expect(
            onSample,
        ).not.toHaveBeenCalled()
    })

    it('reports at most one LCP sample per view', () => {
        let callback:
            | ((metric: LcpMetricLike) => void)
            | undefined
    
        const onSample = vi.fn()
    
        const collector =
            createLcpCollector({
                timeOrigin: 1_000_000,
    
                observeLcp: (listener) => {
                    callback = listener
                },
    
                onSample,
            })
    
        collector.start()
    
        if (callback === undefined) {
            throw new Error(
                'LCP callback was not registered',
            )
        }
    
        callback({ value: 2300 })
        callback({ value: 2500 })
    
        expect(onSample).toHaveBeenCalledTimes(1)
    
        expect(onSample).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: {
                    value: 2300,
                    unit: 'ms',
                },
            }),
        )
    })

    it.each([
        Number.NaN,
        Number.POSITIVE_INFINITY,
        -1,
    ])(
        'ignores invalid LCP value %s',
        (value) => {
            let callback:
                | ((metric: LcpMetricLike) => void)
                | undefined
    
            const onSample = vi.fn()
    
            const collector =
                createLcpCollector({
                    timeOrigin: 1_000_000,
    
                    observeLcp: (listener) => {
                        callback = listener
                    },
    
                    onSample,
                })
    
            collector.start()
    
            if (callback === undefined) {
                throw new Error(
                    'LCP callback was not registered',
                )
            }
    
            callback({ value })
    
            expect(
                onSample,
            ).not.toHaveBeenCalled()
        },
    )

    it('does not throw when the LCP API is unavailable', () => {
        const collector =
            createLcpCollector({
                timeOrigin: 1_000_000,
                onSample: vi.fn(),
            })
    
        expect(() => {
            collector.start()
        }).not.toThrow()
    })
    
    it('does not throw when LCP registration fails', () => {
        const collector =
            createLcpCollector({
                timeOrigin: 1_000_000,
    
                observeLcp: () => {
                    throw new Error(
                        'LCP registration failed',
                    )
                },
    
                onSample: vi.fn(),
            })
    
        expect(() => {
            collector.start()
        }).not.toThrow()
    })
})