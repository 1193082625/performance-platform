import {
    validateMetricBatch,
    type BatchErrorCode,
    type BatchResponse,
} from '@performance-platform/protocol'
import type { EventRepository } from '../repositories/event-repository.js'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'

interface ProjectMetricIngestionServiceOptions {
    repository: EventRepository
    projectAppRepository: Pick<ProjectAppRepository, 'findProjectApp'>
    now: () => number
}

export type ProjectMetricIngestionResult =
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
    | {
          ok: false
          code: 'PROJECT_APP_NOT_REGISTERED'
      }
    | {
          ok: false
          code: 'APP_KEY_MISMATCH'
      }

export interface ProjectMetricEventIngestionService {
    ingest(
        input: unknown,
        projectId: string,
        authorizedAppId?: string,
    ): Promise<ProjectMetricIngestionResult>
}

export function createProjectMetricEventIngestionService(
    options: ProjectMetricIngestionServiceOptions,
): ProjectMetricEventIngestionService {
    return {
        async ingest(input, projectId, authorizedAppId) {
            const validation = validateMetricBatch(input, {
                now: options.now(),
            })

            if (!validation.ok) {
                return validation
            }

            const { acceptedEvents, discarded, reasons } = validation.value

            if (
                authorizedAppId !== undefined &&
                acceptedEvents.some(
                    (event) => event.application.id !== authorizedAppId,
                )
            ) {
                return {
                    ok: false,
                    code: 'APP_KEY_MISMATCH',
                }
            }

            const appIds = [
                ...new Set(acceptedEvents.map((event) => event.application.id)),
            ]

            try {
                const projectApps = await Promise.all(
                    appIds.map((appId) =>
                        options.projectAppRepository.findProjectApp(
                            projectId,
                            appId,
                        ),
                    ),
                )

                if (
                    projectApps.some((projectApp) => projectApp === undefined)
                ) {
                    return {
                        ok: false,
                        code: 'PROJECT_APP_NOT_REGISTERED',
                    }
                }

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
