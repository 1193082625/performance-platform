import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { ProjectAppService } from '../services/project-app-service.js'
import { registerProjectAppRoutes } from './project-apps.js'

const TOKEN = 'test-session-token'
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
const CREATE_INPUT = {
    name: '新的 Web 应用',
    platform: 'web',
}

function setup() {
    const listProjectApps = vi
        .fn<ProjectAppService['listProjectApps']>()
        .mockResolvedValue({
            ok: true,
            apps: APPS,
        })

    const createProjectApp = vi
        .fn<ProjectAppService['createProjectApp']>()
        .mockResolvedValue({
            ok: true,
            app: APPS[0]!,
        })

    const app = Fastify()
    app.register(cookie)
    app.register(registerProjectAppRoutes, {
        projectAppService: {
            listProjectApps,
            createProjectApp,
        },
    })

    return { app, listProjectApps, createProjectApp }
}

let current: ReturnType<typeof setup> | undefined

afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test('有效会话返回项目应用列表', async () => {
    current = setup()
    const { app, listProjectApps } = current

    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
        apps: APPS,
    })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(listProjectApps).toHaveBeenCalledExactlyOnceWith(TOKEN, PROJECT_ID)
})

test('项目不存在或无权访问时返回 404', async () => {
    current = setup()
    const { app, listProjectApps } = current
    listProjectApps.mockResolvedValue({
        ok: false,
        reason: 'PROJECT_NOT_FOUND',
    })

    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
        error: {
            code: 'PROJECT_NOT_FOUND',
            message: '项目不存在或无权访问',
            requestId: expect.any(String),
        },
    })
})

test('应用列表服务异常返回 500，且不暴露内部错误', async () => {
    current = setup()
    const { app, listProjectApps } = current
    listProjectApps.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '获取应用列表失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
})
test('有效会话创建应用并返回系统生成的 App ID', async () => {
    current = setup()
    const { app, createProjectApp } = current

    const response = await app.inject({
        method: 'POST',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
        payload: CREATE_INPUT,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({
        app: APPS[0],
    })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(createProjectApp).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        PROJECT_ID,
        CREATE_INPUT,
    )
})

test('无效应用输入返回 400，且不调用创建服务', async () => {
    current = setup()
    const { app, createProjectApp } = current

    const response = await app.inject({
        method: 'POST',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        payload: {
            name: '新的应用',
            platform: 'desktop',
        },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
        error: {
            code: 'INVALID_PROJECT_APP_INPUT',
            message: '应用平台不受支持',
            requestId: expect.any(String),
        },
    })
    expect(createProjectApp).not.toHaveBeenCalled()
})

test('未登录时不能创建应用', async () => {
    current = setup()
    const { app, createProjectApp } = current
    createProjectApp.mockResolvedValue({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    const response = await app.inject({
        method: 'POST',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        payload: CREATE_INPUT,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
        error: {
            code: 'UNAUTHENTICATED',
            message: '请先登录',
            requestId: expect.any(String),
        },
    })
    expect(createProjectApp).toHaveBeenCalledExactlyOnceWith(
        undefined,
        PROJECT_ID,
        CREATE_INPUT,
    )
})

test('非所属项目不能创建应用', async () => {
    current = setup()
    const { app, createProjectApp } = current
    createProjectApp.mockResolvedValue({
        ok: false,
        reason: 'PROJECT_NOT_FOUND',
    })

    const response = await app.inject({
        method: 'POST',
        url: `/monitor-api/projects/${PROJECT_ID}/apps`,
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
        payload: CREATE_INPUT,
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({
        error: {
            code: 'PROJECT_NOT_FOUND',
            message: '项目不存在或无权访问',
            requestId: expect.any(String),
        },
    })
})
