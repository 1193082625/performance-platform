import type { SessionRepository } from '../repositories/session-repository.js'
import type {
    UserProfile,
    UserRepository,
} from '../repositories/user-repository.js'
import { verifyPassword } from '../security/password.js'
import { generateSessionToken } from '../security/session-token.js'

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export interface LoginInput {
    phone: string
    password: string
}

export type LoginResult =
    | {
          ok: true
          user: UserProfile
          sessionToken: string
          expiresAt: Date
      }
    | {
          ok: false
          reason: 'invalid_credentials'
      }

export interface LoginService {
    login(input: LoginInput): Promise<LoginResult>
}

export function createLoginService(
    users: Pick<UserRepository, 'findUserByPhone'>,
    sessions: Pick<SessionRepository, 'createSession'>,
    now: () => Date = () => new Date(),
): LoginService {
    return {
        async login(input) {
            const user = await users.findUserByPhone(input.phone)
            if (user === undefined) {
                return {
                    ok: false,
                    reason: 'invalid_credentials',
                }
            }

            const passwordMatches = await verifyPassword(
                input.password,
                user.passwordHash,
            )
            if (!passwordMatches) {
                return {
                    ok: false,
                    reason: 'invalid_credentials',
                }
            }

            const token = generateSessionToken()
            const expiresAt = new Date(now().getTime() + SESSION_LIFETIME_MS)

            await sessions.createSession({
                userId: user.id,
                tokenHash: token.hash,
                expiresAt,
            })

            return {
                ok: true,
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                },
                sessionToken: token.plainText,
                expiresAt,
            }
        },
    }
}
