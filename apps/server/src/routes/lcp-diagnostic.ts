import type { FastifyInstance } from 'fastify'
import type { LcpDiagnosticService } from '../services/lcp-diagnostic-service.js'
import { createApiErrorResponse } from '../http/api-error.js'

// diagnostic 诊断的, 判断的
interface LcpDiagnosticRoutesOptions {
    lcpDiagnosticService: LcpDiagnosticService
}

export async function registerLcpDiagnosticRoutes(
    app: FastifyInstance,
    options: LcpDiagnosticRoutesOptions,
): Promise<void> {
    app.get('/api/v2/diagnostics/lcp', async (request, reply) => {
        const result = await options.lcpDiagnosticService.query(request.query)

        if (!result.ok) {
            switch (result.code) {
                case 'INVALID_DATE':
                    return reply
                        .status(400)
                        .send(
                            createApiErrorResponse(
                                result.code,
                                `${result.field} must be a valid ISO 8601 date`,
                                request.id,
                            ),
                        )

                case 'INVALID_TIME_RANGE':
                    return reply
                        .status(400)
                        .send(
                            createApiErrorResponse(
                                result.code,
                                `from must be earlier than to`,
                                request.id,
                            ),
                        )

                case 'TIME_RANGE_TOO_LARGE':
                    return reply
                        .status(400)
                        .send(
                            createApiErrorResponse(
                                result.code,
                                `time range must not exceed 30 days`,
                                request.id,
                            ),
                        )

                case 'STORAGE_UNAVAILABLE':
                    // 数据库错误只写服务端日志
                    request.log.error(
                        {
                            err: result.cause,
                        },
                        'LCP diagnostic storage unavailable',
                    )

                    // 503: 服务器目前暂时无法完成请求，但接口本身存在，请求格式也可能完全正确
                    // 比如数据库无法连接，连接池耗尽，查询超时等
                    return reply
                        .status(503)
                        .send(
                            createApiErrorResponse(
                                result.code,
                                'diagnostic storage is temporarily unavailable',
                                request.id,
                            ),
                        )

                default:
                    throw new Error(
                        `Unhandled LCP diagnostic result: ${String(result)}`,
                    )
            }
        }

        return result.value
    })
}
