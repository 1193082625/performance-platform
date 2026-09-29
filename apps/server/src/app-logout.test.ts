import { expect, test, vi } from 'vitest'
import { buildApp } from './app.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'
import type { SessionRepository } from './repositories/session-repository.js'
import type { UserRepository } from './repositories/user-repository.js'
import { hashSessionToken } from './security/session-token.js'

const NOW = Date.UTC(2030, 0, 1)
const TOKEN = 'test-session-token'

test('buildApp 撤销会话并清除退出登录 Cookie', async () => {
    const revokeSessionByTokenHash = vi
        .fn<SessionRepository['revokeSessionByTokenHash']>()
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
            findUserByPhone: vi.fn<UserRepository['findUserByPhone']>(),
            findUserById: vi.fn<UserRepository['findUserById']>(),
        },
        sessionRepository: {
            createSession: vi.fn<SessionRepository['createSession']>(),
            findSessionByTokenHash:
                vi.fn<SessionRepository['findSessionByTokenHash']>(),
            revokeSessionByTokenHash,
        },
        cookieSecure: false,
        appId: 'test-app',
        now: () => NOW,
    })

    try {
        const response = await app.inject({
            method: 'POST',
            url: '/monitor-api/auth/logout',
            headers: {
                cookie: `pp_session=${TOKEN}`,
            },
        })

        expect(response.statusCode).toBe(204)
        expect(response.body).toBe('')
        expect(response.headers['cache-control']).toBe('no-store')

        expect(revokeSessionByTokenHash).toHaveBeenCalledExactlyOnceWith(
            hashSessionToken(TOKEN),
            new Date(NOW),
        )

        const cookie = response.headers['set-cookie']
        if (typeof cookie !== 'string') {
            throw new Error('Expected a clearing Set-Cookie header')
        }

        expect(cookie).toContain('pp_session=')
        expect(cookie).toContain('Max-Age=0')
        expect(cookie).toContain('Path=/monitor-api')
        expect(cookie).toContain('HttpOnly')
    } finally {
        await app.close()
    }
})
