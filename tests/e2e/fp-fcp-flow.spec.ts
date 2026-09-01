import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const CONSOLE_BASE_URL =
    process.env.CONSOLE_BASE_URL
    ?? 'http://localhost:4173'

const MONITOR_ENDPOINT =
    process.env.MONITOR_ENDPOINT
    ?? 'http://localhost:3000/api/v1/events/batch'

interface PaintCounts {
    fp: number
    fcp: number
}

interface PaintMetricsResponse {
    summary: {
        fp: {
            count: number
        }
        fcp: {
            count: number
        }
    }
}

async function queryPaintCounts(
    request: APIRequestContext
): Promise<PaintCounts> {
    const response = await request.get(
        `${CONSOLE_BASE_URL}/api/v1/metrics/paint`,
    )
    expect(response.ok()).toBe(true)
    const metrics = await response.json() as PaintMetricsResponse
    return {
        fp: metrics.summary.fp.count,
        fcp: metrics.summary.fcp.count
    }
}

test(
    'capture real FP and FCP from the Demo',
    async ({
        page,
        request
    }) => {
        const before = await queryPaintCounts(request)
        // 意思是告诉 Playwright 从现在开始监听页面网络请求。如果发现目标 POST 请求，就记录下来
        const beaconResponsePromise = page.waitForResponse((response) => {
            return (
                response.url() === MONITOR_ENDPOINT && response.request().method() === 'POST'
            )
        })

        await page.goto('/')
        const beaconResponse = await beaconResponsePromise
        // 断言服务端成功接收并处理了 Beacon 请求
        expect(beaconResponse.status()).toBe(200)
        /**
         * expect.poll() 会反复执行查询，直到：
            - 条件成立；
            - 或超过 10 秒
         */
        await expect.poll(
            async () => {
                const current = await queryPaintCounts(request)
                return (
                    current.fp > before.fp && current.fcp > before.fcp
                )
            },
            {
                timeout: 10_000,
            }
        ).toBe(true)

        const metricsResponsePromise = page.waitForResponse(
            (response) => response.url().startsWith(
                `${CONSOLE_BASE_URL}/api/v1/metrics/paint`,
            ) && response.request().method() === 'GET',
        )

        await page.goto(CONSOLE_BASE_URL)
        const metricsResponse = await metricsResponsePromise

        expect(metricsResponse.status()).toBe(200)
        await expect(page.getByRole('heading', {
            name: 'PAINT PERFORMANCE'
        })).toBeVisible()
        await expect(
            page.getByRole('button', {
                name: '24h'
            })
        ).toHaveAttribute('aria-pressed', 'true')

        await expect(
            page.getByRole('heading', {
                name: 'FP',
                exact: true, // 表示名称必须完全等于 FP
            })
        ).toBeVisible()

        await expect(
            page.getByRole('heading', {
                name: 'FCP',
                exact: true,
            }),
        ).toBeVisible()
        const metricAverages = page.getByTestId('metric-average')
        await expect(metricAverages).toHaveCount(2)
        await expect(metricAverages).toHaveText([
            /\d[\d,]*(?:\.\d+)? ms/,
            /\d[\d,]*(?:\.\d+)? ms/,
        ])
        await expect(page.getByTestId('overall-score')).toBeVisible()
        await expect(
            page.getByText('性能数据加载失败'),
        ).toHaveCount(0)
    }
)