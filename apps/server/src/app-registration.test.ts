import { expect, test, vi } from 'vitest'
import { buildApp } from './app.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'
import type { UserRepository } from './repositories/user-repository.js'
import { verifyPassword } from './security/password.js'

test('buildApp 接通注册路由、service 和用户 repository', async () => {
    const profile = {
        id: '42',
        name: '测试用户',
        phone: '13800000000',
    }
    const password = 'test-password'

    const createUser = vi.fn<UserRepository['createUser']>().mockResolvedValue({
        ok: true,
        user: profile,
    })

    const app = buildApp({
        eventRepository: {
            insertBatch: vi.fn<EventRepository['insertBatch']>(),
            queryPaintMetrics: vi.fn<EventRepository['queryPaintMetrics']>(),
        },
        metricQueryRepository: {
            queryMetric: vi.fn<MetricQueryRepository['queryMetric']>(),
        },
        userRepository: {
            createUser,
            findUserByPhone: vi.fn<UserRepository['findUserByPhone']>(),
            findUserById: vi.fn<UserRepository['findUserById']>(),
        },
        appId: 'test-app',
        now: () => Date.UTC(2030, 0, 1),
    })

    try {
        const response = await app.inject({
            method: 'POST',
            url: '/monitor-api/auth/register',
            payload: {
                name: ` ${profile.name} `,
                phone: profile.phone,
                password,
            },
        })

        expect(response.statusCode).toBe(201)
        expect(response.json()).toEqual({ user: profile })
        expect(createUser).toHaveBeenCalledTimes(1)

        const call = createUser.mock.calls[0]
        if (call === undefined) {
            throw new Error('Expected createUser to be called')
        }

        const saved = call[0]
        expect(saved).toEqual({
            name: profile.name,
            phone: profile.phone,
            passwordHash: expect.any(String),
        })

        await expect(
            verifyPassword(password, saved.passwordHash),
        ).resolves.toBe(true)
    } finally {
        await app.close()
    }
}, 10_000)
