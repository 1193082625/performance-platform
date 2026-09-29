import { describe, it, expect, afterEach, vi } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'

vi.mock('vue-echarts', () => ({
    default: {
        name: 'VChart',

        props: ['option', 'autoresize'],

        template: '<div data-testid="echarts-stub" />',
    },
}))

import App from './App.vue'
import type { PaintMetricsResponse } from '@performance-platform/protocol'
import TrendChart from './components/TrendChart.vue'
import MetricSummaryCard from './components/MetricSummaryCard.vue'
import { LOCALE_STORAGE_KEY } from './i18n.js'

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
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('renders a successful paint response without an error state', async () => {
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
                    },
                },
            }),
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        expect(wrapper.text()).toContain('120 ms')
        expect(wrapper.text()).toContain('260 ms')
        expect(wrapper.text()).not.toContain('Unable to load performance data')
    })

    it('opens the current alert drawer from the top bar', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'
            if (url.pathname === '/api/v2/alerts/evaluate') {
                return {
                    ok: true,
                    json: async () => ({
                        range: METRICS_RESPONSE.range,
                        evaluatedAt: METRICS_RESPONSE.range.to,
                        events: [
                            {
                                schemaVersion: '1.0',
                                alertId: 'alert-inp',
                                status: 'triggered',
                                ruleId: 'web-vital.inp-p75',
                                ruleVersion: '1',
                                application: { id: 'demo-web' },
                                range: METRICS_RESPONSE.range,
                                observedAt: METRICS_RESPONSE.range.to,
                                metric: {
                                    type: 'web.vital.inp',
                                    unit: 'ms',
                                    metricVersion: 'inp-v1',
                                    statistic: 'p75',
                                    value: 520,
                                    threshold: 200,
                                    operator: 'gt',
                                },
                                evidence: {
                                    sampleCount: 100,
                                    diagnosticSampleCount: 100,
                                    diagnosticEvidenceSampleCount: 80,
                                },
                                diagnosticFindings: [],
                            },
                        ],
                    }),
                }
            }
            return { ok: true, json: async () => METRICS_RESPONSE }
        })
        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        const button = wrapper.get('.alert-count-button')
        expect(button.text()).toContain('1')
        await button.trigger('click')
        expect(wrapper.get('[role="dialog"]').text()).toContain('INP')
        await wrapper.get('.alert-drawer__close').trigger('click')
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })

    it('shows a loading state while metrics are being requested', async () => {
        const fetchMock = vi.fn()

        fetchMock.mockResolvedValue(
            new Promise(() => {
                // 故意保持 pending
            }),
        )
        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()
        expect(wrapper.text()).toContain('Loading performance data')
        expect(wrapper.text()).not.toContain('暂无评分')
    })

    it('shows an error when metrics cannot be loaded', async () => {
        const fetchMock = vi.fn()
        fetchMock.mockRejectedValue(new Error('network unavailable'))
        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()
        expect(wrapper.text()).toContain('Unable to load performance data')
        expect(wrapper.text()).not.toContain('暂无评分')
        expect(wrapper.find('[data-testid="overall-score"]').exists()).toBe(
            false,
        )
    })
    it('shows an empty state when the request succeeds without samples', async () => {
        const fetchMock = vi.fn()

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                ...METRICS_RESPONSE,
                score: null,
            }),
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        expect(wrapper.text()).toContain('No performance data')
        expect(wrapper.findAll('.metric-card__state--empty')).toHaveLength(5)
        expect(wrapper.text()).toContain('No trend data')
        expect(wrapper.text()).not.toContain('Unable to load performance data')
    })
    it('loads the selected range immediately', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(NOW)

        const fetchMock = vi.fn()

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        const sevenDayButton = wrapper
            .findAll('button')
            .find((button) => button.text() === '7d')

        expect(sevenDayButton).toBeDefined()

        await sevenDayButton!.trigger('click')
        await flushPromises()

        expect(fetchMock.mock.calls.length).toBeGreaterThan(12)

        const requestUrl = new URL(String(fetchMock.mock.calls[12]?.[0]))

        expect(requestUrl.searchParams.get('from')).toBe(
            new Date(NOW - SEVEN_DAYS_MS).toISOString(),
        )

        expect(requestUrl.searchParams.get('to')).toBe(
            new Date(NOW).toISOString(),
        )

        expect(requestUrl.searchParams.get('interval')).toBe('day')
    })
    it('explains the local-time axis only for the 1h range', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })
        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        expect(wrapper.get('footer').text()).toContain('UTC')

        const oneHourButton = wrapper
            .findAll('button')
            .find((button) => button.text() === '1h')

        expect(oneHourButton).toBeDefined()
        await oneHourButton!.trigger('click')
        await flushPromises()

        expect(wrapper.get('footer').text()).toContain('local time')
        expect(wrapper.get('footer').text()).not.toContain(
            'All times are in UTC',
        )
    })
    it('shows FP and FCP summary cards', async () => {
        const fetchMock = vi.fn()
        const paintResponse = {
            ...METRICS_RESPONSE,
            summary: {
                fp: { ...EMPTY_STATS, average: 1_000 },
                fcp: { ...EMPTY_STATS, average: 1_500 },
            },
        }

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => paintResponse,
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        const cards = wrapper.findAllComponents(MetricSummaryCard)

        expect(cards).toHaveLength(5)

        expect(cards[0]?.props('metric')).toMatchObject({
            name: 'FP',
            stats: paintResponse.summary.fp,
            progress: 50,
        })

        expect(cards[1]?.props('metric')).toMatchObject({
            name: 'FCP',
            stats: paintResponse.summary.fcp,
            progress: 50,
        })
    })
    it('passes the paint trend returned by the API to TrendChart', async () => {
        const trendPoints = [
            {
                time: '2026-08-31T10:00:00.000Z',
                fp: {
                    ...METRICS_RESPONSE.summary.fp,
                    average: 120,
                    p75: 180,
                },
                fcp: {
                    ...METRICS_RESPONSE.summary.fcp,
                    average: 260,
                    p75: 340,
                },
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

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        const [averageChart, p75Chart] = wrapper.findAllComponents(TrendChart)

        expect(averageChart).toBeDefined()
        expect(p75Chart).toBeDefined()

        expect(averageChart!.props('series')).toEqual([
            {
                key: 'fp',
                label: 'FP',
                unit: 'ms',
                color: '#09d9ea',
                points: [
                    {
                        time: '2026-08-31T10:00:00.000Z',
                        value: 120,
                    },
                ],
            },
            {
                key: 'fcp',
                label: 'FCP',
                unit: 'ms',
                color: '#00baff',
                points: [
                    {
                        time: '2026-08-31T10:00:00.000Z',
                        value: 260,
                    },
                ],
            },
        ])

        expect(averageChart!.props('ariaLabel')).toBe(
            'PAINT average performance trend',
        )
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
            'web.memory.used_heap': {
                type: 'web.memory.used_heap',
                unit: 'byte',
                metricVersion: 'memory-v1',
            },
            'web.memory.total_heap': {
                type: 'web.memory.total_heap',
                unit: 'byte',
                metricVersion: 'memory-v1',
            },
            'web.memory.heap_limit': {
                type: 'web.memory.heap_limit',
                unit: 'byte',
                metricVersion: 'memory-v1',
            },
        } as const
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            if (url.pathname !== '/api/v2/metrics') {
                return {
                    ok: true,
                    json: async () => METRICS_RESPONSE,
                }
            }

            const type = url.searchParams.get(
                'type',
            ) as keyof typeof definitions

            return {
                ok: true,
                json: async () => ({
                    metric: definitions[type],
                    range: METRICS_RESPONSE.range,
                    summary: metricSeries[0]!.stats,
                    series: metricSeries,
                }),
            }
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(12)

        for (const expected of [
            {
                button: 'LCP',
                key: 'lcp',
                label: 'LCP',
                unit: 'ms',
                color: '#ae66fa',
            },
            {
                button: 'CLS',
                key: 'cls',
                label: 'CLS',
                unit: 'score',
                color: '#e262ef',
            },
            {
                button: 'INP',
                key: 'inp',
                label: 'INP',
                unit: 'ms',
                color: '#9860ee',
            },
            {
                button: 'MEMORY',
                key: 'used-heap',
                label: 'Used Heap',
                unit: 'byte',
                color: '#7be66b',
            },
        ] as const) {
            const button = wrapper
                .findAll('.metric-tabs button')
                .find((item) => item.text() === expected.button)

            expect(button).toBeDefined()

            await button!.trigger('click')

            const trendCharts = wrapper.findAllComponents(TrendChart)
            const p75Chart = trendCharts[1]

            expect(p75Chart).toBeDefined()

            expect(p75Chart!.props('series')).toEqual([
                {
                    key: expected.key,
                    label: expected.label,
                    unit: expected.unit,
                    color: expected.color,
                    points: [
                        {
                            time: '2026-08-31T10:00:00.000Z',
                            value: 196,
                        },
                    ],
                },
            ])

            expect(p75Chart!.props('ariaLabel')).toBe(
                `${expected.button} P75 performance trend`,
            )
        }

        expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(12)
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

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        expect(wrapper.text()).toContain('WEB PERFORMANCE')

        const activeRange = wrapper.get('.range-tabs button.active')

        expect(activeRange.text()).toBe('24h')
        expect(activeRange.attributes('aria-pressed')).toBe('true')

        expect(wrapper.text()).toContain('TOTAL SAMPLES')

        expect(wrapper.text()).toContain('240')
    })

    it('switches the dashboard between English and Chinese', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        expect(wrapper.get('h1').text()).toBe('WEB PERFORMANCE')
        expect(wrapper.text()).toContain('TOTAL SAMPLES')

        await wrapper.get('.locale-toggle').trigger('click')

        expect(wrapper.get('h1').text()).toBe('网页性能监控')
        expect(wrapper.text()).toContain('样本总数')
        expect(wrapper.text()).toContain('平均值趋势')
        expect(document.documentElement.lang).toBe('zh-CN')
        expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh-CN')

        wrapper.unmount()
    })

    it('shows and updates the real UTC clock while LIVE', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-08-30T00:00:00.000Z'))

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        const dateTime = wrapper.get('.date-time')

        expect(dateTime.get('span').text()).toBe('AUG 30, 2026')
        expect(dateTime.get('strong').text()).toBe('00:00:00 UTC')

        await vi.advanceTimersByTimeAsync(1_000)

        expect(dateTime.get('strong').text()).toBe('00:00:01 UTC')

        await wrapper.get('.live-badge').trigger('click')
        await vi.advanceTimersByTimeAsync(5_000)

        expect(dateTime.get('strong').text()).toBe('00:00:01 UTC')

        wrapper.unmount()
    })

    it('refreshes automatically while LIVE and pauses on demand', async () => {
        vi.useFakeTimers()

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => METRICS_RESPONSE,
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(12)

        await vi.advanceTimersByTimeAsync(30_000)
        await flushPromises()
        expect(fetchMock.mock.calls.length).toBeGreaterThan(12)

        const liveButton = wrapper.get('.live-badge')
        await liveButton.trigger('click')
        expect(liveButton.text()).toContain('PAUSED')

        await vi.advanceTimersByTimeAsync(60_000)
        await flushPromises()
        expect(fetchMock.mock.calls.length).toBeGreaterThan(12)

        await liveButton.trigger('click')
        await flushPromises()
        expect(liveButton.text()).toContain('LIVE')
        expect(fetchMock).toHaveBeenCalledTimes(36)

        wrapper.unmount()
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

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            return {
                ok: true,
                json: async () =>
                    url.pathname === '/api/v2/metrics'
                        ? lcpResponse
                        : METRICS_RESPONSE,
            }
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        expect(wrapper.text()).toContain('LCP')

        const lcpCard = wrapper
            .findAllComponents(MetricSummaryCard)
            .find((card) => card.props('metric').name === 'LCP')

        expect(lcpCard).toBeDefined()

        expect(lcpCard!.props('metric')).toMatchObject({
            name: 'LCP',
            unit: 'ms',
            stats: lcpResponse.summary,
            progress: 3.9,
        })

        expect(lcpCard!.get('dl dd').text()).toBe('156 ms')
        expect(lcpCard!.get('.ring-value strong').text()).toBe('156')

        const lcpRequest = fetchMock.mock.calls.find(([input]) =>
            new URL(String(input)).pathname.endsWith('/dashboard/metrics'),
        )

        expect(lcpRequest).toBeDefined()

        const url = new URL(String(lcpRequest?.[0]))

        expect(url.searchParams.get('type')).toBe('web.vital.lcp')
    })

    it('passes evidence-backed LCP advice to the metric card', async () => {
        const lcpResponse = {
            metric: {
                type: 'web.vital.lcp',
                unit: 'ms',
                metricVersion: 'lcp-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 100,
                average: 3_000,
                p50: 2_900,
                p75: 3_200,
                p90: 3_600,
            },
            series: [],
        }
        const diagnosticResponse = {
            metric: lcpResponse.metric,
            range: {
                from: METRICS_RESPONSE.range.from,
                to: METRICS_RESPONSE.range.to,
            },
            sampleCount: 100,
            evidenceSampleCount: 80,
            overall: { average: 3_000, p75: 3_200 },
            phases: {
                timeToFirstByte: { average: 900, p75: 1_000 },
                resourceLoadDelay: { average: 600, p75: 700 },
                resourceLoadDuration: { average: 1_100, p75: 1_200 },
                elementRenderDelay: { average: 400, p75: 500 },
            },
            findings: [
                {
                    ruleId: 'lcp.late-resource-discovery',
                    ruleVersion: '1',
                    phase: 'resourceLoadDelay',
                    evidence: {
                        overallP75: 3_200,
                        phaseAverage: 600,
                        contribution: 0.2,
                        targetShare: 0.1,
                        sampleCount: 100,
                        evidenceSampleCount: 80,
                    },
                },
            ],
        }
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            return {
                ok: true,
                json: async () => {
                    if (url.pathname === '/api/v2/diagnostics/lcp') {
                        return diagnosticResponse
                    }
                    if (
                        url.pathname === '/api/v2/metrics' &&
                        url.searchParams.get('type') === 'web.vital.lcp'
                    ) {
                        return lcpResponse
                    }
                    return METRICS_RESPONSE
                },
            }
        })

        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        const lcpCard = wrapper
            .findAllComponents(MetricSummaryCard)
            .find((card) => card.props('metric').name === 'LCP')

        expect(lcpCard?.props('recommendation')).toEqual({
            metric: 'LCP',
            status: 'NEEDS_IMPROVEMENT',
            messageKey: 'recommendations.lcpLateResourceDiscovery',
            messageParams: {
                contribution: 20,
                target: 10,
                evidenceSamples: 80,
                samples: 100,
            },
        })
    })

    it('passes evidence-backed CLS advice to the metric card', async () => {
        const clsResponse = {
            metric: {
                type: 'web.vital.cls',
                unit: 'score',
                metricVersion: 'cls-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 100,
                average: 0.16,
                p50: 0.14,
                p75: 0.18,
                p90: 0.24,
            },
            series: [],
        }
        const diagnosticResponse = {
            metric: clsResponse.metric,
            range: {
                from: METRICS_RESPONSE.range.from,
                to: METRICS_RESPONSE.range.to,
            },
            sampleCount: 100,
            evidenceSampleCount: 80,
            overall: { average: 0.16, p75: 0.18 },
            largestShift: { average: 0.12, p75: 0.14 },
            loadStates: {
                loading: 0,
                domInteractive: 0,
                domContentLoaded: 20,
                complete: 60,
            },
            dominantTarget: {
                selector: '.promo-banner',
                count: 32,
                share: 0.4,
            },
            findings: [
                {
                    ruleId: 'cls.repeated-shift-target',
                    ruleVersion: '1',
                    target: '.promo-banner',
                    evidence: {
                        overallP75: 0.18,
                        sampleCount: 100,
                        evidenceSampleCount: 80,
                        affectedSampleCount: 32,
                        share: 0.4,
                    },
                },
            ],
        }
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            return {
                ok: true,
                json: async () => {
                    if (url.pathname === '/api/v2/diagnostics/cls') {
                        return diagnosticResponse
                    }
                    if (
                        url.pathname === '/api/v2/metrics' &&
                        url.searchParams.get('type') === 'web.vital.cls'
                    ) {
                        return clsResponse
                    }
                    return METRICS_RESPONSE
                },
            }
        })

        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        const clsCard = wrapper
            .findAllComponents(MetricSummaryCard)
            .find((card) => card.props('metric').name === 'CLS')

        expect(clsCard?.props('recommendation')).toEqual({
            metric: 'CLS',
            status: 'NEEDS_IMPROVEMENT',
            messageKey: 'recommendations.clsRepeatedShiftTarget',
            messageParams: {
                target: '.promo-banner',
                affectedSamples: 32,
                evidenceSamples: 80,
                samples: 100,
                share: 40,
            },
        })
    })

    it('passes evidence-backed INP advice to the metric card', async () => {
        const inpResponse = {
            metric: {
                type: 'web.vital.inp',
                unit: 'ms',
                metricVersion: 'inp-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 100,
                average: 260,
                p50: 240,
                p75: 280,
                p90: 340,
            },
            series: [],
        }
        const diagnosticResponse = {
            metric: inpResponse.metric,
            range: {
                from: METRICS_RESPONSE.range.from,
                to: METRICS_RESPONSE.range.to,
            },
            sampleCount: 100,
            evidenceSampleCount: 80,
            overall: { average: 260, p75: 280 },
            phases: {
                inputDelay: { average: 40, p75: 50 },
                processingDuration: { average: 140, p75: 160 },
                presentationDelay: { average: 80, p75: 90 },
            },
            dominantTarget: null,
            findings: [
                {
                    ruleId: 'inp.slow-event-handler',
                    ruleVersion: '1',
                    phase: 'processingDuration',
                    evidence: {
                        overallP75: 280,
                        phaseAverage: 140,
                        contribution: 140 / 260,
                        sampleCount: 100,
                        evidenceSampleCount: 80,
                    },
                },
            ],
        }
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'
            return {
                ok: true,
                json: async () => {
                    if (url.pathname === '/api/v2/diagnostics/inp') {
                        return diagnosticResponse
                    }
                    if (
                        url.pathname === '/api/v2/metrics' &&
                        url.searchParams.get('type') === 'web.vital.inp'
                    ) {
                        return inpResponse
                    }
                    return METRICS_RESPONSE
                },
            }
        })

        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        const inpCard = wrapper
            .findAllComponents(MetricSummaryCard)
            .find((card) => card.props('metric').name === 'INP')
        expect(inpCard?.props('recommendation')).toEqual({
            metric: 'INP',
            status: 'NEEDS_IMPROVEMENT',
            messageKey: 'recommendations.inpSlowEventHandler',
            messageParams: {
                phaseAverage: 140,
                contribution: 54,
                evidenceSamples: 80,
                samples: 100,
            },
        })
    })

    it('shows insufficient-evidence details for an abnormal INP', async () => {
        const inpResponse = {
            metric: {
                type: 'web.vital.inp',
                unit: 'ms',
                metricVersion: 'inp-v1',
            },
            range: METRICS_RESPONSE.range,
            summary: {
                count: 20,
                average: 260,
                p50: 240,
                p75: 280,
                p90: 340,
            },
            series: [],
        }
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'
            return {
                ok: true,
                json: async () => {
                    if (url.pathname === '/api/v2/diagnostics/inp') {
                        return {
                            metric: inpResponse.metric,
                            range: inpResponse.range,
                            sampleCount: 20,
                            evidenceSampleCount: 8,
                            overall: { average: 260, p75: 280 },
                            phases: {
                                inputDelay: { average: 40, p75: 50 },
                                processingDuration: { average: 140, p75: 160 },
                                presentationDelay: { average: 80, p75: 90 },
                            },
                            dominantTarget: null,
                            findings: [],
                        }
                    }
                    if (
                        url.pathname === '/api/v2/metrics' &&
                        url.searchParams.get('type') === 'web.vital.inp'
                    ) {
                        return inpResponse
                    }
                    return METRICS_RESPONSE
                },
            }
        })

        vi.stubGlobal('fetch', fetchMock)
        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()
        const inpCard = wrapper
            .findAllComponents(MetricSummaryCard)
            .find((card) => card.props('metric').name === 'INP')

        expect(inpCard?.props('recommendation')).toMatchObject({
            metric: 'INP',
            messageKey: 'recommendations.inpInsufficientEvidence',
            messageParams: {
                evidenceSamples: 8,
                samples: 20,
                coverage: 40,
            },
        })
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
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            if (url.searchParams.get('type') === 'web.vital.cls') {
                return {
                    ok: true,
                    json: async () => clsResponse,
                }
            }

            return {
                ok: true,
                json: async () => METRICS_RESPONSE,
            }
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        const cards = wrapper.findAllComponents(MetricSummaryCard)
        const clsCard = cards.find(
            (card) => card.props('metric').name === 'CLS',
        )

        expect(clsCard).toBeDefined()
        expect(clsCard!.props('metric')).toMatchObject({
            name: 'CLS',
            unit: 'score',
            stats: clsResponse.summary,
            progress: 28.8,
        })
        expect(clsCard!.get('dl dd').text()).toBe('0.072')
        expect(clsCard!.get('.ring-value strong').text()).toBe('0.072')
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
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            if (url.searchParams.get('type') === 'web.vital.inp') {
                return {
                    ok: true,
                    json: async () => inpResponse,
                }
            }

            return {
                ok: true,
                json: async () => METRICS_RESPONSE,
            }
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        const cards = wrapper.findAllComponents(MetricSummaryCard)
        const inpCard = cards.find(
            (card) => card.props('metric').name === 'INP',
        )

        expect(inpCard).toBeDefined()
        expect(inpCard!.props('metric')).toMatchObject({
            name: 'INP',
            unit: 'ms',
            stats: inpResponse.summary,
            progress: 49.6,
        })
        expect(inpCard!.get('dl dd').text()).toBe('248 ms')
        expect(inpCard!.get('.ring-value strong').text()).toBe('248')
    })

    it('loads and shows the three memory summaries', async () => {
        const memoryValues = {
            'web.memory.used_heap': 23_437_190,
            'web.memory.total_heap': 24_018_882,
            'web.memory.heap_limit': 4_395_630_592,
        } as const

        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'
            const type = url.searchParams.get('type')

            if (type !== null && Object.hasOwn(memoryValues, type)) {
                const value = memoryValues[type as keyof typeof memoryValues]

                return {
                    ok: true,
                    json: async () => ({
                        metric: {
                            type,
                            unit: 'byte',
                            metricVersion: 'memory-v1',
                        },
                        range: METRICS_RESPONSE.range,
                        summary: {
                            count: 1,
                            average: value,
                            p50: value,
                            p75: value,
                            p90: value,
                        },
                        series: [],
                    }),
                }
            }

            return {
                ok: true,
                json: async () => METRICS_RESPONSE,
            }
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })

        await flushPromises()

        const memoryCards = wrapper.findAll('.heap-card')

        expect(memoryCards).toHaveLength(3)

        expect(memoryCards.map((card) => card.get('h2').text())).toEqual([
            'USED HEAP',
            'TOTAL HEAP',
            'HEAP LIMIT',
        ])

        expect(wrapper.text()).toContain('22.35 MiB')
        expect(wrapper.text()).toContain('22.91 MiB')
        expect(wrapper.text()).toContain('4.09 GiB')

        const usedHeapCard = memoryCards[0]!
        const expectedUtilization =
            memoryValues['web.memory.used_heap'] /
            memoryValues['web.memory.heap_limit']

        expect(usedHeapCard.get('p').text()).toBe(
            `${(expectedUtilization * 100).toFixed(1)}% of Heap Limit`,
        )
        expect(usedHeapCard.findAll('.segmented-bar .filled')).toHaveLength(
            Math.ceil(expectedUtilization * 14),
        )
    })

    it('renders memory health from the memory health API', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = new URL(String(input))
            if (url.pathname === '/monitor-api/projects') {
                return {
                    ok: true,
                    json: async () => ({
                        projects: [
                            {
                                id: 'demo-project',
                                name: 'demo-web',
                                description: '',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname === '/monitor-api/projects/demo-project/apps') {
                return {
                    ok: true,
                    json: async () => ({
                        apps: [
                            {
                                id: 'demo-app',
                                projectId: 'demo-project',
                                appId: 'demo-web',
                                name: 'demo-web',
                                platform: 'web',
                            },
                        ],
                    }),
                }
            }
            if (url.pathname.endsWith('/dashboard/metrics'))
                url.pathname = '/api/v2/metrics'
            if (url.pathname.endsWith('/dashboard/memory-health'))
                url.pathname = '/api/v2/memory-health'

            if (url.pathname === '/api/v2/memory-health') {
                return {
                    ok: true,
                    json: async () => ({
                        status: 'WARNING',
                        reasons: [
                            'HIGH_HEAP_PRESSURE',
                            'SUSTAINED_HEAP_GROWTH',
                        ],
                        sampleCount: 12,
                        window: { from: 1, to: 2 },
                        latest: {
                            usedHeap: 760,
                            heapLimit: 1_000,
                            utilization: 0.76,
                        },
                        growth: {
                            absolute: 100,
                            ratio: 0.2,
                            increasingTransitionRatio: 0.8,
                        },
                    }),
                }
            }

            return {
                ok: true,
                json: async () => METRICS_RESPONSE,
            }
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(App, {
            props: { scope: { projectId: 'project-1', appId: 'demo-web' } },
        })
        await flushPromises()

        const healthCard = wrapper.get('.health-card')

        expect(healthCard.attributes('data-status')).toBe('WARNING')
        expect(healthCard.text()).toContain('76.0%')
        expect(healthCard.text()).toContain('GOOD (12)')
        expect(healthCard.text()).toContain(
            'Heap utilization is above the healthy threshold.',
        )
        expect(healthCard.text()).toContain(
            'Heap usage shows sustained growth.',
        )
    })
})
