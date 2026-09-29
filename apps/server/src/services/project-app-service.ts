import { randomUUID } from 'node:crypto'
import type {
    ProjectApp,
    ProjectAppPlatform,
    ProjectAppRepository,
} from '../repositories/project-app-repository.js'
import type { ProjectRepository } from '../repositories/project-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'

export interface CreateAppInput {
    name: string
    platform: ProjectAppPlatform
}

export type CreateProjectAppResult =
    | {
          ok: true
          app: ProjectApp
      }
    | {
          ok: false
          reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND'
      }

export type ListProjectAppsResult =
    | {
          ok: true
          apps: ProjectApp[]
      }
    | {
          ok: false
          reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND'
      }

export interface ProjectAppService {
    listProjectApps(
        sessionToken: string | undefined,
        projectId: string,
    ): Promise<ListProjectAppsResult>
    createProjectApp(
        sessionToken: string | undefined,
        projectId: string,
        input: CreateAppInput,
    ): Promise<CreateProjectAppResult>
}

export function createProjectAppService(
    sessions: SessionAuthenticationService,
    projects: Pick<ProjectRepository, 'findProjectOwnedByUser'>,
    apps: Pick<ProjectAppRepository, 'createProjectApp' | 'listProjectApps'>,
    generateUuid: () => string = randomUUID,
): ProjectAppService {
    return {
        async listProjectApps(sessionToken, projectId) {
            const authentication = await sessions.authenticate(sessionToken)

            if (!authentication.ok) {
                return {
                    ok: false,
                    reason: 'UNAUTHENTICATED',
                }
            }

            const project = await projects.findProjectOwnedByUser(
                projectId,
                authentication.userId,
            )

            if (project === undefined) {
                return {
                    ok: false,
                    reason: 'PROJECT_NOT_FOUND',
                }
            }

            const projectApps = await apps.listProjectApps(projectId)

            return {
                ok: true,
                apps: projectApps,
            }
        },
        async createProjectApp(sessionToken, projectId, input) {
            const authentication = await sessions.authenticate(sessionToken)

            if (!authentication.ok) {
                return {
                    ok: false,
                    reason: 'UNAUTHENTICATED',
                }
            }

            const project = await projects.findProjectOwnedByUser(
                projectId,
                authentication.userId,
            )

            if (project === undefined) {
                return {
                    ok: false,
                    reason: 'PROJECT_NOT_FOUND',
                }
            }

            const app = await apps.createProjectApp({
                projectId,
                appId: `app_${generateUuid().replaceAll('-', '')}`,
                name: input.name,
                platform: input.platform,
            })

            return {
                ok: true,
                app,
            }
        },
    }
}
