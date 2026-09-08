import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    PAINT_METRIC_THRESHOLDS,
    ratePaintMetric,
    rateWebVital,
    WEB_VITAL_THRESHOLDS,
} from './metric-thresholds.js'

describe('Web Vital thresholds', () => {
    it('defines the shared paint thresholds', () => {
        expect(PAINT_METRIC_THRESHOLDS).toEqual({
            'web.paint.fp': { good: 1_000, poor: 2_000 },
            'web.paint.fcp': { good: 1_800, poor: 3_000 },
        })
    })

    it.each([
        ['web.paint.fp', 1_000, 'good'],
        ['web.paint.fp', 1_001, 'needs-improvement'],
        ['web.paint.fp', 2_001, 'poor'],
        ['web.paint.fcp', 1_800, 'good'],
        ['web.paint.fcp', 1_801, 'needs-improvement'],
        ['web.paint.fcp', 3_001, 'poor'],
    ] as const)(
        'rates %s value %s as %s',
        (type, value, expected) => {
            expect(ratePaintMetric(type, value)).toBe(expected)
        },
    )

    it('defines the standard thresholds', () => {
        expect(WEB_VITAL_THRESHOLDS).toEqual({
            'web.vital.lcp': {
                good: 2500,
                poor: 4000,
            },
            'web.vital.cls': {
                good: 0.1,
                poor: 0.25,
            },
            'web.vital.inp': {
                good: 200,
                poor: 500,
            },
        })
    })

    it.each([
        ['web.vital.inp', 200, 'good'],
        ['web.vital.inp', 201, 'needs-improvement'],
        ['web.vital.inp', 500, 'needs-improvement'],
        ['web.vital.inp', 501, 'poor'],
        ['web.vital.lcp', 2500, 'good'],
        ['web.vital.cls', 0.1, 'good'],
    ] as const)(
        'rates %s value %s as %s',
        (type, value, expected) => {
            expect(
                rateWebVital(type, value),
            ).toBe(expected)
        },
    )
})
