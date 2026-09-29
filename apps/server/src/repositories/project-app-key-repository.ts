export interface ActiveProjectAppKey {
    projectId: string
    appId: string
}

export interface ProjectAppKey {
    id: string
    prefix: string
    createdAt: Date
    revokedAt: Date | null
}

export interface CreateProjectAppKeyInput {
    projectAppId: string
    keyHash: string
    keyPrefix: string
}

export interface ProjectAppKeyRepository {
    createProjectAppKey(input: CreateProjectAppKeyInput): Promise<ProjectAppKey>
    listProjectAppKeys(projectAppId: string): Promise<ProjectAppKey[]>
    revokeProjectAppKey(
        keyId: string,
        projectAppId: string,
        revokedAt: Date,
    ): Promise<void>
    findActiveProjectAppByKeyHash(
        keyHash: string,
    ): Promise<ActiveProjectAppKey | undefined>
}
