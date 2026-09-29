import { expect, test, vi } from 'vitest'
import { buildApp } from './app.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'
import type { ProjectRepository } from './repositories/project-repository.js'
import type { SessionRepository } from './repositories/session-repository.js'
import type { UserRepository } from './repositories/user-repository.js'
import { hashSessionToken } from './security/session-token.js'

const NOW = Date.UTC(2030, 0, 1)
const TOKEN = 'test-session-token'
const USER_ID = '42'
const PROJECTS = [
    {
        id: '101',
        name: '官网性能监控',
        description: '监控用户访问体验',
    },
]

test('buildApp 通过会话 Cookie 返回当前用户的项目', async () => {
    const findSessionByTokenHash = vi
        .fn<SessionRepository['findSessionByTokenHash']>()
        .mockResolvedValue({
            userId: USER_ID,
            expiresAt: new Date(NOW + 60_000),
            revokedAt: null,
        })

    const listProjectsOwnedByUser = vi
        .fn<ProjectRepository['listProjectsOwnedByUser']>()
        .mockResolvedValue(PROJECTS)

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
            findSessionByTokenHash,
            revokeSessionByTokenHash:
                vi.fn<SessionRepository['revokeSessionByTokenHash']>(),
        },
        projectRepository: {
            createProject: vi.fn<ProjectRepository['createProject']>(),
            findProjectOwnedByUser:
                vi.fn<ProjectRepository['findProjectOwnedByUser']>(),
            listProjectsOwnedByUser,
        },
        cookieSecure: false,
        appId: 'test-app',
        now: () => NOW,
    })

    try {
        const response = await app.inject({
            method: 'GET',
            url: '/monitor-api/projects',
            headers: {
                cookie: `pp_session=${TOKEN}`,
            },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({
            projects: PROJECTS,
        })
        expect(listProjectsOwnedByUser).toHaveBeenCalledExactlyOnceWith(USER_ID)
        expect(findSessionByTokenHash).toHaveBeenCalledExactlyOnceWith(
            hashSessionToken(TOKEN),
        )
    } finally {
        await app.close()
    }
})
test('buildApp 通过会话 Cookie 创建当前用户的项目', async () => {
    const createProject = vi
        .fn<ProjectRepository['createProject']>()
        .mockResolvedValue(PROJECTS[0]!)

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
            createProject,
            findProjectOwnedByUser:
                vi.fn<ProjectRepository['findProjectOwnedByUser']>(),
            listProjectsOwnedByUser:
                vi.fn<ProjectRepository['listProjectsOwnedByUser']>(),
        },
        cookieSecure: false,
        appId: 'test-app',
        now: () => NOW,
    })

    try {
        const input = {
            name: '新的 Web 项目',
            description: '用于监控官网性能',
        }

        const response = await app.inject({
            method: 'POST',
            url: '/monitor-api/projects',
            headers: {
                cookie: `pp_session=${TOKEN}`,
            },
            payload: input,
        })

        expect(response.statusCode).toBe(201)
        expect(response.json()).toEqual({
            project: PROJECTS[0],
        })
        expect(createProject).toHaveBeenCalledExactlyOnceWith(USER_ID, input)
    } finally {
        await app.close()
    }
})
