import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { CurrentUserService } from '../services/current-user-service.js'
import { registerCurrentUserRoutes } from './current-user.js'

const TOKEN = 'test-session-token'
const PROFILE = {
    id: '42',
    name: 'current-user-test',
    phone: '13800000000',
}

function setup() {
    const getCurrentUser = vi
        .fn<CurrentUserService['getCurrentUser']>()
        .mockResolvedValue({
            ok: true,
            user: PROFILE,
        })

    const app = Fastify()
    app.register(cookie)
    app.register(registerCurrentUserRoutes, {
        currentUserService: { getCurrentUser },
    })

    return { app, getCurrentUser }
}

let current: ReturnType<typeof setup> | undefined

afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test('有效会话 Cookie 返回当前用户公开资料', async () => {
    current = setup()
    const { app, getCurrentUser } = current

    // 模拟运行时对象意外携带不应输出的字段。
    const userWithUnexpectedField = {
        ...PROFILE,
        passwordHash: 'must-not-leak',
    }

    getCurrentUser.mockResolvedValue({
        ok: true,
        user: userWithUnexpectedField,
    })

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
    expect(getCurrentUser).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(response.headers['set-cookie']).toBeUndefined()
})

test('缺少会话 Cookie 时返回 401', async () => {
    current = setup()
    const { app, getCurrentUser } = current
    getCurrentUser.mockResolvedValue({ ok: false })

    const response = await app.inject({
        method: 'GET',
        url: '/monitor-api/auth/me',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
        error: {
            code: 'UNAUTHENTICATED',
            message: '请先登录',
            requestId: expect.any(String),
        },
    })
    expect(getCurrentUser).toHaveBeenCalledExactlyOnceWith(undefined)
})

test('失效会话返回 401，不清除或重发 Cookie', async () => {
    current = setup()
    const { app, getCurrentUser } = current
    getCurrentUser.mockResolvedValue({ ok: false })

    const response = await app.inject({
        method: 'GET',
        url: '/monitor-api/auth/me',
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(401)
    expect(getCurrentUser).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(response.headers['set-cookie']).toBeUndefined()
})

test('service 异常返回 500，不暴露内部错误', async () => {
    current = setup()
    const { app, getCurrentUser } = current
    getCurrentUser.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'GET',
        url: '/monitor-api/auth/me',
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '获取当前用户失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
})
