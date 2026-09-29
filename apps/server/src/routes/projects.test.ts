import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { ProjectService } from '../services/project-service.js'
import { registerProjectRoutes } from './projects.js'

const TOKEN = 'test-session-token'
const PROJECTS = [
    {
        id: '101',
        name: '穿搭业务',
        description: '多端性能监控项目',
    },
]
const CREATE_INPUT = {
    name: '官网性能监控',
    description: '监控用户访问体验',
}

function setup() {
    const listProjects = vi
        .fn<ProjectService['listProjects']>()
        .mockResolvedValue({
            ok: true,
            projects: PROJECTS,
        })

    const createProject = vi
        .fn<ProjectService['createProject']>()
        .mockResolvedValue({
            ok: true,
            project: PROJECTS[0]!,
        })

    const app = Fastify()
    app.register(cookie)
    app.register(registerProjectRoutes, {
        projectService: {
            createProject,
            listProjects,
        },
    })

    return { app, createProject, listProjects }
}

let current: ReturnType<typeof setup> | undefined

afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test('有效会话 Cookie 返回项目列表', async () => {
    current = setup()
    const { app, listProjects } = current

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
    expect(response.headers['cache-control']).toBe('no-store')
    expect(listProjects).toHaveBeenCalledExactlyOnceWith(TOKEN)
})

test('缺少会话 Cookie 时返回 401', async () => {
    current = setup()
    const { app, listProjects } = current
    listProjects.mockResolvedValue({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    const response = await app.inject({
        method: 'GET',
        url: '/monitor-api/projects',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
        error: {
            code: 'UNAUTHENTICATED',
            message: '请先登录',
            requestId: expect.any(String),
        },
    })
    expect(listProjects).toHaveBeenCalledExactlyOnceWith(undefined)
})

test('服务异常返回 500，且不暴露内部错误', async () => {
    current = setup()
    const { app, listProjects } = current
    listProjects.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'GET',
        url: '/monitor-api/projects',
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '获取项目列表失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
})
test('有效会话创建项目并返回 201', async () => {
    current = setup()
    const { app, createProject } = current

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/projects',
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
        payload: CREATE_INPUT,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({
        project: PROJECTS[0],
    })
    expect(response.headers['cache-control']).toBe('no-store')
    expect(createProject).toHaveBeenCalledExactlyOnceWith(TOKEN, CREATE_INPUT)
})

test('无效输入返回 400，且不调用创建服务', async () => {
    current = setup()
    const { app, createProject } = current

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/projects',
        payload: {
            name: '   ',
            description: '',
        },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
        error: {
            code: 'INVALID_PROJECT_INPUT',
            message: '项目名称不能为空',
            requestId: expect.any(String),
        },
    })
    expect(createProject).not.toHaveBeenCalled()
})

test('未登录时不能创建项目', async () => {
    current = setup()
    const { app, createProject } = current
    createProject.mockResolvedValue({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/projects',
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
    expect(createProject).toHaveBeenCalledExactlyOnceWith(
        undefined,
        CREATE_INPUT,
    )
})

test('创建服务异常返回 500，且不暴露内部错误', async () => {
    current = setup()
    const { app, createProject } = current
    createProject.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/projects',
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
        payload: CREATE_INPUT,
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '创建项目失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
})
