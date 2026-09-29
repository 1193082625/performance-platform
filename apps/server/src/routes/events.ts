import type { FastifyInstance } from 'fastify'
import type { BatchErrorCode } from '@performance-platform/protocol'
import { createApiErrorResponse } from '../http/api-error.js'
import type { ProjectMetricEventIngestionService } from '../services/project-metric-event-ingestion-service.js'
import type { ProjectAppKeyAuthenticationService } from '../services/project-app-key-authentication-service.js'

interface EventRoutesOptions {
    projectMetricIngestionService?: ProjectMetricEventIngestionService
    projectAppKeyAuthenticationService?: ProjectAppKeyAuthenticationService
}

function batchErrorMessage(code: BatchErrorCode): string {
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

function parseEventBatchBody(input: unknown): ParseEventBatchBodyResult {
    if (typeof input !== 'string') {
        return {
            ok: true,
            value: input,
        }
    }

    try {
        return {
            ok: true,
            value: JSON.parse(input),
        }
    } catch {
        return {
            ok: false,
        }
    }
}

function readAppKey(input: unknown): string | undefined {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return undefined
    }

    const appKey = (input as Record<string, unknown>).appKey

    return typeof appKey === 'string' ? appKey : undefined
}

export async function registerEventRoutes(
    app: FastifyInstance,
    options: EventRoutesOptions,
): Promise<void> {
    const projectAppKeyAuthenticationService =
        options.projectAppKeyAuthenticationService

    const projectMetricIngestionService = options.projectMetricIngestionService
    if (
        projectAppKeyAuthenticationService !== undefined &&
        projectMetricIngestionService !== undefined
    ) {
        app.post('/ingest/v2/events/batch', async (request, reply) => {
            const parsedBody = parseEventBatchBody(request.body)
            if (!parsedBody.ok) {
                return reply
                    .status(400)
                    .send(
                        createApiErrorResponse(
                            'INVALID_JSON',
                            'request body must contain valid JSON',
                            request.id,
                        ),
                    )
            }

            const authentication =
                await projectAppKeyAuthenticationService.authenticate(
                    readAppKey(parsedBody.value),
                )

            if (!authentication?.ok) {
                return reply
                    .status(401)
                    .send(
                        createApiErrorResponse(
                            'INVALID_APP_KEY',
                            'app key is invalid',
                            request.id,
                        ),
                    )
            }

            const result = await projectMetricIngestionService.ingest(
                parsedBody.value,
                authentication.projectId,
                authentication.appId,
            )

            if (!result.ok) {
                if ('cause' in result) {
                    request.log.error(
                        { err: result.cause },
                        'event storage unavailable',
                    )
                    return reply
                        .status(503)
                        .send(
                            createApiErrorResponse(
                                'STORAGE_UNAVAILABLE',
                                'event storage is temporarily unavailable',
                                request.id,
                            ),
                        )
                }

                if (result.code === 'PROJECT_APP_NOT_REGISTERED') {
                    return reply
                        .status(403)
                        .send(
                            createApiErrorResponse(
                                'PROJECT_APP_NOT_REGISTERED',
                                'application is not registered for this project',
                                request.id,
                            ),
                        )
                }

                if (result.code === 'APP_KEY_MISMATCH') {
                    return reply
                        .status(403)
                        .send(
                            createApiErrorResponse(
                                'APP_KEY_MISMATCH',
                                'app key does not permit events for this application',
                                request.id,
                            ),
                        )
                }

                return reply
                    .status(400)
                    .send(
                        createApiErrorResponse(
                            result?.code,
                            batchErrorMessage(result?.code),
                            request.id,
                        ),
                    )
            }

            return result.value
        })
    }
}
