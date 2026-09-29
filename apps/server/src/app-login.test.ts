import { expect, test, vi } from 'vitest'
import { buildApp } from './app.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'
import type { SessionRepository } from './repositories/session-repository.js'
import type { UserRepository } from './repositories/user-repository.js'
import { hashPassword } from './security/password.js'
import { hashSessionToken } from './security/session-token.js'

test('buildApp 接通登录路由、密码校验和会话 repository', async () => {
    const profile = {
        id: '42',
        name: '测试用户',
        phone: '13800000000',
    }
    const password = 'test-password'
    const passwordHash = await hashPassword(password)

    const findUserByPhone = vi
        .fn<UserRepository['findUserByPhone']>()
        .mockResolvedValue({
            ...profile,
            passwordHash,
        })

    const createSession = vi
        .fn<SessionRepository['createSession']>()
        .mockResolvedValue(undefined)

    const app = buildApp({
        eventRepository: {
            insertBatch: vi.fn<EventRepository['insertBatch']>(),
            queryPaintMetrics: vi.fn<EventRepository['queryPaintMetrics']>(),
        },
        metricQueryRepository: {
            queryMetric: vi.fn<MetricQueryRepository['queryMetric']>(),
        },
        userRepository: {
            createUser: vi.fn<UserRepository['createUser']>(),
            findUserByPhone,
            findUserById: vi.fn<UserRepository['findUserById']>(),
        },
        sessionRepository: {
            createSession,
            findSessionByTokenHash:
                vi.fn<SessionRepository['findSessionByTokenHash']>(),
            revokeSessionByTokenHash:
                vi.fn<SessionRepository['revokeSessionByTokenHash']>(),
        },
        cookieSecure: false,
        appId: 'test-app',
        now: () => Date.UTC(2030, 0, 1),
    })

    try {
        const response = await app.inject({
            method: 'POST',
            url: '/monitor-api/auth/login',
            payload: {
                phone: ` ${profile.phone} `,
                password,
            },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ user: profile })
        expect(response.headers['cache-control']).toBe('no-store')
        expect(findUserByPhone).toHaveBeenCalledExactlyOnceWith(profile.phone)

        const cookie = response.headers['set-cookie']
        if (typeof cookie !== 'string') {
            throw new Error('Expected a session cookie')
        }

        const tokenMatch = /^pp_session=([^;]+)/.exec(cookie)
        if (tokenMatch === null) {
            throw new Error('Expected pp_session cookie')
        }

        const sessionToken = tokenMatch[1]

        if (sessionToken === undefined) {
            throw new Error('Expected session token in cookie')
        }

        expect(cookie).toContain('HttpOnly')
        expect(cookie).toContain('SameSite=Lax')
        expect(cookie).toContain('Path=/monitor-api')
        expect(cookie).not.toContain('Secure')

        expect(createSession).toHaveBeenCalledExactlyOnceWith({
            userId: profile.id,
            tokenHash: hashSessionToken(sessionToken),
            expiresAt: expect.any(Date),
        })
    } finally {
        await app.close()
    }
}, 10_000)
