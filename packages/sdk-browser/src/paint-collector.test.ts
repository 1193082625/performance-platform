import {
    describe,
    it,
    expect,
    vi
} from 'vitest'

import {
    createPaintCollector,
} from './paint-collector'
import type { PaintEntryListLike, PaintSample } from './types/paintCollector.type'
import type { PageLifecycleLike } from './types/paintMonitor.type'

describe('createPaintCollector', () => {
    it('observes buffered paint entries when started', () => {
        const observe = vi.fn()
        const disconnect = vi.fn()

        const createObserver = vi.fn(
            (
                // _callback 中 _ 表示这个参数是接口要求的，但当前测试暂时不用
                _callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => ({
                observe,
                disconnect
            }),
        )

        const collector = createPaintCollector({
            timeOrigin: 1_787_620_000_000,
            createObserver,
            onSample: vi.fn(),
        })

        collector.start()
        
        expect(createObserver).toHaveBeenCalledTimes(1)
        expect(observe).toHaveBeenCalledWith({
            type: 'paint',
            buffered: true,
        })
    })

    it('converts FP and FCP entries into paint samples', () => {
        const timeOrigin = 1_000_000
        const onSample = vi.fn()

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined

        const createObserver = vi.fn(
            (
                callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => {
                observerCallback = callback

                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                }
            }
        )

        const collector = createPaintCollector({
            timeOrigin,
            createObserver,
            onSample
        })

        collector.start()

        if (observerCallback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        observerCallback({
            getEntries: () => [
                {
                    name: 'first-paint',
                    startTime: 123.4
                },
                {
                    name: 'first-contentful-paint',
                    startTime: 456.7
                }
            ]
        })

        expect(onSample).toHaveBeenNthCalledWith(1, {
            type: 'web.paint.fp',
            valueMs: 123.4,
            occurredAt: 1_000_123,
        })

        expect(onSample).toHaveBeenNthCalledWith(2, {
            type: 'web.paint.fcp',
            valueMs: 456.7,
            occurredAt: 1_000_457
        })

        expect(onSample).toHaveBeenCalledTimes(2)
    })

    it('ignore unknown entries and invalid  start times', () => {
        const onSample = vi.fn()

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined

        const createObserver = vi.fn(
            (
                callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => {
                observerCallback = callback

                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                }
            }
        )

        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample,
        })

        collector.start()

        if(observerCallback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        observerCallback({
            getEntries: () => [
                {
                    name: 'unknown-paint',
                    startTime: 100,
                },
                {
                    name: 'first-paint',
                    startTime: Number.NaN,
                },
                {
                    name: 'first-paint',
                    startTime: Number.POSITIVE_INFINITY,
                },
                {
                    name: 'first-contentful-paint',
                    startTime: Number.NEGATIVE_INFINITY,
                },
                {
                    name: 'first-contentful-paint',
                    startTime: -1,
                },
                {
                    name: 'first-paint',
                    startTime: 0,
                },
            ],
        })

        expect(onSample).toHaveBeenCalledTimes(1)

        expect(onSample).toHaveBeenCalledWith({
            type: 'web.paint.fp',
            valueMs: 0,
            occurredAt: 1_000_000,
        })
    })

    // 验证 start() 的幂等性
    // 同一个操作执行一次或多次，最终产生的有效结果相同
    it('starts only once when start is called repeatedly', () => {
        const observe = vi.fn()
        const disconnect = vi.fn()

        const createObserver = vi.fn(
            (
                _callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => ({
                observe,
                disconnect,
            }),
        )
    
        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample: vi.fn(),
        })

        collector.start()
        collector.start()
        collector.start()

        expect(createObserver).toHaveBeenCalledTimes(1)
        expect(observe).toHaveBeenCalledTimes(1)
    })

    it('disconnects once and cannot restart after being destroyed', () => {
        const observe = vi.fn()
        const disconnect = vi.fn()

        const createObserver = vi.fn(
            (
                _callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => ({
                observe,
                disconnect,
            }),
        )

        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample: vi.fn()
        })

        collector.start()

        collector.destroy()
        collector.destroy()

        collector.start()

        expect(disconnect).toHaveBeenCalledTimes(1)
        expect(createObserver).toHaveBeenCalledTimes(1)
        expect(observe).toHaveBeenCalledTimes(1)
    })

    // 测试浏览器没有 Observer API
    it('does not throw when the observer API is unavailable', () => {
        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            onSample: vi.fn(),
        })

        expect(() => collector.start()).not.toThrow()
    })

    // 测试 Observer 创建或启动失败
    it.each([
        {
            failure: 'creation',
            createObserver: () => {
                throw new Error('Observer creation failed')
            },
        },
        {
            failure: 'observation',
            createObserver: () => ({
                observe: () => {
                    throw new Error('Observer observation failed')
                },
                disconnect: vi.fn(),
            }),
        },
    ]) (
        'does not throw when observer $failure fails',
        ({createObserver}) => {
            const collector = createPaintCollector({
                timeOrigin: 1_000_000,
                createObserver,
                onSample: vi.fn(),
            })

            expect(() => collector.start()).not.toThrow()
        }
    )

    // 即使浏览器的 disconnect() 抛出异常，调用业务仍然不应感知，而且采集器仍然必须进入永久销毁状态
    it('does not throw when disconnect fails', () => {
        const disconnect = vi.fn(() => {
            throw new Error('Observer disconnection failed')
        })

        const createObserver = vi.fn(
            (
                _callback: (
                    entryList: PaintEntryListLike,
                ) => void
            ) => ({
                observe: vi.fn(),
                disconnect,
            }),
        )

        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample: vi.fn()
        })

        collector.start()

        expect(() => collector.destroy()).not.toThrow()
        expect(() => collector.destroy()).not.toThrow()

        collector.start()

        expect(disconnect).toHaveBeenCalledTimes(1)
        expect(createObserver).toHaveBeenCalledTimes(1)
    })

    // disconnect() 智能阻止后续观察，不一定能取消已经排队、即将执行的回调。
    // 因此采集器自身还需要检查销毁状态
    // 执行顺序： 启动 Observer -> 浏览器保存回调 -> 销毁采集器 -> 模拟已排队的回调继续执行 -> 不应产生 PintSample
    it('ignore queued observer callbacks after being destroyed', () => {
        const onSample = vi.fn()

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined
        
        const createObserver = vi.fn(
            (
                callback: (
                    entryList: PaintEntryListLike,
                ) => void
            ) => {
                observerCallback = callback

                return {
                    observe: vi.fn(),
                    disconnect: vi.fn()
                }
            },
        )

        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample,
        })

        collector.start()
        collector.destroy()

        if(observerCallback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        observerCallback({
            getEntries: () => [
                {
                    name: 'first-paint',
                    startTime: 100,
                }
            ]
        })

        expect(onSample).not.toHaveBeenCalled()
    })

    it('does not throw when the sample callback fails', () => {
        const onSample = vi.fn(() => {
            throw new Error('Sample callback failed')
        })

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined
        
        const createObserver = vi.fn(
            (
                callback: (
                    entryList: PaintEntryListLike,
                ) => void
            ) => {
                observerCallback = callback

                return {
                    observe: vi.fn(),
                    disconnect: vi.fn()
                }
            },
        )

        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample,
        })

        collector.start()

        const callback = observerCallback

        if(callback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        expect(() => {
            callback({
                getEntries: () => [
                    {
                        name: 'first-paint',
                        startTime: 100,
                    }
                ]
            })
        }).not.toThrow()
       

        expect(onSample).toHaveBeenCalledTimes(1)
    })

    it('continues processing entries when one sample callback fails', () => {
        const timeOrigin = 1_000_000
        const onSample = vi.fn((sample: PaintSample) => {
            if (sample.type === 'web.paint.fp') {
                throw new Error('FP sample callback failed')
            }
        })

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined

        const createObserver = vi.fn(
            (
                callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => {
                observerCallback = callback

                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                }
            }
        )

        const collector = createPaintCollector({
            timeOrigin,
            createObserver,
            onSample
        })

        collector.start()

        const callback = observerCallback
        if (callback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        expect(() => {
            callback({
                getEntries: () => [
                    {
                        name: 'first-paint',
                        startTime: 100
                    },
                    {
                        name: 'first-contentful-paint',
                        startTime: 200
                    }
                ]
            })
        }).not.toThrow()

        expect(onSample).toHaveBeenCalledTimes(2)

        // 明确要求 FP 失败之后的第二次调用是 FCP
        expect(onSample).toHaveBeenNthCalledWith(2, {
            type: 'web.paint.fcp',
            valueMs: 200,
            occurredAt: 1_000_200
        })
    })

    // isolates -- 孤立，隔离
    it('continues handling callbacks after getEntries fails', () => {
        const timeOrigin = 1_000_000
        const onSample = vi.fn()

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined

        const createObserver = vi.fn(
            (
                callback: (
                    entryList: PaintEntryListLike,
                ) => void,
            ) => {
                observerCallback = callback

                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                }
            }
        )

        const collector = createPaintCollector({
            timeOrigin,
            createObserver,
            onSample
        })

        collector.start()

        const callback = observerCallback
        if (callback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        expect(() => {
            callback({
                getEntries: () => {
                    throw new Error('getEntries failed')
                }
            })
        }).not.toThrow()

        expect(onSample).not.toHaveBeenCalled()

        callback({
            getEntries: () => [
                {
                    name: 'first-paint',
                    startTime: 100
                }
            ]
        })
        expect(onSample).toHaveBeenCalledTimes(1)
        expect(onSample).toHaveBeenCalledWith({
            type: 'web.paint.fp',
            valueMs: 100,
            occurredAt: 1_000_100,
        })
    })

    it('notifies once after all entries have been handled', () => {
        const callOrder: string[] = []

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined

        const createObserver = vi.fn((callback) => {
            observerCallback = callback

            return {
                observe: vi.fn(),
                disconnect: vi.fn(),
            }
        })

        const onEntriesComplete = vi.fn(() => {
            callOrder.push('complete')
        })

        const collector = createPaintCollector({
            timeOrigin: 1_000_000,
            createObserver,
            onSample: vi.fn((sample: PaintSample) => {
                callOrder.push(sample.type)
            }),
            onEntriesComplete,
        })

        collector.start()

        const callback = observerCallback
        if(callback === undefined) {
            throw new Error('Observer callback was not registered')
        }


        callback({
            getEntries: () => [
                {
                    name: 'first-paint',
                    startTime: 100,
                },
                {
                    name: 'first-contentful-paint',
                    startTime: 200,
                },
            ],
        })
        
        expect(callOrder).toEqual([
            'web.paint.fp',
            'web.paint.fcp',
            'complete',
        ])

        expect(onEntriesComplete).toHaveBeenCalledTimes(1)
    })
})