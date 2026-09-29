import type { ProjectAppKeyRepository } from '../repositories/project-app-key-repository.js'
import { hashProjectKey } from '../security/project-key.js'

export type ProjectAppKeyAuthenticationResult =
    | {
          ok: true
          projectId: string
          appId: string
      }
    | {
          ok: false
      }

export interface ProjectAppKeyAuthenticationService {
    authenticate(
        plainTextKey: string | undefined,
    ): Promise<ProjectAppKeyAuthenticationResult>
}

export function createProjectAppKeyAuthenticationService(
    repository: Pick<ProjectAppKeyRepository, 'findActiveProjectAppByKeyHash'>,
): ProjectAppKeyAuthenticationService {
    return {
        async authenticate(plainTextKey) {
            if (plainTextKey === undefined || plainTextKey.length == 0) {
                return { ok: false }
            }

            const activeKey = await repository.findActiveProjectAppByKeyHash(
                hashProjectKey(plainTextKey),
            )

            if (activeKey === undefined) {
                return { ok: false }
            }

            return {
                ok: true,
                projectId: activeKey.projectId,
                appId: activeKey.appId,
            }
        },
    }
}
