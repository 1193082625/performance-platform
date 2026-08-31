import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    mount,
} from '@vue/test-utils'

import PaintMetricCard from './PaintMetricCard.vue'

describe('PaintMetricCard', () => {
    it('shows rounded paint statistics', () => {
        const wrapper = mount(
            PaintMetricCard,
            {
                props: {
                    metric: 'FP',

                    stats: {
                        count: 24,
                        average: 120.4,
                        p50: 110.2,
                        p75: 135.5,
                        p90: 180.6,
                    },
                },
            },
        )

        expect(wrapper.text()).toContain('FP')

        expect(
            wrapper
                .get('[data-testid="metric-average"]')
                .text(),
        ).toBe('120 ms')

        expect(wrapper.text()).toContain(
            '样本数 24',
        )

        expect(wrapper.text()).toContain(
            'P50 110 ms',
        )

        expect(wrapper.text()).toContain(
            'P75 136 ms',
        )

        expect(wrapper.text()).toContain(
            'P90 181 ms',
        )
    })
    it('shows an unavailable state when there are no samples', () => {
        const wrapper = mount(
            PaintMetricCard,
            {
                props: {
                    metric: 'FCP',
    
                    stats: {
                        count: 0,
                        average: null,
                        p50: null,
                        p75: null,
                        p90: null,
                    },
                },
            },
        )
    
        expect(wrapper.text()).toContain('FCP')
    
        expect(wrapper.text()).toContain(
            '暂无数据',
        )
    
        expect(
            wrapper
                .get('[data-testid="metric-average"]')
                .text(),
        ).toBe('—')
    
        expect(wrapper.text()).toContain(
            '样本数 0',
        )
    
        expect(wrapper.text()).toContain(
            'P50 —',
        )
    
        expect(wrapper.text()).toContain(
            'P75 —',
        )
    
        expect(wrapper.text()).toContain(
            'P90 —',
        )
    })
})