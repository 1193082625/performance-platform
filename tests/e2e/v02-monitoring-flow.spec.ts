import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const CONSOLE_BASE_URL =
    process.env.CONSOLE_BASE_URL
    ?? 'http://localhost:4173'

const MONITOR_ENDPOINT =
    process.env.MONITOR_ENDPOINT
    ?? 'http://localhost:3000/api/v2/events/batch'

const GENERIC_METRICS = [
    'web.vital.lcp',
    'web.vital.cls',
    'web.vital.inp',
    'web.memory.used_heap',
] as const

type GenericMetric = typeof GENERIC_METRICS[number]

interface PaintCounts {
    fp: number
    fcp: number
}

interface PaintMetricsResponse {
    summary: {
        fp: { count: number }
        fcp: { count: number }
    }
}

interface MetricQueryResponse {
    summary: {
        count: number
    }
}

async function queryPaintCounts(
    request: APIRequestContext,
): Promise<PaintCounts> {
    const response = await request.get(
        `${CONSOLE_BASE_URL}/api/v1/metrics/paint`,
    )
    expect(response.ok()).toBe(true)
    const metrics = await response.json() as PaintMetricsResponse
    return {
        fp: metrics.summary.fp.count,
        fcp: metrics.summary.fcp.count,
    }
}

async function queryMetricCount(
    request: APIRequestContext,
    type: GenericMetric,
): Promise<number> {
    const search = new URLSearchParams({ type })
    const response = await request.get(
        `${CONSOLE_BASE_URL}/api/v2/metrics?${search.toString()}`,
    )
    expect(response.ok()).toBe(true)
    const metric = await response.json() as MetricQueryResponse
    return metric.summary.count
}

test(
    'captures and displays the v0.2 monitoring flow',
    async ({ page, request }) => {
        const pageErrors: string[] = []
        const successfulBatches: string[] = []

        page.on('pageerror', error => {
            pageErrors.push(error.message)
        })
        page.on('response', response => {
            if (
                response.url() === MONITOR_ENDPOINT
                && response.request().method() === 'POST'
                && response.ok()
            ) {
                successfulBatches.push(response.url())
            }
        })

        const paintBefore = await queryPaintCounts(request)
        const genericBefore = new Map<GenericMetric, number>()

        for (const type of GENERIC_METRICS) {
            genericBefore.set(
                type,
                await queryMetricCount(request, type),
            )
        }

        await page.goto('/')
        await expect(page.getByRole('button', {
            name: 'Simulate slow interaction',
        })).toBeVisible()

        await page.waitForTimeout(1_500)
        const inpDemo = page.locator('#inp-demo')

        for (let interaction = 0; interaction < 3; interaction += 1) {
            await inpDemo.click()
            await page.waitForTimeout(350)
        }

        await expect(page.getByRole('button', {
            name: 'Slow interaction completed',
        })).toBeVisible()
        await page.waitForTimeout(1_000)

        await page.goto(CONSOLE_BASE_URL)
        await expect(page.getByRole('heading', {
            name: 'WEB PERFORMANCE',
        })).toBeVisible()

        await expect.poll(
            async () => {
                const current = await queryPaintCounts(request)
                return current.fp > paintBefore.fp
                    && current.fcp > paintBefore.fcp
            },
            { timeout: 15_000 },
        ).toBe(true)

        for (const type of GENERIC_METRICS) {
            const before = genericBefore.get(type) ?? 0

            await expect.poll(
                async () => ({
                    type,
                    increased:
                        await queryMetricCount(request, type)
                        > before,
                }),
                { timeout: 15_000 },
            ).toEqual({
                type,
                increased: true,
            })
        }

        expect(successfulBatches.length).toBeGreaterThan(0)

        for (const heading of [
            'FP',
            'FCP',
            'LCP',
            'CLS',
            'INP',
            'USED HEAP',
            'TOTAL HEAP',
            'HEAP LIMIT',
        ]) {
            await expect(page.getByRole('heading', {
                name: heading,
                exact: true,
            })).toBeVisible()
        }

        await expect(page.getByText('MEMORY HEALTH')).toBeVisible()
        await expect(page.getByRole('button', {
            name: '24h',
        })).toHaveAttribute('aria-pressed', 'true')

        for (const metric of ['LCP', 'CLS', 'INP', 'MEMORY']) {
            const button = page.getByRole('button', {
                name: metric,
                exact: true,
            })
            await button.click()
            await expect(button).toHaveAttribute('aria-pressed', 'true')
            await expect(
                page.getByTestId('metric-trend-chart'),
            ).toBeVisible()
        }

        await expect(
            page.getByText('性能数据加载失败'),
        ).toHaveCount(0)
        await expect(
            page.getByText('内存数据加载失败'),
        ).toHaveCount(0)
        expect(pageErrors).toEqual([])
    },
)
