import type { FastifyInstance } from 'fastify'
import { createApiErrorResponse } from '../http/api-error.js'
import { SESSION_COOKIE_NAME } from '../http/session-cookie.js'
import type { DashboardQueryService } from '../services/dashboard-query-service.js'

interface DashboardQueryRoutesOptions {
    dashboardQueryService: DashboardQueryService
}

interface DashboardParams {
    projectId: string
    appId: string
}

type DashboardRouteResult =
    | { ok: true; value: unknown }
    | {
          ok: false
          reason:
              | 'UNAUTHENTICATED'
              | 'PROJECT_NOT_FOUND'
              | 'PROJECT_APP_NOT_FOUND'
      }
    | {
          ok: false
          code:
              | 'UNSUPPORTED_METRIC'
              | 'INVALID_DATE'
              | 'INVALID_INTERVAL'
              | 'INVALID_TIME_RANGE'
              | 'TIME_RANGE_TOO_LARGE'
              | 'STORAGE_UNAVAILABLE'
      }

function accessFailure(
    reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'PROJECT_APP_NOT_FOUND',
): { statusCode: number; message: string } {
    if (reason === 'UNAUTHENTICATED') {
        return { statusCode: 401, message: '请先登录' }
    }
    if (reason === 'PROJECT_NOT_FOUND') {
        return { statusCode: 404, message: '项目不存在或无权访问' }
    }
    return { statusCode: 404, message: '应用不存在或不属于当前项目' }
}

function queryFailure(
    code:
        | 'UNSUPPORTED_METRIC'
        | 'INVALID_DATE'
        | 'INVALID_INTERVAL'
        | 'INVALID_TIME_RANGE'
        | 'TIME_RANGE_TOO_LARGE'
        | 'STORAGE_UNAVAILABLE',
    requestId: string,
): { statusCode: number; body: ReturnType<typeof createApiErrorResponse> } {
    switch (code) {
        case 'UNSUPPORTED_METRIC':
            return {
                statusCode: 400,
                body: createApiErrorResponse(
                    code,
                    'metric type is unsupported',
                    requestId,
                ),
            }
        case 'INVALID_DATE':
            return {
                statusCode: 400,
                body: createApiErrorResponse(
                    code,
                    'from or to must be a valid ISO 8601 date',
                    requestId,
                ),
            }
        case 'INVALID_INTERVAL':
            return {
                statusCode: 400,
                body: createApiErrorResponse(
                    code,
                    'interval must be one of minute, hour, or day',
                    requestId,
                ),
            }
        case 'INVALID_TIME_RANGE':
            return {
                statusCode: 400,
                body: createApiErrorResponse(
                    code,
                    'from must be earlier than to',
                    requestId,
                ),
            }
        case 'TIME_RANGE_TOO_LARGE':
            return {
                statusCode: 400,
                body: createApiErrorResponse(
                    code,
                    'time range must not exceed 30 days',
                    requestId,
                ),
            }
        case 'STORAGE_UNAVAILABLE':
            return {
                statusCode: 503,
                body: createApiErrorResponse(
                    code,
                    'dashboard data is temporarily unavailable',
                    requestId,
                ),
            }
    }
}

export async function registerDashboardQueryRoutes(
    app: FastifyInstance,
    options: DashboardQueryRoutesOptions,
): Promise<void> {
    function sendResult(
        result: DashboardRouteResult,
        requestId: string,
        reply: { status: (statusCode: number) => { send: (body: unknown) => unknown } },
    ): unknown {
        if (result.ok) return reply.status(200).send(result.value)

        if ('reason' in result) {
            const failure = accessFailure(result.reason)
            return reply
                .status(failure.statusCode)
                .send(
                    createApiErrorResponse(
                        result.reason,
                        failure.message,
                        requestId,
                    ),
                )
        }

        const failure = queryFailure(result.code, requestId)
        return reply.status(failure.statusCode).send(failure.body)
    }

    app.get<{ Params: DashboardParams }>(
        '/monitor-api/projects/:projectId/apps/:appId/dashboard/paint',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')
            const result = await options.dashboardQueryService.queryPaint(
                request.cookies[SESSION_COOKIE_NAME],
                request.params.projectId,
                request.params.appId,
                request.query,
            )
            return sendResult(result, request.id, reply)
        },
    )

    app.get<{ Params: DashboardParams }>(
        '/monitor-api/projects/:projectId/apps/:appId/dashboard/metrics',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')
            const result = await options.dashboardQueryService.queryMetric(
                request.cookies[SESSION_COOKIE_NAME],
                request.params.projectId,
                request.params.appId,
                request.query,
            )

            return sendResult(result, request.id, reply)
        },
    )

    app.get<{ Params: DashboardParams }>(
        '/monitor-api/projects/:projectId/apps/:appId/dashboard/memory-health',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')
            const result =
                await options.dashboardQueryService.queryMemoryHealth(
                    request.cookies[SESSION_COOKIE_NAME],
                    request.params.projectId,
                    request.params.appId,
                    request.query,
                )

            return sendResult(result, request.id, reply)
        },
    )

    const diagnostics = [
        ['lcp', 'queryLcpDiagnostic'],
        ['cls', 'queryClsDiagnostic'],
        ['inp', 'queryInpDiagnostic'],
        ['alerts', 'evaluateAlerts'],
    ] as const

    for (const [name, method] of diagnostics) {
        app.get<{ Params: DashboardParams }>(
            `/monitor-api/projects/:projectId/apps/:appId/dashboard/${name}`,
            async (request, reply) => {
                reply.header('Cache-Control', 'no-store')
                const result = await options.dashboardQueryService[method](
                    request.cookies[SESSION_COOKIE_NAME],
                    request.params.projectId,
                    request.params.appId,
                    request.query,
                )
                return sendResult(result, request.id, reply)
            },
        )
    }
}
