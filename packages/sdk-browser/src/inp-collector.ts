import type {
    InpCollector,
    InpCollectorOptions,
    InpMetricLike,
} from './types/inpCollector.type.js'

export function createInpCollector(
    options: InpCollectorOptions,
): InpCollector {
    let started = false
    let destroyed = false
    let reported = false
    let latestMetric: InpMetricLike | undefined

    const handleMetric = (
        metric: InpMetricLike,
    ): void => {
        if (destroyed || reported) return

        if (
            !Number.isFinite(metric.value)
            || metric.value < 0
            || !Number.isFinite(metric.interactionStartTime)
            || metric.interactionStartTime < 0
        ) {
            return
        }

        latestMetric = metric
    }

    const finalize = (): void => {
        if (destroyed || reported || latestMetric === undefined) return

        const metric = latestMetric
        latestMetric = undefined
        reported = true

        try {
            options.onSample({
                type: 'web.vital.inp',
                occurredAt: Math.round(
                    options.timeOrigin
                    + metric.interactionStartTime,
                ),
                metricVersion: 'inp-v1',
                payload: {
                    value: metric.value,
                    unit: 'ms',
                    ...(metric.attribution === undefined
                        ? {}
                        : {
                              attribution: metric.attribution,
                          }),
                },
            })
        } catch {
            // Metric consumers must not affect the host page.
        }
    }

    const start = (): void => {
        if (
            destroyed
            || started
            || options.observeInp === undefined
        ) {
            return
        }

        started = true

        try {
            options.observeInp(handleMetric)
        } catch {
            // Third-party collection failures must not affect the host page.
        }
    }

    const destroy = (): void => {
        destroyed = true
    }

    return {
        start,
        finalize,
        destroy,
    }
}
