import {
    describe,
    it,
    expect,
    vi,
} from 'vitest'
import type { PaintEntryListLike, PaintSample } from './types/paintCollector.type'
import {
    createPaintMonitor,
    createPaintMonitorWithDependencies
} from './create-paint-monitor'
import type { PageLifecycleLike } from './types/paintMonitor.type'
import { SESSION_ID_STORAGE_KEY } from './ids'
import { createPaintCollector } from './paint-collector'

const SESSION_ID = 'session-test-1'
const VIEW_ID = '04f080c8-0625-4b76-a53e-d67f99a03380'
const EVENT_ID = '7ae498ca-1dc3-4cf7-be84-67e3c8cd2e1a'

const ENDPOINT = '/api/v1/events/batch'

describe('createPaintMonitor', () => {
    it('collects a paint sample and reports a complete event', async () => {
        const randomUUID = vi.fn()
            .mockReturnValueOnce(VIEW_ID)
            .mockReturnValueOnce(EVENT_ID)
        
        const sessionStorage = {
            getItem: vi.fn(() => SESSION_ID),
            setItem: vi.fn(),
        }

        // 捕获 observer 回调
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

        const sendBeacon = vi.fn(() => true)

        const monitor = createPaintMonitorWithDependencies({
            appId: 'demo-web',
            appVersion: '0.1.0+test',
            environment: 'test',
            endpoint: ENDPOINT,
        }, {
            timeOrigin: 1_000_000,
            randomUUID,
            sessionStorage,
            createObserver,
            sendBeacon,
        })

        monitor.start()

        const callback = observerCallback

        if (callback === undefined) {
            throw new Error(
                'Observer callback was not registered',
            )
        }
        callback({
            getEntries: () => [
                {
                    name: 'first-contentful-paint',
                    startTime: 260.4,
                }
            ]
        })

        await monitor.flush()

        expect(sendBeacon).toHaveBeenCalledWith(
            ENDPOINT,
            JSON.stringify({
                events: [
                    {
                        schemaVersion: '1.0',
                        eventId: EVENT_ID,
                        type: 'web.paint.fcp',
                        timestamp: 1_000_260,
        
                        application: {
                            id: 'demo-web',
                            version: '0.1.0+test',
                            environment: 'test',
                        },
        
                        runtime: {
                            platform: 'web',
                            sdk: {
                                name: '@performance-platform/browser',
                                version: '0.1.0',
                            },
                        },
        
                        session: {
                            sessionId: SESSION_ID,
                            viewId: VIEW_ID,
                        },
        
                        payload: {
                            value: 260.4,
                            unit: 'ms',
                        },
                    }
                ]
            })
        )
    })

    // 浏览器切换标签页、最小化或准备离开时，会触发 visibilitychange，然后触发 Reporter 的 flush()
    /**
     * start() 安装 visibilitychange 监听；
     * 重复 start() 不重复安装；
     * 页面仍 visible 时不发送；
     * 页面变 hidden 时发送队列。
     */
    it('registers the visibility listener once and flushes when hidden', async () => {
        const randomUUID = vi.fn()
            .mockReturnValueOnce(VIEW_ID)
            .mockReturnValueOnce(EVENT_ID)
        
        const sessionStorage = {
            getItem: vi.fn(() => SESSION_ID),
            setItem: vi.fn(),
        }

        // 捕获 observer 回调
        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined
        
        const disconnect = vi.fn()

        const createObserver = vi.fn((callback) => {
            observerCallback = callback

            return {
                observe: vi.fn(),
                disconnect,
            }
        })

        const sendBeacon = vi.fn(
            (
                _endpoint: string,
                _body: string,
            ): boolean => false,
        )
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)

        let visibilityListener:
            | (() => void)
            | undefined

        const pageLifecycle: PageLifecycleLike = {
            visibilityState: 'visible',
            addEventListener: vi.fn(
                (_type, listener) => {
                    visibilityListener = listener
                }
            ),
            removeEventListener: vi.fn(() => {
                throw new Error(
                    'Failed to remove visibility listener'
                )
            }),
        }

        const monitor = createPaintMonitorWithDependencies({
            appId: 'demo-web',
            appVersion: '0.1.0+test',
            environment: 'test',
            endpoint: ENDPOINT,
        }, {
            timeOrigin: 1_000_000,
            randomUUID,
            sessionStorage,
            createObserver,
            sendBeacon,
            pageLifecycle
        })

        monitor.start()
        monitor.start()

        expect(
            pageLifecycle.addEventListener
        ).toHaveBeenCalledTimes(1)

        expect(
            pageLifecycle.addEventListener
        ).toHaveBeenCalledWith(
            'visibilitychange',
            expect.any(Function)
        )

        const callback = observerCallback
        if (callback === undefined) {
            throw new Error('Observer callback was not registered')
        }

        callback({
            getEntries: () => [
                {
                    name: 'first-contentful-paint',
                    startTime: 260.4
                }
            ]
        })
        // 等待自动 flush 完整结束；第一次 Beacon 返回 false，事件留在队列
        await monitor.flush()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        const listener = visibilityListener

        if (listener === undefined) {
            throw new Error(
                'Visibility listener was not registered',
            )
        }

        listener()

        expect(sendBeacon).toHaveBeenCalledTimes(1)

        pageLifecycle.visibilityState = 'hidden'

        listener()

        // 加入刚才由 visibility listener 启动的 flush
        await monitor.flush()

        expect(sendBeacon).toHaveBeenCalledTimes(2)

        expect(sendBeacon).toHaveBeenLastCalledWith(
            ENDPOINT,
            expect.stringContaining(
                '"type":"web.paint.fcp"',
            ),
        )

        expect(() => monitor.destroy()).not.toThrow()
        expect(() => monitor.destroy()).not.toThrow()

        expect(disconnect).toHaveBeenCalledTimes(1)
        expect(pageLifecycle.removeEventListener).toHaveBeenCalledTimes(1)
        expect(pageLifecycle.removeEventListener).toHaveBeenCalledWith(
            'visibilitychange',
            listener
        )

        monitor.start()
        expect(pageLifecycle.addEventListener).toHaveBeenCalledTimes(1)
    })

    // 证明公开函数能使用真实浏览器依赖。
    it('create a monitor from browser globals', async () => {
        const observe = vi.fn()
        const disconnect = vi.fn()

        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined
        
        // 伪造浏览器的 PerformanceObserver 构造函数
        // 模拟一个可以被 new 调用的构造函数，const observer = new PerformanceObserverMock()，执行new时，js 会自动创建一个新对象，并让函数内部的this指向这个对象
        const PerformanceObserverMock = vi.fn(function(
            this: {
                observe: typeof observe,
                disconnect: typeof disconnect
            },
            callback: (
                entryList: PaintEntryListLike,
            ) => void,
        ) {
            observerCallback = callback
            this.observe = observe
            this.disconnect = disconnect
        })

        // 相当于临时设置 globalThis.PerformanceObserver = PerformanceObserverMock
        vi.stubGlobal(
            'PerformanceObserver',
            PerformanceObserverMock
        )

        const sessionStorageMock = {
            getItem: vi.fn(() => SESSION_ID),
            setItem: vi.fn(),
        }
        vi.stubGlobal(
            'sessionStorage',
            sessionStorageMock,
        )

        const navigatorMock = {
            sendBeacon: vi.fn(function (
                this: unknown,
            ) {
                expect(this).toBe(navigatorMock)
                return false
            }),
        }
        vi.stubGlobal('navigator', navigatorMock)

        const fetchMock = vi.fn(
            async () => ({ok: true})
        )
        vi.stubGlobal('fetch', fetchMock)

        // document 页面生成周期
        let visibilityListener:
            | (() => void)
            | undefined
        const documentMock = {
            visibilityState: 'visible',
            addEventListener: vi.fn(
                (_type, listener: () => void) => {
                    visibilityListener = listener
                },
            ),
            removeEventListener: vi.fn(),
        }
        vi.stubGlobal(
            'document',
            documentMock
        )

        try {
            const monitor = createPaintMonitor({
                appId: 'demo-web',
                appVersion: '0.1.0+test',
                environment: 'test',
                endpoint: ENDPOINT,
            })

            monitor.start()

            expect(
                documentMock.addEventListener
            ).toHaveBeenCalledWith(
                'visibilitychange',
                expect.any(Function)
            )

            const callback = observerCallback
            if (callback === undefined) {
                throw new Error(
                    'Observer callback was not registered'
                )
            }
            callback({
                getEntries: () => [
                    {
                        name: 'first-contentful-paint',
                        startTime: 260.4
                    }
                ]
            })

            const listener = visibilityListener
            if (listener === undefined) {
                throw new Error('Visibility listener was not registered')
            }
            documentMock.visibilityState = 'hidden'
            listener()


            expect(monitor).toEqual({
                start: expect.any(Function),
                flush: expect.any(Function),
                destroy: expect.any(Function),
            })
            expect(PerformanceObserverMock).toHaveBeenCalledTimes(1)
            expect(observe).toHaveBeenCalledWith({
                type: 'paint',
                buffered: true
            })

            expect(
                sessionStorageMock.getItem
            ).toHaveBeenCalledWith(
                SESSION_ID_STORAGE_KEY
            )

            expect(navigatorMock.sendBeacon).toHaveBeenCalledWith(
                ENDPOINT,
                expect.stringContaining(
                    '"type":"web.paint.fcp"'
                )
            )

            // 测试不能直接 await listener()，因为它返回 void
            // 可以等待 fetch 断言最终成立
            await vi.waitFor(() => {
                expect(fetchMock).toHaveBeenCalledWith(
                    ENDPOINT,
                    {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: expect.stringContaining(
                            '"type":"web.paint.fcp"',
                        ),
                        keepalive: true,
                    }
                )
            })

            monitor.destroy()
            expect(documentMock.removeEventListener).toHaveBeenCalledWith(
                'visibilitychange',
                listener
            )
        } finally {
            // 清理替换过的全局对象
            vi.unstubAllGlobals()
        }
    })

    it('flushes the current paint entries automatically', async () => {
        const randomUUID = vi.fn()
            .mockReturnValueOnce(VIEW_ID)
            .mockReturnValueOnce(EVENT_ID)
        
        let observerCallback:
            | ((entryList: PaintEntryListLike) => void)
            | undefined
        const createObserver = vi.fn((callback) => {
            observerCallback = callback
            return {
                observe: vi.fn(),
                disconnect: vi.fn()
            }
        })

        const sendBeacon = vi.fn(
            (
                _endpoint: string,
                _body: string,
            ): boolean => true,
        )

        const monitor = createPaintMonitorWithDependencies(
            {
                appId: 'demo-web',
                appVersion: '0.1.0+test',
                environment: 'test',
                endpoint: ENDPOINT,
            },
            {
                timeOrigin: 1_000_000,
                randomUUID,
                sessionStorage: {
                    getItem: vi.fn(() => SESSION_ID),
                    setItem: vi.fn(),
                },
                createObserver,
                sendBeacon,
            },
        )
        monitor.start()

        const callback = observerCallback

        if (callback === undefined) {
            throw new Error(
                'Observer callback was not registered',
            )
        }
        callback({
            getEntries: () => [
                {
                    name: 'first-contentful-paint',
                    startTime: 260.4,
                },
            ],
        })
        await vi.waitFor(() => {
            expect(sendBeacon).toHaveBeenCalledTimes(1)
        })
        const call = sendBeacon.mock.calls[0]
        if (call === undefined) {
            throw new Error(
                'Expected sendBeacon to be called',
            )
        }
        const [, body] = call
        const request = JSON.parse(body)
        expect(
            request.events.map(
                (event: {
                    type: string
                }) => event.type,
            ),
        ).toEqual([
            'web.paint.fcp',
        ])
    })

})