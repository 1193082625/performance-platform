import type {
    MetricSample,
} from './metricSample.type.js'

export interface ClsMetricLike {
    value: number
    lastEntryStartTime: number
}

export type ObserveCls = (
    callback: (
        metric: ClsMetricLike,
    ) => void,
) => void

export type ClsSample = Extract<
    MetricSample,
    {
        type: 'web.vital.cls'
    }
>

export interface ClsCollectorOptions {
    timeOrigin: number
    observeCls?: ObserveCls
    onSample(sample: ClsSample): void
}

export interface ClsCollector {
    start(): void
    destroy(): void
}
