import type { FastifyInstance } from 'fastify'
import { createApiErrorResponse } from '../http/api-error.js'
import type { MemoryHealthService } from '../services/memory-health-service.js'

export async function registerMemoryHealthRoutes(
    app: FastifyInstance,
    options: { memoryHealthService: MemoryHealthService },
): Promise<void> {
    app.get('/api/v2/memory-health', async (request, reply) => {
        const result = await options.memoryHealthService.query()

        if (!result.ok) {
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
