import type { MetricSample } from "./metricSample.type"

export interface LcpMetricLike {
    value: number
}

export type ObserveLcp = (
    callback: (
        metric: LcpMetricLike
    ) => void,
) => void

export type LcpSample = Extract<
MetricSample,
{
    type: 'web.vital.lcp'
}>

export interface LcpCollectorOptions {
    timeOrigin: number
    observeLcp?: ObserveLcp
    onSample(
        sample: LcpSample,
    ): void
}

export interface LcpCollector {
    start(): void
    destroy(): void
}