import type { FastifyInstance } from 'fastify'
import type { BatchErrorCode } from '@performance-platform/protocol'
import type { EventIngestionService } from '../services/event-ingestion-service.js'
import { createApiErrorResponse } from '../http/api-error.js'
import type {
    MetricEventIngestionService
} from '../services/metric-event-ingestion-service.js'

interface EventRoutesOptions {
    ingestionService: EventIngestionService
    metricIngestionService: MetricEventIngestionService
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

type ParseEventBatchBodyResult =
    | {
        ok: true
        value: unknown
    }
    | {
        ok: false
    }

function parseEventBatchBody(
    input: unknown,
): ParseEventBatchBodyResult {
    if (typeof input !== 'string') {
        return {
            ok: true,
            value: input,
        }
    }

    try {
        return {
            ok: true,
            value: JSON.parse(input)
        }
    } catch {
        return {
            ok: false
        }
    }
}

export async function registerEventRoutes(
    app: FastifyInstance,
    options: EventRoutesOptions,
): Promise<void> {
    const routes = [
        {
            url: '/api/v1/events/batch',
            service: options.ingestionService,
        },
        {
            url: '/api/v2/events/batch',
            service: options.metricIngestionService
        }
    ] as const

    for (const route of routes) {
        app.post(
            route.url,
            async (request, reply) => {
                const parsedBody = parseEventBatchBody(
                    request.body
                )

                if (!parsedBody.ok) {
                    return reply.status(400).send(
                        createApiErrorResponse(
                            'INVALID_JSON',
                            'request body must contain valid JSON',
                            request.id,
                        ),
                    )
                }

                const result =
                    await route.service.ingest(
                        parsedBody.value,
                    )

                if (!result.ok) {
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

}