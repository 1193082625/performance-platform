import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    shallowMount,
} from '@vue/test-utils'

import type {
    PaintSeriesPoint,
} from '@performance-platform/protocol'

import VChart from 'vue-echarts'

import PaintTrendChart from './PaintTrendChart.vue'

const POINTS: PaintSeriesPoint[] = [
    {
        time: '2026-08-31T10:00:00.000Z',
        fp: {
            count: 1,
            average: 120.4,
            p50: 120.4,
            p75: 180.4,
            p90: 200.4,
        },
        
        fcp: {
            count: 1,
            average: 260.6,
            p50: 260.6,
            p75: 340.6,
            p90: 380.6,
        },
    },
]

describe('PaintTrendChart', () => {
    it('passes a reactive trend option to VChart', () => {
        const wrapper = shallowMount(
            PaintTrendChart,
            {
                props: {
                    points: POINTS,
                },
            },
        )

        const chart = wrapper.findComponent(VChart)

        expect(chart.exists()).toBe(true)

        expect(
            chart.props('option'),
        ).toMatchObject({
            xAxis: {
                data: [
                    '2026-08-31T10:00:00.000Z',
                ],
            },

            series: [
                {
                    name: 'FP',
                    data: [120],
                },

                {
                    name: 'FCP',
                    data: [261],
                },
            ],
        })

        expect(
            chart.props('autoresize'),
        ).toBe(true)
    })
    it('shows an unavailable state when there are no trend points', () => {
        const wrapper = shallowMount(
            PaintTrendChart,
            {
                props: {
                    points: [],
                },
            },
        )
    
        expect(wrapper.text()).toContain(
            '性能趋势',
        )
    
        expect(wrapper.text()).toContain(
            '暂无趋势数据',
        )
    
        expect(
            wrapper.findComponent(VChart).exists(),
        ).toBe(false)
    })
    it('builds and labels a P75 trend chart', () => {
        const wrapper = shallowMount(
            PaintTrendChart,
            {
                props: {
                    points: POINTS,
                    title: 'P75 TREND',
                    statistic: 'p75',
                },
            },
        )
    
        expect(wrapper.text()).toContain(
            'P75 TREND',
        )
    
        const chart =
            wrapper.findComponent(VChart)
    
        expect(
            chart.props('option'),
        ).toMatchObject({
            series: [
                {
                    name: 'FP',
                    data: [180],
                },
    
                {
                    name: 'FCP',
                    data: [341],
                },
            ],
        })
    })
})