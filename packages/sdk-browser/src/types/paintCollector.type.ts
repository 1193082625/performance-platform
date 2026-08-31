/**
 * 真实浏览器已经由 PerformanceEntry、PerformanceObserver、PerformanceObserverEntryList
 * 所以这里定义 Like 类型，表示最小接口：只依赖真正需要的能力；不依赖完整类型，也就不用实现许多用不到的字段
 */
import type { PaintMetric } from "@performance-platform/protocol";

// 定义事件时间点
export interface PaintSample {
    type: PaintMetric
    // 从页面导航起点到绘制事件发生所经过的毫秒数
    valueMs: number
    // 绘制事件发生的 Unix epoch 毫秒时间戳
    occurredAt: number
}

export interface PaintEntryLike {
    name: string
    startTime: number
}

export interface PaintEntryListLike {
    getEntries(): readonly PaintEntryLike[]
}

// 定义监听
export interface PaintObserverLike {
    observe(options: {
        type: 'paint'
        buffered: true
    }): void

    disconnect(): void
}

// 创建监听，浏览器发现 FP 或 FCP时，就会调用这个函数
export type CreatePaintObserver = (
    callback: (entryList: PaintEntryListLike) => void,
) => PaintObserverLike

export interface PaintCollectorOptions {
    timeOrigin: number // 告诉采集器 “页面从什么时候开始”
    createObserver?: CreatePaintObserver // 告诉采集器“怎样监听浏览器 PaintEntry”
    onSample(sample: PaintSample): void // 告诉采集器“采集到结果后交给谁”
    onEntriesComplete?(): void // 可选回调，当前 entryList 已经全部处理完时触发
}

export interface PaintCollector {
    start(): void
    destroy(): void
}
