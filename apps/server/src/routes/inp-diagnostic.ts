import type { FastifyInstance } from 'fastify'
import type { InpDiagnosticService } from '../services/inp-diagnostic-service.js'
import { createApiErrorResponse } from '../http/api-error.js'

export async function registerInpDiagnosticRoutes(
    app: FastifyInstance,
    options: { inpDiagnosticService: InpDiagnosticService },
): Promise<void> {
    app.get('/api/v2/diagnostics/inp', async (request, reply) => {
        const result = await options.inpDiagnosticService.query(request.query)

        if (!result.ok) {
            switch (result.code) {
                case 'INVALID_DATE':
                    return reply.status(400).send(createApiErrorResponse(
                        result.code,
                        `${result.field} must be a valid ISO 8601 date`,
                        request.id,
                    ))
                case 'INVALID_TIME_RANGE':
                    return reply.status(400).send(createApiErrorResponse(
                        result.code,
                        'from must be earlier than to',
                        request.id,
                    ))
                case 'TIME_RANGE_TOO_LARGE':
                    return reply.status(400).send(createApiErrorResponse(
                        result.code,
                        'time range must not exceed 30 days',
                        request.id,
                    ))
                case 'STORAGE_UNAVAILABLE':
                    request.log.error(
                        { err: result.cause },
                        'INP diagnostic storage unavailable',
                    )
                    return reply.status(503).send(createApiErrorResponse(
                        result.code,
                        'diagnostic storage is temporarily unavailable',
                        request.id,
                    ))
            }
        }

        return result.value
    })
}
