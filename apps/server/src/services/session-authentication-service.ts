import type { SessionRepository } from '../repositories/session-repository.js'
import { hashSessionToken } from '../security/session-token.js'

export type SessionAuthenticationResult =
    | {
          ok: true
          userId: string
      }
    | {
          ok: false
      }

export interface SessionAuthenticationService {
    authenticate(
        plainTextToken: string | undefined,
    ): Promise<SessionAuthenticationResult>
}

export function createSessionAuthenticationService(
    repository: Pick<SessionRepository, 'findSessionByTokenHash'>,
    now: () => Date = () => new Date(),
): SessionAuthenticationService {
    return {
        async authenticate(plainTextToken) {
            if (plainTextToken === undefined || plainTextToken.length === 0) {
                return { ok: false }
            }

            const session = await repository.findSessionByTokenHash(
                hashSessionToken(plainTextToken),
            )

            if (
                session === undefined ||
                session.revokedAt !== null ||
                session.expiresAt.getTime() <= now().getTime()
            ) {
                return { ok: false }
            }

            return {
                ok: true,
                userId: session.userId,
            }
        },
    }
}
