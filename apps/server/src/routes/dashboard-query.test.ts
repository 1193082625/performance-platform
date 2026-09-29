import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { DashboardQueryService } from '../services/dashboard-query-service.js'
import { registerDashboardQueryRoutes } from './dashboard-query.js'

const TOKEN = 'session-token'
const PROJECT_ID = '101'
const APP_ID = 'app_test'

function setup() {
    const queryMetric = vi
        .fn<DashboardQueryService['queryMetric']>()
        .mockResolvedValue({ ok: true, value: { metric: 'result' } } as never)
    const queryPaint = vi
        .fn<DashboardQueryService['queryPaint']>()
        .mockResolvedValue({ ok: true, value: {} } as never)
    const queryMemoryHealth = vi
        .fn<DashboardQueryService['queryMemoryHealth']>()
        .mockResolvedValue({ ok: true, value: { status: 'healthy' } } as never)
    const queryLcpDiagnostic = vi
        .fn<DashboardQueryService['queryLcpDiagnostic']>()
        .mockResolvedValue({ ok: true, value: {} } as never)
    const queryClsDiagnostic = vi
        .fn<DashboardQueryService['queryClsDiagnostic']>()
        .mockResolvedValue({ ok: true, value: {} } as never)
    const queryInpDiagnostic = vi
        .fn<DashboardQueryService['queryInpDiagnostic']>()
        .mockResolvedValue({ ok: true, value: {} } as never)
    const evaluateAlerts = vi
        .fn<DashboardQueryService['evaluateAlerts']>()
        .mockResolvedValue({ ok: true, value: {} } as never)
    const app = Fastify()
    app.register(cookie)
    app.register(registerDashboardQueryRoutes, {
        dashboardQueryService: {
            queryMetric,
            queryPaint,
            queryMemoryHealth,
            queryLcpDiagnostic,
            queryClsDiagnostic,
            queryInpDiagnostic,
            evaluateAlerts,
        },
    })

    return { app, queryMetric, queryMemoryHealth }
}

let current: ReturnType<typeof setup> | undefined
afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test('returns a scoped metric query result for the current session', async () => {
    current = setup()
    const { app, queryMetric } = current
    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/dashboard/metrics?type=web.paint.fcp`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ metric: 'result' })
    expect(queryMetric).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        PROJECT_ID,
        APP_ID,
        { type: 'web.paint.fcp' },
    )
})

test('routes scoped paint and diagnostic requests through the same session boundary', async () => {
    current = setup()
    const { app } = current
    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/dashboard/lcp?from=2030-01-01T00:00:00.000Z`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(200)

    const paintResponse = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/dashboard/paint`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })
    expect(paintResponse.statusCode).toBe(200)
})

test('returns 401 when the dashboard query has no valid session', async () => {
    current = setup()
    const { app, queryMetric } = current
    queryMetric.mockResolvedValue({ ok: false, reason: 'UNAUTHENTICATED' })

    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/dashboard/metrics`,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({
        error: { code: 'UNAUTHENTICATED', message: '请先登录' },
    })
})

test('returns 404 when the requested app is outside the project', async () => {
    current = setup()
    const { app, queryMemoryHealth } = current
    queryMemoryHealth.mockResolvedValue({
        ok: false,
        reason: 'PROJECT_APP_NOT_FOUND',
    })

    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/dashboard/memory-health`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
        error: {
            code: 'PROJECT_APP_NOT_FOUND',
            message: '应用不存在或不属于当前项目',
        },
    })
})

test('returns a scoped memory health result for the current session', async () => {
    current = setup()
    const { app, queryMemoryHealth } = current
    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/dashboard/memory-health?from=2030-01-01T00:00:00.000Z`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'healthy' })
    expect(queryMemoryHealth).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        PROJECT_ID,
        APP_ID,
        { from: '2030-01-01T00:00:00.000Z' },
    )
})
