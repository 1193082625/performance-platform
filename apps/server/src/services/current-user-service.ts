import type {
    UserProfile,
    UserRepository,
} from '../repositories/user-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'

export type CurrentUserResult =
    | {
          ok: true
          user: UserProfile
      }
    | {
          ok: false
      }

export interface CurrentUserService {
    getCurrentUser(sessionToken: string | undefined): Promise<CurrentUserResult>
}

export function createCurrentUserService(
    sessions: SessionAuthenticationService,
    users: Pick<UserRepository, 'findUserById'>,
): CurrentUserService {
    return {
        async getCurrentUser(sessionToken) {
            const authentication = await sessions.authenticate(sessionToken)

            if (!authentication.ok) {
                return { ok: false }
            }

            const user = await users.findUserById(authentication.userId)

            if (user === undefined) {
                return { ok: false }
            }

            return {
                ok: true,
                user,
            }
        },
    }
}
