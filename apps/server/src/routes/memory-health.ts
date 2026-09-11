import type { FastifyInstance } from 'fastify'
import { createApiErrorResponse } from '../http/api-error.js'
import type { MemoryHealthService } from '../services/memory-health-service.js'

export async function registerMemoryHealthRoutes(
    app: FastifyInstance,
    options: { memoryHealthService: MemoryHealthService },
): Promise<void> {
    app.get('/api/v2/memory-health', async (request, reply) => {
        const result = await options.memoryHealthService.query(request.query)

        if (!result.ok) {
            if (result.code === 'INVALID_DATE') {
                return reply.status(400).send(createApiErrorResponse(
                    result.code,
                    `${result.field} must be a valid ISO 8601 date`,
                    request.id,
                ))
            }
            if (result.code === 'INVALID_TIME_RANGE') {
                return reply.status(400).send(createApiErrorResponse(
                    result.code,
                    'from must be earlier than to',
                    request.id,
                ))
            }
            if (result.code === 'TIME_RANGE_TOO_LARGE') {
                return reply.status(400).send(createApiErrorResponse(
                    result.code,
                    'time range must not exceed 30 days',
                    request.id,
                ))
            }

            request.log.error(
                { err: result.cause },
                'memory health storage unavailable',
            )
            return reply.status(503).send(
                createApiErrorResponse(
                    result.code,
                    'memory health storage is temporarily unavailable',
                    request.id,
                ),
            )
        }

        return result.value
    })
}
