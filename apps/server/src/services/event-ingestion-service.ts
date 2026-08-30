/**
 * 负责业务：校验、写入、构造 BatchResponse
 */
import { validatePaintBatch, type BatchErrorCode, type BatchResponse } from "@performance-platform/protocol"
import type { EventRepository } from "../repositories/event-repository.js"

// ingestion -- 摄取、接收
export type IngestionResult = 
    | {
        ok: true
        value: BatchResponse
    }
    | {
        ok: false
        code: BatchErrorCode
    }
    | {
        ok: false
        code: 'STORAGE_UNAVAILABLE'
        cause: unknown
    }

interface EventIngestionServiceOptions {
    repository: EventRepository
    appId: string
    now: () => number
}

export interface EventIngestionService {
    ingest(
        input: unknown
    ): Promise<IngestionResult>
}

export function createEventIngestionService(
    options: EventIngestionServiceOptions
): EventIngestionService {
    return {
        async ingest(
            input: unknown
        ): Promise<IngestionResult> {
            const validation = validatePaintBatch(
                input,
                {
                    expectedAppId: options.appId,
                    now: options.now(),
                }
            )

            if (!validation.ok) {
                return validation
            }

            const {
                acceptedEvents,
                discarded,
                reasons,
            } = validation.value

            try {
                await options.repository.insertBatch(
                    acceptedEvents,
                )
            } catch (cause) {
                return {
                    ok: false,
                    code: 'STORAGE_UNAVAILABLE',
                    cause,
                }
            }

            return {
                ok: true,

                value: {
                    accepted:
                        acceptedEvents.length,

                    discarded,
                    reasons,
                },
            }
        }
    }
}
