import type { FastifyInstance } from 'fastify'
import type { ClsDiagnosticService } from '../services/cls-diagnostic-service.js'
import { createApiErrorResponse } from '../http/api-error.js'

export async function registerClsDiagnosticRoutes(
    app: FastifyInstance,
    options: { clsDiagnosticService: ClsDiagnosticService },
): Promise<void> {
    app.get('/api/v2/diagnostics/cls', async (request, reply) => {
        const result = await options.clsDiagnosticService.query(request.query)

        if (!result.ok) {
            switch (result.code) {
                case 'INVALID_DATE':
                    return reply.status(400).send(
                        createApiErrorResponse(
                            result.code,
                            `${result.field} must be a valid ISO 8601 date`,
                            request.id,
                        ),
                    )
                case 'INVALID_TIME_RANGE':
                    return reply.status(400).send(
                        createApiErrorResponse(
                            result.code,
                            'from must be earlier than to',
                            request.id,
                        ),
                    )
                case 'TIME_RANGE_TOO_LARGE':
                    return reply.status(400).send(
                        createApiErrorResponse(
                            result.code,
                            'time range must not exceed 30 days',
                            request.id,
                        ),
                    )
                case 'STORAGE_UNAVAILABLE':
                    request.log.error(
                        { err: result.cause },
                        'CLS diagnostic storage unavailable',
                    )
                    return reply.status(503).send(
                        createApiErrorResponse(
                            result.code,
                            'diagnostic storage is temporarily unavailable',
                            request.id,
                        ),
                    )
            }
        }

        return result.value
    })
}
