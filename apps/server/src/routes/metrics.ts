/**
 * 职责：处理 “查询性能指标”的HTTP接口
 * 对应请求： GET /api/v1/metrics/paint
 * 
 * 
 * metric -- 指标
 * measurement -- 一次测量值
 * statistics  -- 统计结果
 * metrics  -- 多项指标或指标数据
 */

import type { FastifyInstance } from "fastify";
import type { PaintMetricsService } from "../services/paint-metrics-service.js";
import { createApiErrorResponse } from "../http/api-error.js";

interface MetricsRoutesOptions {
    metricsService: PaintMetricsService
}

export async function registerMetricsRoutes(
    app: FastifyInstance,
    options: MetricsRoutesOptions,
): Promise<void> {
    app.get(
        '/api/v1/metrics/paint',
        async (request, reply) => {
            const result = await options.metricsService.query(request.query)
            if (!result.ok) {
                if ('cause' in result) {
                    request.log.error(
                        {
                            err: result.cause,
                        },
                        'metrics storage unavailable'
                    )

                    return reply.status(503).send(
                        createApiErrorResponse(
                            'STORAGE_UNAVAILABLE',
                            'metrics storage is temporarily unavailable',
                            request.id,
                        )
                    )
                }
                switch(result.code) {
                    case 'INVALID_DATE':
                        return reply.status(400).send(
                            createApiErrorResponse(
                                result.code,
                                `${result.field} must be a valid ISO 8601 date`,
                                request.id,
                            )
                        )
                    case 'INVALID_INTERVAL':
                        return reply.status(400).send(
                            createApiErrorResponse(
                                result.code,
                                `interval must be one of minute, hour, or day`,
                                request.id,
                            )
                        )
                    case 'INVALID_TIME_RANGE':
                        return reply.status(400).send(
                            createApiErrorResponse(
                                'INVALID_TIME_RANGE',
                                'from must be earlier than to',
                                request.id,
                            )
                        )
                    case 'TIME_RANGE_TOO_LARGE':
                        return reply.status(400).send(
                            createApiErrorResponse(
                                'TIME_RANGE_TOO_LARGE',
                                'time range must not exceed 30 days',
                                request.id,
                            ),
                        )
                }
            }
            return result.value
        },
    )
}