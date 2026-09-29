import type {
    CreateProjectInput,
    OwnedProject,
    ProjectRepository,
} from '../repositories/project-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'

export type ListProjectsResult =
    | {
          ok: true
          projects: OwnedProject[]
      }
    | {
          ok: false
          reason: 'UNAUTHENTICATED'
      }

export type CreateProjectResult =
    | {
          ok: true
          project: OwnedProject
      }
    | {
          ok: false
          reason: 'UNAUTHENTICATED'
      }

export interface ProjectService {
    listProjects(sessionToken: string | undefined): Promise<ListProjectsResult>
    createProject(
        sessionToken: string | undefined,
        input: CreateProjectInput,
    ): Promise<CreateProjectResult>
}

export function createProjectService(
    sessions: SessionAuthenticationService,
    projects: Pick<
        ProjectRepository,
        'createProject' | 'listProjectsOwnedByUser'
    >,
): ProjectService {
    return {
        async listProjects(sessionToken) {
            const authentication = await sessions.authenticate(sessionToken)
            if (!authentication.ok) {
                return {
                    ok: false,
                    reason: 'UNAUTHENTICATED',
                }
            }

            const ownedProjects = await projects.listProjectsOwnedByUser(
                authentication.userId,
            )

            return {
                ok: true,
                projects: ownedProjects,
            }
        },
        async createProject(sessionToken, input) {
            const authentication = await sessions.authenticate(sessionToken)

            if (!authentication.ok) {
                return {
                    ok: false,
                    reason: 'UNAUTHENTICATED',
                }
            }

            const project = await projects.createProject(
                authentication.userId,
                input,
            )

            return {
                ok: true,
                project,
            }
        },
    }
}
