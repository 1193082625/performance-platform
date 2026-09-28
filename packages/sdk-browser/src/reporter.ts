/**
 * 职责：暂存待上报事件，并通过浏览器传输能力批量发送给服务端
 *
 * 输入：
 * - 完整 PaintEvent;
 * - enqueue(event)
 * - flush()
 *
 * 输出或副作用：
 * - 把事件加入内存队列
 * - 通过 sendBeacon 或 fetch 发送批次
 * - 发送被接受后移除对应事件
 * - 失败时保留事件
 *
 * 内部状态：
 * - 待发送事件队列
 * - 当前 flush（推送） 状态
 *
 * 外部依赖：
 * - sendBeacon
 * - fetch
 * - 可选 debug 回调
 *
 * 不变量：
 * - 每批最多20条
 * - Beacon 被接受后不再调用 fetch
 * - Beacon 不可用、返回 false 或抛错时尝试 fetch
 * - 两种传输都失败时保留批次
 * - 传输成功后只删除本次成功的批次
 * - 并发 flush 不重复发送同一事件
 * - 任何传输异常不影响业务页面
 *
 * sendBeacon 是浏览器提供的一种“小数据后台上报”能力，特别适合统计、埋点和性能监控。
 * 语法：navigator.sendBeacon(url, data)，它返回一个布尔值，返回true表示浏览器已经接受数据并将其放入待发送队列。
 * 普通 fetch() 在页面即将关闭时可能来不及完成，sendBeacon() 专门用于页面卸载、隐藏等场景的小型数据上报
 */

import type {
    ReportableEvent,
    ReporterOptions,
    Reporter,
} from './types/reporter.type'

const MAX_BATCH_SIZE = 20
const DEFAULT_MAX_QUEUE_SIZE = 100
const DEFAULT_MAX_EVENT_AGE_MS = 5 * 60_000
const DEFAULT_RETRY_BASE_DELAY_MS = 1_000
const DEFAULT_RETRY_MAX_DELAY_MS = 30_000

interface QueuedEvent {
    event: ReportableEvent
    enqueuedAt: number
}

export function createReporter(options: ReporterOptions): Reporter {
    const endpoint = options.endpoint
    const now = options.now ?? (() => Date.now())
    const maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE
    const maxEventAgeMs = options.maxEventAgeMs ?? DEFAULT_MAX_EVENT_AGE_MS
    const retryBaseDelayMs =
        options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS
    const retryMaxDelayMs =
        options.retryMaxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS
    const eventQueue: QueuedEvent[] = []
    // 如果当前有正在发送的批次，则后面的请求共用同一批次
    let activeFlush: Promise<void> | undefined
    let retryTimer: number | object | undefined
    let retryAttempt = 0

    const reportDebug = (message: string, error?: unknown): void => {
        try {
            options.debug?.(message, error)
        } catch {
            // 调试回调失败也不能影响业务页面
        }
    }

    const discardExpiredEvents = (): void => {
        const expiresBefore = now() - maxEventAgeMs
        let discarded = 0

        while (
            eventQueue[0] !== undefined &&
            eventQueue[0].enqueuedAt <= expiresBefore
        ) {
            eventQueue.shift()
            discarded += 1
        }

        if (discarded > 0) {
            reportDebug(`Reporter discarded ${discarded} expired event(s)`)
        }
    }

    const enqueue = (event: ReportableEvent): void => {
        discardExpiredEvents()

        if (eventQueue.length >= maxQueueSize) {
            eventQueue.shift()
            reportDebug(
                'Reporter queue capacity exceeded; dropped oldest event',
            )
        }

        eventQueue.push({ event, enqueuedAt: now() })
    }

    const createRequestBody = (events: readonly ReportableEvent[]): string => {
        return JSON.stringify({
            ...(options.projectKey === undefined
                ? {}
                : {
                      projectKey: options.projectKey,
                  }),
            events,
        })
    }

    const flushFetch = async (body: string): Promise<boolean> => {
        if (!options.fetch) return false

        try {
            const fetchResult = await options.fetch(endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body,
                keepalive: true,
            })

            return fetchResult.ok
        } catch (error) {
            reportDebug('Fetch transport failed', error)
            return false
        }
    }

    const performFlush = async (): Promise<void> => {
        discardExpiredEvents()

        while (eventQueue.length > 0) {
            const queuedBatch = eventQueue.slice(0, MAX_BATCH_SIZE)
            const batch = queuedBatch.map(({ event }) => event)
            const body = createRequestBody(batch)
            let sent = false

            if (options.sendBeacon) {
                try {
                    sent = options.sendBeacon(endpoint, body)
                } catch (error) {
                    reportDebug('Beacon transport failed', error)
                }
            }

            if (!sent) {
                sent = await flushFetch(body)
            }

            if (!sent) {
                scheduleRetry()
                return
            }

            eventQueue.splice(0, queuedBatch.length)
            retryAttempt = 0
            discardExpiredEvents()
        }
    }

    const cancelRetry = (): void => {
        if (retryTimer === undefined || options.scheduler === undefined) return
        options.scheduler.clearTimeout(retryTimer)
        retryTimer = undefined
    }

    function scheduleRetry(): void {
        if (options.scheduler === undefined || retryTimer !== undefined) return

        const delayMs = Math.min(
            retryBaseDelayMs * 2 ** retryAttempt,
            retryMaxDelayMs,
        )
        retryAttempt += 1
        retryTimer = options.scheduler.setTimeout(() => {
            retryTimer = undefined
            void flush()
        }, delayMs)
    }

    const flush = (): Promise<void> => {
        if (activeFlush !== undefined) return activeFlush
        discardExpiredEvents()
        if (!eventQueue.length) {
            cancelRetry()
            retryAttempt = 0
            return Promise.resolve()
        }

        cancelRetry()

        activeFlush = performFlush().finally(() => {
            activeFlush = undefined
        })
        return activeFlush
    }

    return {
        enqueue,
        flush,
    }
}
