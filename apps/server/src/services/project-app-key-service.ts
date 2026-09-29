import type {
    ProjectAppKey,
    ProjectAppKeyRepository,
} from '../repositories/project-app-key-repository.js'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'
import type { ProjectRepository } from '../repositories/project-repository.js'
import {
    generateProjectKey,
    type GeneratedProjectKey,
} from '../security/project-key.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'

type OwnershipFailure =
    'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'PROJECT_APP_NOT_FOUND'

type OwnedApplicationResult =
    { ok: true; projectAppId: string } | { ok: false; reason: OwnershipFailure }

export type CreateProjectAppKeyResult =
    | { ok: true; key: ProjectAppKey; plainTextKey: string }
    | { ok: false; reason: OwnershipFailure }

export type ListProjectAppKeysResult =
    | { ok: true; keys: ProjectAppKey[] }
    | { ok: false; reason: OwnershipFailure }

export type RevokeProjectAppKeyResult =
    { ok: true } | { ok: false; reason: OwnershipFailure }

export interface ProjectAppKeyService {
    createProjectAppKey(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
    ): Promise<CreateProjectAppKeyResult>
    listProjectAppKeys(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
    ): Promise<ListProjectAppKeysResult>
    revokeProjectAppKey(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        keyId: string,
    ): Promise<RevokeProjectAppKeyResult>
}

export function createProjectAppKeyService(
    sessions: SessionAuthenticationService,
    projects: Pick<ProjectRepository, 'findProjectOwnedByUser'>,
    apps: Pick<ProjectAppRepository, 'findProjectApp'>,
    keys: Pick<
        ProjectAppKeyRepository,
        'createProjectAppKey' | 'listProjectAppKeys' | 'revokeProjectAppKey'
    >,
    now: () => Date = () => new Date(),
    generateKey: () => GeneratedProjectKey = generateProjectKey,
): ProjectAppKeyService {
    async function findOwnedApplication(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
    ): Promise<OwnedApplicationResult> {
        const authentication = await sessions.authenticate(sessionToken)
        if (!authentication.ok) {
            return { ok: false, reason: 'UNAUTHENTICATED' }
        }

        const project = await projects.findProjectOwnedByUser(
            projectId,
            authentication.userId,
        )
        if (project === undefined) {
            return { ok: false, reason: 'PROJECT_NOT_FOUND' }
        }

        const app = await apps.findProjectApp(projectId, appId)
        if (app === undefined) {
            return { ok: false, reason: 'PROJECT_APP_NOT_FOUND' }
        }

        return { ok: true, projectAppId: app.id }
    }

    return {
        async createProjectAppKey(sessionToken, projectId, appId) {
            const owned = await findOwnedApplication(
                sessionToken,
                projectId,
                appId,
            )
            if (!owned.ok) {
                return owned
            }

            const generated = generateKey()
            const key = await keys.createProjectAppKey({
                projectAppId: owned.projectAppId,
                keyHash: generated.hash,
                keyPrefix: generated.prefix,
            })

            return { ok: true, key, plainTextKey: generated.plainText }
        },
        async listProjectAppKeys(sessionToken, projectId, appId) {
            const owned = await findOwnedApplication(
                sessionToken,
                projectId,
                appId,
            )
            if (!owned.ok) {
                return owned
            }

            return {
                ok: true,
                keys: await keys.listProjectAppKeys(owned.projectAppId),
            }
        },
        async revokeProjectAppKey(sessionToken, projectId, appId, keyId) {
            const owned = await findOwnedApplication(
                sessionToken,
                projectId,
                appId,
            )
            if (!owned.ok) {
                return owned
            }

            await keys.revokeProjectAppKey(keyId, owned.projectAppId, now())
            return { ok: true }
        },
    }
}
