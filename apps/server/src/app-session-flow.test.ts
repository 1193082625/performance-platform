import { expect, test, vi } from 'vitest'
import { buildApp } from './app.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'
import type {
    SessionRepository,
    StoredSession,
} from './repositories/session-repository.js'
import type { UserRepository } from './repositories/user-repository.js'
import { hashPassword } from './security/password.js'

const NOW = Date.UTC(2030, 0, 1)
const PROFILE = {
    id: '42',
    name: 'session-flow-test',
    phone: '13800000000',
}
const PASSWORD = 'test-password'

test('登录后可读取当前用户，退出后旧 Cookie 被拒绝', async () => {
    const passwordHash = await hashPassword(PASSWORD)

    const sessions = new Map<string, StoredSession>()

    const userRepository: UserRepository = {
        async createUser() {
            throw new Error('createUser is not used in this test')
        },

        async findUserByPhone(phone) {
            if (phone !== PROFILE.phone) {
                return undefined
            }

            return {
                ...PROFILE,
                passwordHash,
            }
        },

        async findUserById(id) {
            return id === PROFILE.id ? PROFILE : undefined
        },
    }

    const sessionRepository: SessionRepository = {
        async createSession(input) {
            sessions.set(input.tokenHash, {
                userId: input.userId,
                expiresAt: input.expiresAt,
                revokedAt: null,
            })
        },

        async findSessionByTokenHash(tokenHash) {
            return sessions.get(tokenHash)
        },

        async revokeSessionByTokenHash(tokenHash, revokedAt) {
            const session = sessions.get(tokenHash)

            if (session !== undefined && session.revokedAt === null) {
                sessions.set(tokenHash, {
                    ...session,
                    revokedAt,
                })
            }
        },
    }

    const app = buildApp({
        eventRepository: {
            insertBatch: vi.fn<EventRepository['insertBatch']>(),
            queryPaintMetrics: vi.fn<EventRepository['queryPaintMetrics']>(),
        },
        metricQueryRepository: {
            queryMetric: vi.fn<MetricQueryRepository['queryMetric']>(),
        },
        userRepository,
        sessionRepository,
        cookieSecure: false,
        appId: 'test-app',
        now: () => NOW,
    })

    try {
        const loginResponse = await app.inject({
            method: 'POST',
            url: '/monitor-api/auth/login',
            payload: {
                phone: PROFILE.phone,
                password: PASSWORD,
            },
        })

        expect(loginResponse.statusCode).toBe(200)

        const setCookie = loginResponse.headers['set-cookie']
        if (typeof setCookie !== 'string') {
            throw new Error('Expected a session cookie')
        }

        const tokenMatch = /^pp_session=([^;]+)/.exec(setCookie)
        if (tokenMatch === null) {
            throw new Error('Expected pp_session cookie')
        }

        const sessionToken = tokenMatch[1]
        if (sessionToken === undefined) {
            throw new Error('Expected session token in cookie')
        }

        const cookie = `pp_session=${sessionToken}`

        const meResponse = await app.inject({
            method: 'GET',
            url: '/monitor-api/auth/me',
            headers: { cookie },
        })

        expect(meResponse.statusCode).toBe(200)
        expect(meResponse.json()).toEqual({ user: PROFILE })

        const logoutResponse = await app.inject({
            method: 'POST',
            url: '/monitor-api/auth/logout',
            headers: { cookie },
        })

        expect(logoutResponse.statusCode).toBe(204)

        // 模拟旧 Cookie 被重放，确认服务端撤销已生效。
        const replayedMeResponse = await app.inject({
            method: 'GET',
            url: '/monitor-api/auth/me',
            headers: { cookie },
        })

        expect(replayedMeResponse.statusCode).toBe(401)
        expect(replayedMeResponse.json()).toEqual({
            error: {
                code: 'UNAUTHENTICATED',
                message: '请先登录',
                requestId: expect.any(String),
            },
        })
    } finally {
        await app.close()
    }
}, 10_000)
