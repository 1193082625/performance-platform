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
                type: 'web.vital.lcp',
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
                type: 'web.vital.lcp',
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

    it('formats a CLS score without a unit suffix', () => {
        const wrapper = mount(MetricSummaryCard, {
            props: {
                label: 'CLS',
                type: 'web.vital.cls',
                metricVersion: 'cls-v1',
                unit: 'score',
                stats: {
                    count: 3,
                    average: 0.0724,
                    p50: 0.05,
                    p75: 0.0944,
                    p90: 0.12,
                },
            },
        })

        expect(
            wrapper.get('[data-testid="metric-summary-average"]').text(),
        ).toBe('0.072')
        expect(
            wrapper.get('[data-testid="metric-summary-p75"]').text(),
        ).toBe('0.094')
    })

    it.each([
        [200, 'GOOD'],
        [300, 'NEEDS IMPROVEMENT'],
        [501, 'POOR'],
    ] as const)(
        'rates INP P75 %s as %s',
        (p75, expected) => {
            const wrapper = mount(
                MetricSummaryCard,
                {
                    props: {
                        label: 'INP',
                        type: 'web.vital.inp',
                        metricVersion: 'inp-v1',
                        unit: 'ms',
                        stats: {
                            count: 5,
                            average: 240,
                            p50: 220,
                            p75,
                            p90: 520,
                        },
                    },
                },
            )

            const rating = wrapper.get(
                '.metric-summary-card__rating',
            )

            expect(rating.text()).toBe(expected)
        },
    )

    it.each([
        [200, 'good', 'GOOD'],
        [300, 'needs-improvement', 'NEEDS IMPROVEMENT'],
        [501, 'poor', 'POOR'],
    ] as const)(
        'rates INP P75 %s as %s',
        (p75, expectedRating, expectedText) => {
            const wrapper = mount(
                MetricSummaryCard,
                {
                    props: {
                        label: 'INP',
                        type: 'web.vital.inp',
                        metricVersion: 'inp-v1',
                        unit: 'ms',
                        stats: {
                            count: 5,
                            average: 240,
                            p50: 220,
                            p75,
                            p90: 520,
                        },
                    },
                },
            )

            const rating = wrapper.get(
                '.metric-summary-card__rating',
            )

            expect(rating.text()).toBe(expectedText)

            expect(
                rating.attributes('data-rating'),
            ).toBe(expectedRating)
        },
    )

    it('does not render a rating without P75', () => {
        const wrapper = mount(
            MetricSummaryCard,
            {
                props: {
                    label: 'INP',
                    type: 'web.vital.inp',
                    metricVersion: 'inp-v1',
                    unit: 'ms',
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

        expect(
            wrapper
                .find('.metric-summary-card__rating')
                .exists(),
        ).toBe(false)
    })
})
