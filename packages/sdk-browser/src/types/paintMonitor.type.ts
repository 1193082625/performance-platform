import type {
    Environment
} from '@performance-platform/protocol'
import type { SessionStorageLike } from './ids.type'
import type { CreatePaintObserver } from './paintCollector.type'
import type { FetchTransport, SendBeacon } from './reporter.type'
import type { ObserveLcp } from './lcpCollector.type'
import type { ObserveCls } from './clsCollector.type.js'
import type { ObserveInp } from './inpCollector.type.js'
import type { MemoryScheduler, ReadMemory } from './memoryCollector.type.js'

// SDK使用者关心的业务配置：监控哪个应用？什么版本？什么环境？上报到哪里？
export interface PaintMonitorConfig {
    appId: string // 上报应用的id
    appVersion: string // 上报应用的版本
    environment: Environment // 上报时 环境
    endpoint: string // 上报地址
    sampleRate?: number
    debug?: ( // SDK 内部诊断出口
        message: string,
        error?: unknown,
    ) => void
}

export interface PaintMonitor {
    // 启动 PaintCollector，并安装页面生命周期监听
    start(): void

    // 等待 Reporter 尝试发送当前队列
    flush(): Promise<void>

    // 销毁 Collector 并移除页面生命周期监听
    destroy(): void
}

export interface MetricEventContext {
    eventId: string
    appId: string
    appVersion: string
    environment: Environment
    sessionId: string
    viewId: string
    sampleRate: number
}

// 定义页面生命周期的最小接口
export interface PageLifecycleLike {
    visibilityState: string

    addEventListener(
        type: 'visibilitychange',
        listener: () => void,
    ): void

    removeEventListener(
        type: 'visibilitychange',
        listener: () => void,
    ): void
}

// 运行环境提供的能力：如何生成UUID？如何监听 Paint? 如何发送请求？ 如何监听页面隐藏？
export interface PaintMonitorDependencies {
    timeOrigin: number
    randomUUID(): string

    sessionStorage?: SessionStorageLike
    createObserver?: CreatePaintObserver
    observeLcp?: ObserveLcp
    observeCls?: ObserveCls
    observeInp?: ObserveInp
    sendBeacon?: SendBeacon
    fetch?: FetchTransport
    pageLifecycle?: PageLifecycleLike

    readMemory?: ReadMemory
    memoryScheduler?: MemoryScheduler
    // 这里增加 now，是为了避免 MemoryCollector 内部直接调用 Date.now()，同时方便 Monitor 集成测试固定时间
    now?(): number
}
