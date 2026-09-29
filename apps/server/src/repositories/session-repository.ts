export interface StoredSession {
    userId: string
    expiresAt: Date
    revokedAt: Date | null
}

export interface CreateSessionInput {
    userId: string
    tokenHash: string
    expiresAt: Date
}

export interface SessionRepository {
    createSession(input: CreateSessionInput): Promise<void>
    findSessionByTokenHash(
        tokenHash: string,
    ): Promise<StoredSession | undefined>
    revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>
}
