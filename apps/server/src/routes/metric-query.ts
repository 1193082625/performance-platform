import type { FastifyInstance } from "fastify";
import type { MetricQueryService } from "../services/metric-query-service.js";
import { createApiErrorResponse } from "../http/api-error.js";

interface MetricQueryRoutesOptions {
    metricQueryService: MetricQueryService
}

export async function registerMetricQueryRoutes(
    app: FastifyInstance,
    options: MetricQueryRoutesOptions,
): Promise<void> {
    const routes = [
        {
            url: '/api/v2/metrics',
            service: options.metricQueryService
        }
    ] as const

    for (const route of routes) {
        app.get(
            route.url,
            async (request, reply) => {
                const result = await options.metricQueryService.query(
                    request.query
                )

                if (!result.ok) {
                    switch(result.code) {
                        case 'UNSUPPORTED_METRIC':
                            return reply.status(400).send(
                                createApiErrorResponse(
                                    result.code,
                                    'metric type is unsupported',
                                    request.id,
                                )
                            )
                        case 'INVALID_DATE':
                            return reply.status(400).send(
                                createApiErrorResponse(
                                    result.code,
                                    `${result.field} must be a valid ISO 8601 date`,
                                    request.id
                                )
                            )
                        case 'INVALID_TIME_RANGE':
                            return reply.status(400).send(
                                createApiErrorResponse(
                                    result.code,
                                    `from must be earlier than to`,
                                    request.id
                                )
                            )
                        case 'TIME_RANGE_TOO_LARGE':
                            return reply.status(400).send(
                                createApiErrorResponse(
                                    result.code,
                                    `time range must not exceed 30 days`,
                                    request.id
                                )
                            )
                        case 'INVALID_INTERVAL':
                            return reply.status(400).send(
                                createApiErrorResponse(
                                    result.code,
                                    `interval must be one of minute, hour, or day`,
                                    request.id
                                )
                            )
                        case 'STORAGE_UNAVAILABLE':
                            request.log.error(
                                {
                                    err: result.cause,
                                },
                                'metrics storage unavailable'
                            )
                            return reply.status(503).send(
                                createApiErrorResponse(
                                    result.code,
                                    'metrics storage is temporarily unavailable',
                                    request.id,
                                )
                            )
                        
                        default:
                            throw new Error(
                                `Unhandled metric query result: ${String(result)}`,
                            )
                    }
                }

                return result.value
            }
        )
    }
}