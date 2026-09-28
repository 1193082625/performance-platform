import { validateMetricBatch } from '@performance-platform/protocol'
import type { EventRepository } from '../repositories/event-repository.js'
import type { MetricIngestionResult } from './metric-event-ingestion-service.js'

interface ProjectMetricIngestionServiceOptions {
    repository: EventRepository
    now: () => number
}
export interface ProjectMetricEventIngestionService {
    ingest(input: unknown, projectId: string): Promise<MetricIngestionResult>
}

export function createProjectMetricEventIngestionService(
    options: ProjectMetricIngestionServiceOptions,
): ProjectMetricEventIngestionService {
    return {
        async ingest(input, projectId) {
            const validation = validateMetricBatch(input, {
                now: options.now(),
            })

            if (!validation.ok) {
                return validation
            }

            const { acceptedEvents, discarded, reasons } = validation.value
            try {
                await options.repository.insertBatch(acceptedEvents, {
                    projectId,
                })
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
                    accepted: acceptedEvents.length,
                    discarded,
                    reasons,
                },
            }
        },
    }
}
