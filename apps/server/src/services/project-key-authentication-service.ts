import type { ProjectKeyRepository } from '../repositories/event-repository.js'
import { hashProjectKey } from '../security/project-key.js'

export type ProjectKeyAuthenticationResult =
    | {
          ok: true
          projectId: string
      }
    | {
          ok: false
      }

export interface ProjectKeyAuthenticationService {
    authenticate(
        plainTextKey: string | undefined,
    ): Promise<ProjectKeyAuthenticationResult>
}

export function createProjectKeyAuthenticationService(
    repository: ProjectKeyRepository,
): ProjectKeyAuthenticationService {
    return {
        async authenticate(plainTextKey) {
            if (plainTextKey === undefined || plainTextKey.length === 0) {
                return { ok: false }
            }
            const activeKey = await repository.findActiveProjectByKeyHash(
                hashProjectKey(plainTextKey),
            )
            if (activeKey === undefined) {
                return { ok: false }
            }
            return {
                ok: true,
                projectId: activeKey.projectId,
            }
        },
    }
}
