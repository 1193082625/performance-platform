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
const PROFILE = {
    id: '42',
    name: 'current-user-test',
    phone: '13800000000',
}

test('buildApp 通过会话 Cookie 返回当前用户资料', async () => {
    const findSessionByTokenHash = vi
        .fn<SessionRepository['findSessionByTokenHash']>()
        .mockResolvedValue({
            userId: PROFILE.id,
            expiresAt: new Date(NOW + 60_000),
            revokedAt: null,
        })

    const findUserById = vi
        .fn<UserRepository['findUserById']>()
        .mockResolvedValue(PROFILE)

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
            findUserById,
        },
        sessionRepository: {
            createSession: vi.fn<SessionRepository['createSession']>(),
            findSessionByTokenHash,
            revokeSessionByTokenHash:
                vi.fn<SessionRepository['revokeSessionByTokenHash']>(),
        },
        cookieSecure: false,
        appId: 'test-app',
        now: () => NOW,
    })

    try {
        const response = await app.inject({
            method: 'GET',
            url: '/monitor-api/auth/me',
            headers: {
                cookie: `pp_session=${TOKEN}`,
            },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ user: PROFILE })
        expect(response.headers['cache-control']).toBe('no-store')

        expect(findSessionByTokenHash).toHaveBeenCalledExactlyOnceWith(
            hashSessionToken(TOKEN),
        )
        expect(findUserById).toHaveBeenCalledExactlyOnceWith(PROFILE.id)
    } finally {
        await app.close()
    }
})
