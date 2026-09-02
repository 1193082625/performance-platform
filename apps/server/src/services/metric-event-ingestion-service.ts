import { validateMetricBatch, type BatchErrorCode, type BatchResponse } from "@performance-platform/protocol"
import type { EventRepository } from "../repositories/event-repository.js"


export type MetricIngestionResult = 
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

interface MetricEventIngestionServiceOptions {
    repository: EventRepository
    appId: string
    now: () => number
}

export interface MetricEventIngestionService {
    ingest(
        input: unknown
    ): Promise<MetricIngestionResult>
}

export function createMetricEventIngestionService(
    options: MetricEventIngestionServiceOptions
): MetricEventIngestionService {
    return {
        async ingest(
            input: unknown
        ): Promise<MetricIngestionResult> {
            const validation = validateMetricBatch(
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
                    acceptedEvents
                )
            } catch (cause) {
                return {
                    ok: false,
                    code: 'STORAGE_UNAVAILABLE',
                    cause
                }
            }

            return {
                ok: true,
                value: {
                    accepted: acceptedEvents.length,
                    discarded,
                    reasons,
                }
            }
        }
    }
}