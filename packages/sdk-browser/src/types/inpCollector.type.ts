import type {
    MetricSample,
} from './metricSample.type.js'

export interface InpMetricLike {
    value: number
    interactionStartTime: number
}

export type ObserveInp = (
    callback: (
        metric: InpMetricLike,
    ) => void,
) => void

export type InpSample = Extract<
    MetricSample,
    {
        type: 'web.vital.inp'
    }
>

export interface InpCollectorOptions {
    timeOrigin: number
    observeInp?: ObserveInp
    onSample(sample: InpSample): void
}

export interface InpCollector {
    start(): void
    destroy(): void
}
