import type { PaintMetric } from "@performance-platform/protocol";
import type { PaintCollector, PaintCollectorOptions, PaintEntryLike, PaintEntryListLike, PaintObserverLike } from "./types/paintCollector.type";


function toPaintMetric(
    entryName: string
): PaintMetric | undefined {
    switch(entryName) {
        case 'first-paint':
            return 'web.paint.fp'

        case 'first-contentful-paint':
            return 'web.paint.fcp'

        default:
            return undefined
    }
}

export function createPaintCollector(
    options: PaintCollectorOptions,
): PaintCollector {
    // 表示当前是否存在 Observer
    // 可能有两种含义：还没启动 ｜ 已经销毁并释放
    let observer: PaintObserverLike | undefined
    // 表示整个采集器实例是否已经永久销毁
    let destroyed = false

    const handleEntries = (
        entryList: PaintEntryListLike,
    ): void => {
        // 如果采集器已经销毁，则立即返回，不处理 entries
        if(destroyed) return

        // 实现 FP/FCP 条目转换
        let entries: readonly PaintEntryLike[]
        try {
            entries = entryList.getEntries()
        } catch {
            return
        }
        
        for (const entry of entries) {
            // 先检查 startTime
            if(!Number.isFinite(entry.startTime) || entry.startTime < 0) {
                continue
            }

            const type = toPaintMetric(entry.name)
            if (type === undefined) {
                continue
            }

            try {
                options.onSample({
                    type,
                    valueMs: entry.startTime,
                    occurredAt: Math.round(options.timeOrigin + entry.startTime)
                })
            } catch {
                // 样本处理失败不能影响业务页面
            }
        }

        try {
            options.onEntriesComplete?.()
        } catch {
            // 完成通知失败不能影响宿主页面
        }
    }

    const start = (): void => {
        // options.createObserver === undefined 表示 当前浏览器不支持 PerformanceObserver
        if (
            destroyed
            || observer !== undefined
            || options.createObserver === undefined
        ) {
            return
        }

        // 如果不要candidate，直接给 observer 赋值，如果 .observe() 抛出异常，这时 observer 也已经有值了
        // 后续再调用 start() 时，采集器会错误地认为已经启动，不再尝试，因此需要临时变量
        let candidate: PaintObserverLike | undefined

        try {
            candidate = options.createObserver(handleEntries)

            candidate.observe({
                type: 'paint',
                buffered: true
            })

            // 完整启动成功才赋值
            observer = candidate
        } catch {
            try {
                candidate?.disconnect()
            } catch{
                // 清理失败也不影响业务页面
            }
        }
    }

    const destroy = (): void => {
        if (destroyed) {
            return
        }

        destroyed = true

        const observerToDisconnect = observer
        observer = undefined

        try {
            // 即使disconnect 调用抛错，此时采集器内部也已经完成，不会因为异常而停留在半销毁状态
            observerToDisconnect?.disconnect()
        } catch {
            // 清理失败不能影响业务页面
        }
    }

    return {
        start,
        destroy,
    }
}