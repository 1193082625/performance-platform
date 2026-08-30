import type { FastifyInstance } from 'fastify'
import type { BatchErrorCode } from '@performance-platform/protocol'
import type { EventIngestionService } from '../services/event-ingestion-service.js'
import { createApiErrorResponse } from '../http/api-error.js'

interface EventRoutesOptions {
    ingestionService: EventIngestionService
}

function batchErrorMessage(
    code: BatchErrorCode
): string {
    switch (code) {
        case 'INVALID_BATCH':
            return 'events must be a non-empty array'
        case 'BATCH_TOO_LARGE':
            return 'events must contain at most 20 items'
        default:
            throw new Error(`Unsupported batch error code: ${String(code)}`)
    }
}

export async function registerEventRoutes(
    app: FastifyInstance,
    options: EventRoutesOptions,
): Promise<void> {
    app.post(
        '/api/v1/events/batch',
        async (request, reply) => {
            const result = await options.ingestionService.ingest(request.body)

            if(!result.ok) {
                // 'cause' in result 是一个类型守卫
                if ('cause' in result) {
                    request.log.error(
                        {
                            err: result.cause
                        },
                        'event storage unavailable'
                    )
                    return reply.status(503).send(
                        createApiErrorResponse(
                            'STORAGE_UNAVAILABLE',
                            'event storage is temporarily unavailable',
                            request.id,
                        )
                    )
                }
                return reply.status(400).send(
                    createApiErrorResponse(
                        result.code,
                        batchErrorMessage(result.code),
                        request.id,
                    )
                )
            }

            return result.value
        }
    )
}