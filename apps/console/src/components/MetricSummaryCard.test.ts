import {
    describe,
    expect,
    it,
} from 'vitest'
import {
    mount,
} from '@vue/test-utils'
import MetricSummaryCard from './MetricSummaryCard.vue'

describe('MetricSummaryCard', () => {
    it('shows a millisecond metric summary', () => {
        const wrapper = mount(MetricSummaryCard, {
            props: {
                label: 'LCP',
                metricVersion: 'lcp-v1',
                unit: 'ms',
                stats: {
                    count: 24,
                    average: 128.4,
                    p50: 110,
                    p75: 184.6,
                    p90: 220,
                },
            },
        })

        expect(wrapper.text()).toContain('LCP')
        expect(wrapper.text()).toContain('lcp-v1')
        expect(
            wrapper.get('[data-testid="metric-summary-average"]').text(),
        ).toBe('128 ms')
        expect(
            wrapper.get('[data-testid="metric-summary-p75"]').text(),
        ).toBe('185 ms')
        expect(
            wrapper.get('[data-testid="metric-summary-samples"]').text(),
        ).toBe('24')
    })

    it('shows an empty state when there are no samples', () => {
        const wrapper = mount(MetricSummaryCard, {
            props: {
                label: 'LCP',
                metricVersion: 'lcp-v1',
                unit: 'ms',
                stats: {
                    count: 0,
                    average: null,
                    p50: null,
                    p75: null,
                    p90: null,
                },
            },
        })

        expect(wrapper.text()).toContain('暂无 LCP 数据')
        expect(
            wrapper.get('[data-testid="metric-summary-average"]').text(),
        ).toBe('—')
    })
})
