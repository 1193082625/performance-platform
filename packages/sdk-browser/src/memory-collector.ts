import { createMemorySamples } from "./memory-sample.js";
import type { MemoryCollector, MemoryCollectorOptions, MemorySample } from "./types/memoryCollector.type.js";


export const DEFAULT_MEMORY_COLLECT_INTERVAL_MS = 30_000
export const DEFAULT_MEMORY_REPORT_INTERVAL_MS = 5 * 60_000

export function createMemoryCollector(
    options: MemoryCollectorOptions
): MemoryCollector {
    let started = false
    let destroyed = false
    let latestSamples: MemorySample[] | null = null

    const collectIntervalMs = options.collectIntervalMs ?? DEFAULT_MEMORY_COLLECT_INTERVAL_MS
    const reportIntervalMs = options.reportIntervalMs ?? DEFAULT_MEMORY_REPORT_INTERVAL_MS

    let collectTimer: number | undefined
    let reportTimer: number | undefined

    const collect = (): void => {
        if (destroyed || options.readMemory === undefined) {
            return
        }

        try {
            const memory = options.readMemory()

            if (memory === undefined) {
                return
            }

            const samples = createMemorySamples({
                observedAt: options.now(),
                usedHeap: memory.usedJSHeapSize,
                totalHeap: memory.totalJSHeapSize,
                heapLimit: memory.jsHeapSizeLimit
            })

            if (samples.length === 0) {
                return
            }

            latestSamples = samples
        } catch {
            // 内存读取失败不能影响宿主页面
        }
    }

    const start = (): void => {
        if (started || destroyed) {
            return
        }

        started = true
        collect()

        if (!options.scheduler) {
            return
        }

        collectTimer = options.scheduler.setInterval(
            collect,
            collectIntervalMs
        )

        reportTimer = options.scheduler.setInterval(
            flush,
            reportIntervalMs
        )
    }

    const flush = (): void => {
        if (destroyed || latestSamples === null) {
            return
        }

        const samples = latestSamples
        latestSamples = null

        try {
            options.onSamples(samples)
        } catch {
            // 指标消费者失败不能影响宿主页面
        }
    }

    const destroy = (): void => {
        if (destroyed) {
            return
        }

        destroyed = true
        latestSamples = null

        if (options.scheduler) {
            if (collectTimer !== undefined) {
                options.scheduler.clearInterval(collectTimer)
            }

            if (reportTimer !== undefined) {
                options.scheduler.clearInterval(reportTimer)
            }
        }

        collectTimer = undefined
        reportTimer = undefined
    }

    return {
        start,
        flush,
        destroy,
    }
}