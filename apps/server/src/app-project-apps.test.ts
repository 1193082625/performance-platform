import { expect, test, vi } from 'vitest'
import { buildApp } from './app.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'
import type { ProjectAppRepository } from './repositories/project-app-repository.js'
import type { ProjectRepository } from './repositories/project-repository.js'
import type { SessionRepository } from './repositories/session-repository.js'
import type { UserRepository } from './repositories/user-repository.js'

const NOW = Date.UTC(2030, 0, 1)
const TOKEN = 'test-session-token'
const USER_ID = '42'
const PROJECT_ID = '101'
const APPS = [
    {
        id: '201',
        projectId: PROJECT_ID,
        appId: 'app_123e4567e89b12d3a456426614174000',
        name: '官网 Web 端',
        platform: 'web' as const,
    },
]

test('buildApp 通过会话 Cookie 返回当前用户项目的应用', async () => {
    const findProjectOwnedByUser = vi
        .fn<ProjectRepository['findProjectOwnedByUser']>()
        .mockResolvedValue({
            id: PROJECT_ID,
            name: '官网性能监控',
            description: '',
        })

    const listProjectApps = vi
        .fn<ProjectAppRepository['listProjectApps']>()
        .mockResolvedValue(APPS)

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
            findSessionByTokenHash: vi
                .fn<SessionRepository['findSessionByTokenHash']>()
                .mockResolvedValue({
                    userId: USER_ID,
                    expiresAt: new Date(NOW + 60_000),
                    revokedAt: null,
                }),
            revokeSessionByTokenHash:
                vi.fn<SessionRepository['revokeSessionByTokenHash']>(),
        },
        projectRepository: {
            createProject: vi.fn<ProjectRepository['createProject']>(),
            findProjectOwnedByUser,
            listProjectsOwnedByUser:
                vi.fn<ProjectRepository['listProjectsOwnedByUser']>(),
        },
        projectAppRepository: {
            createProjectApp: vi.fn<ProjectAppRepository['createProjectApp']>(),
            findProjectApp: vi.fn<ProjectAppRepository['findProjectApp']>(),
            listProjectApps,
        },
        cookieSecure: false,
        appId: 'test-app',
        now: () => NOW,
    })

    try {
        const response = await app.inject({
            method: 'GET',
            url: `/monitor-api/projects/${PROJECT_ID}/apps`,
            headers: {
                cookie: `pp_session=${TOKEN}`,
            },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ apps: APPS })
        expect(findProjectOwnedByUser).toHaveBeenCalledExactlyOnceWith(
            PROJECT_ID,
            USER_ID,
        )
        expect(listProjectApps).toHaveBeenCalledExactlyOnceWith(PROJECT_ID)
    } finally {
        await app.close()
    }
})
