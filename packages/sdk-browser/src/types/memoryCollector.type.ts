import type {
    MetricSample,
} from './metricSample.type.js'

// performance.memory 提供的原始数据形态
export interface MemoryInfoLike {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
}

// 隔离浏览器 API，方便单元测试注入假数据
export type ReadMemory = () =>
    MemoryInfoLike | undefined

// 同一次读取形成的内存快照
export interface MemorySnapshot {
    observedAt: number
    usedHeap: number
    totalHeap: number
    heapLimit: number
}

// 从通用 MetricSample 中筛选出内存指标
export type MemorySample = Extract<
    MetricSample,
    {
        type: `web.memory.${string}`
    }
>

export interface MemoryCollector {
    start(): void

    // 输出当前最新快照；没有快照时什么也不做
    flush(): void

    // 清理定时器并禁止后续输出
    destroy(): void
}

export interface MemoryScheduler {
    setInterval(
        callback: () => void,
        intervalMs: number,
    ): number
    clearInterval(handle: number): void
}

export interface MemoryCollectorOptions {
    readMemory?: ReadMemory
    // 返回 Unix epoch 毫秒
    now(): number
    // 一次快照会输出三个相关样本
    onSamples(samples: MemorySample[]): void

    scheduler?: MemoryScheduler
    collectIntervalMs?: number
    reportIntervalMs?: number
}