import type {
    MetricSeriesPoint,
} from '@performance-platform/protocol'
import {
    shallowMount,
} from '@vue/test-utils'
import {
    describe,
    expect,
    it,
} from 'vitest'
import VChart from 'vue-echarts'

import MetricTrendChart from './MetricTrendChart.vue'

const POINTS: MetricSeriesPoint[] = [
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
]

describe('MetricTrendChart', () => {
    it('renders a P75 metric trend by default', () => {
        const wrapper = shallowMount(
            MetricTrendChart,
            {
                props: {
                    points: POINTS,
                    label: 'INP',
                    unit: 'ms',
                    title: 'INP P75 TREND',
                    color: '#ffc857',
                },
            },
        )

        expect(wrapper.text()).toContain(
            'INP P75 TREND',
        )

        const chart = wrapper.findComponent(VChart)

        expect(chart.exists()).toBe(true)
        expect(chart.props('option')).toMatchObject({
            yAxis: {
                name: '毫秒',
            },
            series: [
                {
                    name: 'INP',
                    lineStyle: {
                        color: '#ffc857',
                    },
                    data: [
                        197,
                    ],
                },
            ],
        })
        expect(chart.props('autoresize')).toBe(true)
    })

    it('supports an average score trend', () => {
        const wrapper = shallowMount(
            MetricTrendChart,
            {
                props: {
                    points: [
                        {
                            time: '2026-09-04T08:00:00.000Z',
                            stats: {
                                count: 1,
                                average: 0.0786,
                                p50: 0.07,
                                p75: 0.12,
                                p90: 0.18,
                            },
                        },
                    ],
                    label: 'CLS',
                    unit: 'score',
                    statistic: 'average',
                },
            },
        )

        expect(
            wrapper
                .findComponent(VChart)
                .props('option'),
        ).toMatchObject({
            yAxis: {
                name: '分数',
            },
            series: [
                {
                    name: 'CLS',
                    data: [
                        0.079,
                    ],
                },
            ],
        })
    })

    it('shows an unavailable state without sampled trend points', () => {
        const wrapper = shallowMount(
            MetricTrendChart,
            {
                props: {
                    points: [
                        {
                            time: '2026-09-04T08:00:00.000Z',
                            stats: {
                                count: 0,
                                average: null,
                                p50: null,
                                p75: null,
                                p90: null,
                            },
                        },
                    ],
                    label: 'LCP',
                    unit: 'ms',
                },
            },
        )

        expect(wrapper.text()).toContain(
            '暂无 LCP 趋势数据',
        )
        expect(
            wrapper.findComponent(VChart).exists(),
        ).toBe(false)
    })
})
