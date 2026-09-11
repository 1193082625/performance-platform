import type {
    LcpCollector,
    LcpCollectorOptions,
    LcpMetricLike,
} from './types/lcpCollector.type'

export function createLcpCollector(options: LcpCollectorOptions): LcpCollector {
    let started = false
    let destroyed = false
    let reported = false
    let latestMetric: LcpMetricLike | undefined

    const handleMetric = (metric: LcpMetricLike): void => {
        if (destroyed || reported) {
            return
        }

        if (!Number.isFinite(metric.value) || metric.value < 0) {
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
                type: 'web.vital.lcp',
                occurredAt: Math.round(options.timeOrigin + metric.value),
                metricVersion: 'lcp-v1',
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
            // 指标消费者异常不能影响宿主页面
        }
    }

    const start = (): void => {
        if (destroyed || started || options.observeLcp === undefined) {
            return
        }

        // onLCP 没有取消订阅返回值
        // 先标记 started，避免异常后的重复注册
        started = true

        try {
            options.observeLcp(handleMetric)
        } catch {
            // 第三方采集器异常不能影响宿主页面
        }
    }

    const destroy = (): void => {
        if (destroyed) {
            return
        }
        destroyed = true
    }

    return {
        start,
        finalize,
        destroy,
    }
}
