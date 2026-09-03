import type {
    ClsCollector,
    ClsCollectorOptions,
    ClsMetricLike,
} from './types/clsCollector.type.js'

export function createClsCollector(
    options: ClsCollectorOptions,
): ClsCollector {
    let started = false
    let destroyed = false
    let reported = false

    const handleMetric = (
        metric: ClsMetricLike,
    ): void => {
        if (destroyed || reported) return

        if (
            !Number.isFinite(metric.value)
            || metric.value < 0
            || !Number.isFinite(metric.lastEntryStartTime)
            || metric.lastEntryStartTime < 0
        ) {
            return
        }

        reported = true

        try {
            options.onSample({
                type: 'web.vital.cls',
                occurredAt: Math.round(
                    options.timeOrigin
                    + metric.lastEntryStartTime,
                ),
                metricVersion: 'cls-v1',
                payload: {
                    value: metric.value,
                    unit: 'score',
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
            || options.observeCls === undefined
        ) {
            return
        }

        started = true

        try {
            options.observeCls(handleMetric)
        } catch {
            // Third-party collection failures must not affect the host page.
        }
    }

    const destroy = (): void => {
        destroyed = true
    }

    return {
        start,
        destroy,
    }
}
