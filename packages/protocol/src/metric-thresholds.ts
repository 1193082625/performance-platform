/**
 * 定义 Web Vitals 体验阈值
 */

export interface MetricThreshold {
    good: number
    poor: number
}

/**
 * 判断规则是：
 * value ≤ good              → good
 * good < value ≤ poor       → needs-improvement
 * value > poor              → poor
 */
export const WEB_VITAL_THRESHOLDS = {
    'web.vital.lcp': {
        good: 2500,
        poor: 4000,
    },
    'web.vital.cls': {
        good: 0.1,
        poor: 0.25
    },
    'web.vital.inp': {
        good: 200,
        poor: 500,
    }
} as const satisfies Record<
    'web.vital.lcp' | 'web.vital.cls' | 'web.vital.inp',
    MetricThreshold
>

export const PAINT_METRIC_THRESHOLDS = {
    'web.paint.fp': {
        good: 1_000,
        poor: 2_000,
    },
    'web.paint.fcp': {
        good: 1_800,
        poor: 3_000,
    },
} as const satisfies Record<
    'web.paint.fp' | 'web.paint.fcp',
    MetricThreshold
>

export type MetricRating = 
    | 'good'
    | 'needs-improvement'
    | 'poor'

export function rateWebVital(
    type: keyof typeof WEB_VITAL_THRESHOLDS,
    value: number,
): MetricRating {
    const threshold = WEB_VITAL_THRESHOLDS[type]

    if (value <= threshold.good) {
        return 'good'
    }

    if (value <= threshold.poor) {
        return 'needs-improvement'
    }

    return "poor"
}

export function ratePaintMetric(
    type: keyof typeof PAINT_METRIC_THRESHOLDS,
    value: number,
): MetricRating {
    const threshold = PAINT_METRIC_THRESHOLDS[type]

    if (value <= threshold.good) {
        return 'good'
    }

    if (value <= threshold.poor) {
        return 'needs-improvement'
    }

    return 'poor'
}
