import type { MetricSample } from './metricSample.type'

export type LcpSample = Extract<
    MetricSample,
    {
        type: 'web.vital.lcp'
    }
>

// NonNullable 作用是从 Attribution | undefined 提取出 Attribution，然后再通过 attribution? 表达可选性
type LcpAttributionLike = NonNullable<LcpSample['payload']['attribution']>

export interface LcpMetricLike {
    value: number
    attribution?: LcpAttributionLike
}

export type ObserveLcp = (callback: (metric: LcpMetricLike) => void) => void

export interface LcpCollectorOptions {
    timeOrigin: number
    observeLcp?: ObserveLcp
    onSample(sample: LcpSample): void
}

export interface LcpCollector {
    start(): void
    finalize(): void
    destroy(): void
}
