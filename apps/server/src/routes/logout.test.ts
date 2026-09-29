import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { LogoutService } from '../services/logout-service.js'
import { registerLogoutRoutes } from './logout.js'

const TOKEN = 'test-session-token'

function setup(cookieSecure = false) {
    const logout = vi.fn<LogoutService['logout']>().mockResolvedValue(undefined)

    const app = Fastify()
    app.register(cookie)
    app.register(registerLogoutRoutes, {
        logoutService: { logout },
        cookieSecure,
    })

    return { app, logout }
}

let current: ReturnType<typeof setup> | undefined

afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test.each([false, true])('撤销会话后清除 Cookie，Secure=%s', async (secure) => {
    current = setup(secure)
    const { app, logout } = current

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
    expect(logout).toHaveBeenCalledExactlyOnceWith(TOKEN)

    const header = response.headers['set-cookie']
    if (typeof header !== 'string') {
        throw new Error('Expected a clearing Set-Cookie header')
    }

    const parts = header.split(';').map((part) => part.trim())

    expect(parts[0]).toBe('pp_session=')
    expect(parts).toContain('HttpOnly')
    expect(parts).toContain('SameSite=Lax')
    expect(parts).toContain('Path=/monitor-api')
    expect(parts).toContain('Max-Age=0')
    expect(parts).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    expect(parts.includes('Secure')).toBe(secure)
})

test('缺少 Cookie 时仍成功并发送清除 Cookie 的响应', async () => {
    current = setup()
    const { app, logout } = current

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/logout',
    })

    expect(response.statusCode).toBe(204)
    expect(logout).toHaveBeenCalledExactlyOnceWith(undefined)
    expect(response.headers['set-cookie']).toContain('pp_session=')
})

test('撤销会话失败时返回 500，且不清除 Cookie', async () => {
    current = setup()
    const { app, logout } = current
    logout.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/logout',
        headers: {
            cookie: `pp_session=${TOKEN}`,
        },
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '退出登录失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
    expect(response.headers['set-cookie']).toBeUndefined()
})
