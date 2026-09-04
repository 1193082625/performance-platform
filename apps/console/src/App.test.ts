import {
    describe,
    it,
    expect,
    afterEach,
    vi,
} from 'vitest'

import {
    flushPromises,
    mount
} from '@vue/test-utils'

vi.mock('vue-echarts', () => ({
    default: {
        name: 'VChart',

        props: [
            'option',
            'autoresize',
        ],

        template:
            '<div data-testid="echarts-stub" />',
    },
}))

import App from './App.vue'
import type { PaintMetricsResponse } from '@performance-platform/protocol'
import PaintMetricCard from './components/PaintMetricCard.vue'
import PaintTrendChart from './components/PaintTrendChart.vue'
import MetricSummaryCard from './components/MetricSummaryCard.vue'
import MetricTrendChart from './components/MetricTrendChart.vue'

const EMPTY_STATS = {
    count: 0,
    average: null,
    p50: null,
    p75: null,
    p90: null,
}
const NOW = Date.UTC(2026, 7, 31, 4, 0, 0)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000
const METRICS_RESPONSE = {
    range: {
        from: '2026-08-29T00:00:00.000Z',
        to: '2026-08-30T00:00:00.000Z',
        interval: 'hour',
    },

    summary: {
        fp: EMPTY_STATS,
        fcp: EMPTY_STATS,
    },

    series: [],
    
    score: null,
} satisfies PaintMetricsResponse

describe('App', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('shows the performance score returned by the metrics API', async () => {
        const fetchMock = vi.fn()

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                range: {
                    from: '2026-08-30T00:00:00.000Z',
                    to: '2026-08-31T00:00:00.000Z',
                    interval: 'hour',
                },
                summary: {
                    fp: {
                        count: 1,
                        average: 120,
                        p50: 120,
                        p75: 120,
                        p90: 120,
                    },

                    fcp: {
                        count: 1,
                        average: 260,
                        p50: 260,
                        p75: 260,
                        p90: 260,
                    },
                },
                series: [],
                score: {
                    value: 90,
                    status: 'good',
                    version: 'paint-v1',
                    components: {
                        fp: 90,
                        fcp: 90,
                    }
                }
            })
        })

        vi.stubGlobal(
            'fetch',
            fetchMock
        )

        const wrapper = mount(App)

        await flushPromises()

        expect(wrapper.text()).toContain('综合性能评分')
        expect(wrapper.get('[data-testid="overall-score"]').text()).toBe('90')
    })

    it('shows a loading state while metrics are being requested', async () => {
        const fetchMock = vi.fn()

        fetchMock.mockResolvedValue(
            new Promise(() => {
                // 故意保持 pending
            })
        )
        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App)

        await flushPromises()
        expect(wrapper.text()).toContain('正在加载性能数据')
        expect(wrapper.text()).not.toContain('暂无评分')
    })

    it('shows an error when metrics cannot be loaded', async () => {
        const fetchMock = vi.fn()
        fetchMock.mockRejectedValue(
            new Error('network unavailable')
        )
        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App)
        await flushPromises()
        expect(wrapper.text()).toContain('性能数据加载失败')
        expect(wrapper.text()).not.toContain('暂无评分')
        expect(wrapper.find('[data-testid="overall-score"]').exists()).toBe(false)
    })
    it('shows an unavailable score when the request succeeds without samples', async () => {
        const fetchMock = vi.fn()
    
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                ...METRICS_RESPONSE,
                score: null,
            }),
        })
    
        vi.stubGlobal(
            'fetch',
            fetchMock,
        )
    
        const wrapper = mount(App)
    
        await flushPromises()
    
        expect(wrapper.text()).toContain(
            '综合性能评分',
        )
    
        expect(wrapper.text()).toContain(
            '暂无评分',
        )
    
        expect(wrapper.text()).not.toContain(
            '性能数据加载失败',
        )
    })
    it('loads the selected range immediately', async () => {
        vi.spyOn(
            Date,
            'now',
        ).mockReturnValue(NOW)
    
        const fetchMock = vi.fn()
    
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })
    
        vi.stubGlobal(
            'fetch',
            fetchMock,
        )
    
        const wrapper = mount(App)
    
        await flushPromises()
    
        const sevenDayButton =
            wrapper
                .findAll('button')
                .find(
                    button => button.text() === '7d',
                )
    
        expect(
            sevenDayButton,
        ).toBeDefined()
    
        await sevenDayButton!.trigger('click')
        await flushPromises()
    
        expect(fetchMock).toHaveBeenCalledTimes(8)
    
        const requestUrl = new URL(
            String(
                fetchMock.mock.calls[4]?.[0],
            ),
        )
    
        expect(
            requestUrl.searchParams.get('from'),
        ).toBe(
            new Date(
                NOW - SEVEN_DAYS_MS,
            ).toISOString(),
        )
    
        expect(
            requestUrl.searchParams.get('to'),
        ).toBe(
            new Date(NOW).toISOString(),
        )
    
        expect(
            requestUrl.searchParams.get('interval'),
        ).toBe('day')
    })
    it('shows FP and FCP summary cards', async () => {
        const fetchMock = vi.fn()
    
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })
    
        vi.stubGlobal(
            'fetch',
            fetchMock,
        )
    
        const wrapper = mount(App)
    
        await flushPromises()
    
        const cards =
            wrapper.findAllComponents(
                PaintMetricCard,
            )
    
        expect(cards).toHaveLength(2)
    
        expect(cards[0]?.props()).toMatchObject({
            metric: 'FP',
            stats: METRICS_RESPONSE.summary.fp,
        })
    
        expect(cards[1]?.props()).toMatchObject({
            metric: 'FCP',
            stats: METRICS_RESPONSE.summary.fcp,
        })
    })
    it('shows the paint trend returned by the metrics API', async () => {
        const trendPoints = [
            {
                time: '2026-08-31T10:00:00.000Z',
                fp: METRICS_RESPONSE.summary.fp,
                fcp: METRICS_RESPONSE.summary.fcp,
            },
        ]
    
        const fetchMock = vi.fn()
    
        fetchMock.mockResolvedValue({
            ok: true,
    
            json: async () => ({
                ...METRICS_RESPONSE,
                series: trendPoints,
            }),
        })
    
        vi.stubGlobal(
            'fetch',
            fetchMock,
        )
    
        const wrapper = mount(App)
    
        await flushPromises()
    
        const trendCharts = wrapper.findAllComponents(
            PaintTrendChart,
        )

        expect(trendCharts).toHaveLength(2)

        expect(
            trendCharts[0]?.props(),
        ).toMatchObject({
            points: trendPoints,
            title: 'AVERAGE TREND',
            statistic: 'average',
        })

        expect(
            trendCharts[1]?.props(),
        ).toMatchObject({
            points: trendPoints,
            title: 'P75 TREND',
            statistic: 'p75',
        })
    })

    it('switches between the Web Vital P75 trends without refetching', async () => {
        const metricSeries = [
            {
                time: '2026-08-31T10:00:00.000Z',
                stats: {
                    count: 1,
                    average: 180,
                    p50: 170,
                    p75: 196,
                    p90: 220,
                },
            },
        ]
        const definitions = {
            'web.vital.lcp': {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
            'web.vital.cls': {
                type: 'web.vital.cls',
                unit: 'score',
                metricVersion: 'cls-v1',
            },
            'web.vital.inp': {
                type: 'web.vital.inp',
                unit: 'ms',
                metricVersion: 'inp-v1',
            },
        } as const
        const fetchMock = vi.fn(
            async (input: RequestInfo | URL) => {
                const url = new URL(String(input))

                if (url.pathname !== '/api/v2/metrics') {
                    return {
                        ok: true,
                        json: async () => METRICS_RESPONSE,
                    }
                }

                const type = url.searchParams.get('type') as
                    keyof typeof definitions

                return {
                    ok: true,
                    json: async () => ({
                        metric: definitions[type],
                        range: METRICS_RESPONSE.range,
                        summary: metricSeries[0]!.stats,
                        series: metricSeries,
                    }),
                }
            },
        )

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App)

        await flushPromises()

        expect(fetchMock).toHaveBeenCalledTimes(4)

        for (const expected of [
            {
                button: 'LCP',
                label: 'LCP',
                unit: 'ms',
                color: '#56e4ff',
            },
            {
                button: 'CLS',
                label: 'CLS',
                unit: 'score',
                color: '#a18bff',
            },
            {
                button: 'INP',
                label: 'INP',
                unit: 'ms',
                color: '#ffc857',
            },
        ] as const) {
            const button = wrapper
                .findAll('.trend-switcher button')
                .find(item => item.text() === expected.button)

            expect(button).toBeDefined()

            await button!.trigger('click')

            expect(
                wrapper.getComponent(MetricTrendChart).props(),
            ).toMatchObject({
                points: metricSeries,
                label: expected.label,
                unit: expected.unit,
                color: expected.color,
                statistic: 'p75',
            })
        }

        expect(fetchMock).toHaveBeenCalledTimes(4)
    })
    it('shows the dashboard title, selected window, and total samples', async () => {
        const fetchMock = vi.fn()
    
        fetchMock.mockResolvedValue({
            ok: true,
    
            json: async () => ({
                ...METRICS_RESPONSE,
    
                summary: {
                    fp: {
                        ...EMPTY_STATS,
                        count: 120,
                    },
    
                    fcp: {
                        ...EMPTY_STATS,
                        count: 120,
                    },
                },
            }),
        })
    
        vi.stubGlobal(
            'fetch',
            fetchMock,
        )
    
        const wrapper = mount(App)
    
        await flushPromises()
    
        expect(wrapper.text()).toContain(
            'WEB PERFORMANCE',
        )
    
        expect(wrapper.text()).toContain(
            '24H WINDOW',
        )
    
        expect(wrapper.text()).toContain(
            'TOTAL SAMPLES',
        )
    
        expect(wrapper.text()).toContain('240')
    })

    it('loads and shows the LCP summary', async () => {
        const lcpResponse = {
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 2,
                average: 156,
                p50: 128,
                p75: 184,
                p90: 184,
            },
            series: [],
        }

        const fetchMock = vi.fn(
            async (input: RequestInfo | URL) => {
                const url = new URL(String(input))

                return {
                    ok: true,
                    json: async () =>
                        url.pathname === '/api/v2/metrics'
                            ? lcpResponse
                            : METRICS_RESPONSE,
                }
            },
        )

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App)

        await flushPromises()

        expect(wrapper.text()).toContain('LCP')
        expect(wrapper.text()).toContain('lcp-v1')
        const lcpCard = wrapper.getComponent(
            MetricSummaryCard,
        )

        expect(lcpCard.props()).toMatchObject({
            label: 'LCP',
            unit: 'ms',
            metricVersion: 'lcp-v1',
            stats: lcpResponse.summary,
        })

        const lcpRequest = fetchMock.mock.calls.find(
            ([input]) =>
                new URL(String(input)).pathname
                === '/api/v2/metrics',
        )

        expect(lcpRequest).toBeDefined()

        const url = new URL(String(lcpRequest?.[0]))

        expect(url.searchParams.get('type')).toBe(
            'web.vital.lcp',
        )
    })

    it('loads and shows the CLS summary', async () => {
        const clsResponse = {
            metric: {
                type: 'web.vital.cls',
                unit: 'score',
                metricVersion: 'cls-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 3,
                average: 0.072,
                p50: 0.05,
                p75: 0.094,
                p90: 0.12,
            },
            series: [],
        }
        const fetchMock = vi.fn(
            async (input: RequestInfo | URL) => {
                const url = new URL(String(input))

                if (
                    url.searchParams.get('type')
                    === 'web.vital.cls'
                ) {
                    return {
                        ok: true,
                        json: async () => clsResponse,
                    }
                }

                return {
                    ok: true,
                    json: async () => METRICS_RESPONSE,
                }
            },
        )

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App)

        await flushPromises()

        const cards = wrapper.findAllComponents(
            MetricSummaryCard,
        )
        const clsCard = cards.find(
            card => card.props('label') === 'CLS',
        )

        expect(clsCard).toBeDefined()
        expect(clsCard?.props()).toMatchObject({
            label: 'CLS',
            unit: 'score',
            metricVersion: 'cls-v1',
            stats: clsResponse.summary,
        })
        expect(
            clsCard
                ?.get('[data-testid="metric-summary-average"]')
                .text(),
        ).toBe('0.072')
    })

    it('loads and shows the INP summary', async () => {
        const inpResponse = {
            metric: {
                type: 'web.vital.inp',
                unit: 'ms',
                metricVersion: 'inp-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 2,
                average: 248,
                p50: 220,
                p75: 280,
                p90: 320,
            },
            series: [],
        }
        const fetchMock = vi.fn(
            async (input: RequestInfo | URL) => {
                const url = new URL(String(input))

                if (
                    url.searchParams.get('type')
                    === 'web.vital.inp'
                ) {
                    return {
                        ok: true,
                        json: async () => inpResponse,
                    }
                }

                return {
                    ok: true,
                    json: async () => METRICS_RESPONSE,
                }
            },
        )

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App)

        await flushPromises()

        const cards = wrapper.findAllComponents(
            MetricSummaryCard,
        )
        const inpCard = cards.find(
            card => card.props('label') === 'INP',
        )

        expect(inpCard).toBeDefined()
        expect(inpCard?.props()).toMatchObject({
            label: 'INP',
            unit: 'ms',
            metricVersion: 'inp-v1',
            stats: inpResponse.summary,
        })
        expect(
            inpCard
                ?.get('[data-testid="metric-summary-average"]')
                .text(),
        ).toBe('248 ms')
    })
})
