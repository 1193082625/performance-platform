import type {
    MetricSeriesPoint,
} from '@performance-platform/protocol'
import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    buildMetricTrendOption,
    formatRelativeMetricTrendTime,
} from './metric-trend-option.js'

const SERIES: MetricSeriesPoint[] = [
    {
        time: '2026-09-04T08:00:00.000Z',
        stats: {
            count: 2,
            average: 180.4,
            p50: 170,
            p75: 196.6,
            p90: 220,
        },
    },
    {
        time: '2026-09-04T09:00:00.000Z',
        stats: {
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
        },
    },
]

describe('buildMetricTrendOption', () => {
    it('builds an INP average trend while preserving empty buckets', () => {
        const option = buildMetricTrendOption({
            points: SERIES,
            label: 'INP',
            unit: 'ms',
            statistic: 'average',
        })

        expect(option).toMatchObject({
            xAxis: {
                type: 'category',
                data: [
                    '2026-09-04T08:00:00.000Z',
                    '2026-09-04T09:00:00.000Z',
                ],
            },
            yAxis: {
                type: 'value',
                name: '毫秒',
                min: 0,
            },
            series: [
                {
                    name: 'INP',
                    type: 'line',
                    smooth: true,
                    lineStyle: {
                        color: '#48dcff',
                    },
                    data: [
                        180,
                        null,
                    ],
                },
            ],
        })
    })

    it('preserves three decimal places for a score metric', () => {
        const option = buildMetricTrendOption({
            points: [
                {
                    time: '2026-09-04T08:00:00.000Z',
                    stats: {
                        count: 3,
                        average: 0.0786,
                        p50: 0.07,
                        p75: 0.1236,
                        p90: 0.18,
                    },
                },
            ],
            label: 'CLS',
            unit: 'score',
            statistic: 'p75',
        })

        expect(option).toMatchObject({
            yAxis: {
                name: '分数',
            },
            series: [
                {
                    name: 'CLS',
                    data: [
                        0.124,
                    ],
                },
            ],
        })
    })

    it('converts byte values to MiB', () => {
        const option = buildMetricTrendOption({
            points: [
                {
                    time: '2026-09-04T08:00:00.000Z',
                    stats: {
                        count: 1,
                        average: 15_728_640,
                        p50: 15_728_640,
                        p75: 15_728_640,
                        p90: 15_728_640,
                    },
                },
            ],
            label: 'USED HEAP',
            unit: 'byte',
            statistic: 'average',
        })

        expect(option).toMatchObject({
            yAxis: {
                name: 'MiB',
            },
            series: [
                {
                    data: [
                        15,
                    ],
                },
            ],
        })
    })

    it('uses a custom series color', () => {
        const option = buildMetricTrendOption({
            points: SERIES,
            label: 'CLS',
            unit: 'score',
            statistic: 'p75',
            color: '#a18bff',
        })

        expect(option).toMatchObject({
            tooltip: {
                borderColor: '#a18bff',
            },
            series: [
                {
                    lineStyle: {
                        color: '#a18bff',
                    },
                    itemStyle: {
                        color: '#a18bff',
                    },
                },
            ],
        })
    })

    it('formats trend timestamps relative to the latest point', () => {
        const endTime = '2026-09-04T08:00:00.000Z'

        expect(
            formatRelativeMetricTrendTime(
                '2026-09-03T08:00:00.000Z',
                endTime,
            ),
        ).toBe('1D AGO')

        expect(
            formatRelativeMetricTrendTime(
                endTime,
                endTime,
            ),
        ).toBe('NOW')
    })
})
