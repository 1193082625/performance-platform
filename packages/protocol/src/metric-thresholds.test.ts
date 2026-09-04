import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    rateWebVital,
    WEB_VITAL_THRESHOLDS,
} from './metric-thresholds.js'

describe('Web Vital thresholds', () => {
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