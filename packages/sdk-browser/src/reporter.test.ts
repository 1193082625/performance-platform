import {
    describe,
    it,
    expect,
    vi,
} from 'vitest'
import { createReporter } from './reporter'
import type { PaintEventV1 } from "@performance-platform/protocol"

const NOW = Date.UTC(2026, 7, 24, 10, 0, 0)
const ENDPOINT = '/api/v1/events/batch'

function makeEvent(value = 260.4): PaintEventV1 {
    return {
        schemaVersion: '1.0',
        eventId: '075f9a46-f934-45e3-b355-e20490e90bb4',
        type: 'web.paint.fcp',
        timestamp: NOW - 1_000,
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
            sessionId: 'session-test-1',
            viewId: 'view-test-1',
        },
    
        payload: {
            value,
            unit: 'ms',
        },
    }
}

describe('Reporter', () => {
    it('sends an enqueued event with Beacon and clears it when accepted', async () => {
        const event = makeEvent()

        const sendBeacon = vi.fn(
            (
                _endpoint: string,
                _body: string,
            ) => true,
        )
        const fetchTransport = vi.fn(
            async () => ({
                ok: true,
            }),
        )

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport
        })

        reporter.enqueue(event)

        await reporter.flush()

        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(sendBeacon).toHaveBeenCalledWith(
            ENDPOINT,
            JSON.stringify({
                events: [event]
            })
        )

        expect(fetchTransport).not.toHaveBeenCalled()

        await reporter.flush()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
    })

    // falls back to -- 回退到
    // declines -- 拒绝接受
    // batch -- 当前事件批次
    it('falls back to fetch when Beacon declines the batch', async () => {
        const event = makeEvent()
        const sendBeacon = vi.fn(() => false)

        const fetchTransport = vi.fn(
            async () => ({
                ok: true,
            }),
        )

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport
        })

        reporter.enqueue(event)

        await reporter.flush()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledWith(
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    events: [event]
                }),
                keepalive: true,
            }
        )

        await reporter.flush()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
    })

    it('keeps the batch when fetch returns an unsuccessful response', async () => {
        const event = makeEvent()

        const sendBeacon = vi.fn(() => false)

        const fetchTransport = vi.fn(
            async () => ({
                ok: false
            })
        )

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport
        })

        reporter.enqueue(event)
        
        // 表示 HTTP 非成功响应 属于可处理的传输失败，不应该让业务调用者收到异常
        await expect(reporter.flush()).resolves.toBeUndefined()

        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
        

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(2)
        expect(fetchTransport).toHaveBeenCalledTimes(2)
        expect(fetchTransport).toHaveBeenNthCalledWith(
            2,
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    events: [event]
                }),
                keepalive: true,
            }
        )
    })

    it('falls back to fetch when Beacon throws', async () => {
        const event = makeEvent()
        const beaconError = new Error('Beacon failed')
        const sendBeacon = vi.fn(() => {
            throw beaconError
        })

        const fetchTransport = vi.fn(
            async () => ({ok: true})
        )

        const debug = vi.fn()

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport,
            debug
        })

        reporter.enqueue(event)
        
        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledWith(
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    events: [event]
                }),
                keepalive: true,
            }
        )
        expect(debug).toHaveBeenCalledTimes(1)
        expect(debug).toHaveBeenCalledWith(
            'Beacon transport failed',
            beaconError
        )


        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
    })

    it('keeps the batch and reports debug information when fetch rejects', async () => {
        const event = makeEvent()
        const sendBeacon = vi.fn(() => false)
        const networkError = new Error('Network unavailable')
        const fetchTransport = vi.fn(async () => {
            throw networkError
        })
        const debugFn = vi.fn()
        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport,
            debug: debugFn
        })

        reporter.enqueue(event)
        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
        expect(debugFn).toHaveBeenCalledTimes(1)
        expect(debugFn).toHaveBeenNthCalledWith(
            1,
            'Fetch transport failed',
            networkError
        )

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(2)
        expect(fetchTransport).toHaveBeenCalledTimes(2)
        expect(debugFn).toHaveBeenCalledTimes(2)
        expect(debugFn).toHaveBeenNthCalledWith(
            2,
            'Fetch transport failed',
            networkError
        )
    })

    it('uses fetch when Beacon is unavailable', async () => {
        const event = makeEvent()
        const fetchTransport = vi.fn(async () => ({
            ok: true
        }))

        const reporter = createReporter({
            endpoint: ENDPOINT,
            fetch: fetchTransport
        })

        reporter.enqueue(event)

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(fetchTransport).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledWith(
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    events: [event]
                }),
                keepalive: true,
            }
        )

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(fetchTransport).toHaveBeenCalledTimes(1)
    })

    it('sends at most 20 events per flush', async () => {
        const events = Array.from(
            {length: 21},
            (_, index) => makeEvent(index)
        )

        const sendBeacon = vi.fn(() => true)

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
        })

        for (const event of events) {
            reporter.enqueue(event)
        }

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(sendBeacon).toHaveBeenNthCalledWith(
            1,
            ENDPOINT,
            JSON.stringify({events: events.slice(0, 20)})
        )

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(2)
        expect(sendBeacon).toHaveBeenNthCalledWith(
            2,
            ENDPOINT,
            JSON.stringify({events: events.slice(20)})
        )

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(2)
    })

    it('does not send the same batch twice during concurrent flushes', async () => {
        const event = makeEvent()

        const sendBeacon = vi.fn(() => false)

        // 一个函数，调用这个函数，可以让 pending Promise 完成
        let resolveFetch:
            | ((response: { ok: boolean }) => void)
            | undefined

        // 手动控制 Fetch 什么时候完成
        const pendingResponse = new Promise<{ ok: boolean }>(
            (resolve) => {
                // 把 resolve 函数保存到外部变量 resolveFetch
                // 这样后面的测试可以决定什么时候完成 Promise
                resolveFetch = resolve
            },
        )

        const fetchTransport = vi.fn(
            () => pendingResponse,
        )

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport
        })

        reporter.enqueue(event)

        const firstFlush = reporter.flush()
        const secondFlush = reporter.flush()

        expect(secondFlush).toBe(firstFlush)
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)

        if (resolveFetch === undefined) {
            throw new Error('Fetch resolver was not registered')
        }
        // 修改 Promise 的状态，让异步执行成功
        resolveFetch({
            ok: true
        })

        await Promise.all([firstFlush, secondFlush])
        await reporter.flush()
        expect(fetchTransport).toHaveBeenCalledTimes(1)
    })

    it('keeps events enqueued while a batch is in flight', async () => {
        const firstEvent = makeEvent(100)
        const secondEvent = makeEvent(200)

        const sendBeacon = vi.fn(() => false)

        // 一个函数，调用这个函数，可以让 pending Promise 完成
        let resolveFetch:
            | ((response: { ok: boolean }) => void)
            | undefined

        // 手动控制 Fetch 什么时候完成
        const pendingResponse = new Promise<{ ok: boolean }>(
            (resolve) => {
                // 把 resolve 函数保存到外部变量 resolveFetch
                // 这样后面的测试可以决定什么时候完成 Promise
                resolveFetch = resolve
            },
        )

        const fetchTransport = vi.fn(
            () => pendingResponse,
        )

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport
        })

        reporter.enqueue(firstEvent)

        const firstFlush = reporter.flush()

        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenNthCalledWith(
            1,
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    events: [firstEvent],
                }),
                keepalive: true,
            },
        )

        reporter.enqueue(secondEvent)

        if (resolveFetch === undefined) {
            throw new Error('Fetch resolver was not registered')
        }
        
        resolveFetch({
            ok: true,
        })
        
        await firstFlush

        await reporter.flush()

        expect(sendBeacon).toHaveBeenCalledTimes(2)
        expect(fetchTransport).toHaveBeenCalledTimes(2)
        expect(fetchTransport).toHaveBeenNthCalledWith(
            2,
            ENDPOINT,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    events: [secondEvent],
                }),
                keepalive: true,
            },
        )
    })

    it('continues transport fallback when debug throws', async () => {
        const event = makeEvent();
        const sendBeacon = vi.fn(() => {
            throw new Error('Beacon failed')
        })
        
        const debug = vi.fn(() => {
            throw new Error('Debug failed')
        })
        
        const fetchTransport = vi.fn(
            async () => ({
                ok: true,
            }),
        )

        const reporter = createReporter({
            endpoint: ENDPOINT,
            sendBeacon,
            fetch: fetchTransport,
            debug
        })

        reporter.enqueue(event)
        await expect(reporter.flush()).resolves.toBeUndefined()

        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(debug).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)

        await expect(reporter.flush()).resolves.toBeUndefined()
        expect(sendBeacon).toHaveBeenCalledTimes(1)
        expect(debug).toHaveBeenCalledTimes(1)
        expect(fetchTransport).toHaveBeenCalledTimes(1)

    })
})