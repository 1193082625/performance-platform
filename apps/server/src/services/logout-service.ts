import type { SessionRepository } from '../repositories/session-repository.js'
import { hashSessionToken } from '../security/session-token.js'

export interface LogoutService {
    logout(sessionToken: string | undefined): Promise<void>
}

export function createLogoutService(
    sessions: Pick<SessionRepository, 'revokeSessionByTokenHash'>,
    now: () => Date = () => new Date(),
): LogoutService {
    return {
        async logout(sessionToken) {
            if (sessionToken === undefined || sessionToken.length === 0) {
                return
            }

            await sessions.revokeSessionByTokenHash(
                hashSessionToken(sessionToken),
                now(),
            )
        },
    }
}
