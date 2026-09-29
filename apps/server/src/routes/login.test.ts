import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { LoginService } from '../services/login-service.js'
import { registerLoginRoutes } from './login.js'

const INPUT = {
    phone: '13800000000',
    password: 'test-password',
}
const PROFILE = {
    id: '42',
    name: '测试用户',
    phone: INPUT.phone,
}
const TOKEN = 'test-session-token'
const EXPIRES_AT = new Date('2030-01-08T00:00:00.000Z')

function setup(cookieSecure = false) {
    const user = { ...PROFILE, passwordHash: 'must-not-leak' }
    const login = vi.fn<LoginService['login']>().mockResolvedValue({
        ok: true,
        user,
        sessionToken: TOKEN,
        expiresAt: EXPIRES_AT,
    })

    const app = Fastify()
    app.register(cookie)
    app.register(registerLoginRoutes, {
        loginService: { login },
        cookieSecure,
    })

    return { app, login }
}

let current: ReturnType<typeof setup> | undefined

afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test.each([false, true])(
    '登录成功设置会话 Cookie，Secure=%s',
    async (secure) => {
        current = setup(secure)
        const { app, login } = current

        const response = await app.inject({
            method: 'POST',
            url: '/monitor-api/auth/login',
            payload: { ...INPUT, phone: ` ${INPUT.phone} ` },
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ user: PROFILE })
        expect(response.headers['cache-control']).toBe('no-store')
        expect(login).toHaveBeenCalledExactlyOnceWith(INPUT)

        const header = response.headers['set-cookie']
        if (typeof header !== 'string') {
            throw new Error('Expected one Set-Cookie header')
        }

        const parts = header.split(';').map((part) => part.trim())

        expect(parts[0]).toBe(`pp_session=${TOKEN}`)
        expect(parts).toContain('HttpOnly')
        expect(parts).toContain('SameSite=Lax')
        expect(parts).toContain('Path=/monitor-api')
        expect(parts).toContain(`Expires=${EXPIRES_AT.toUTCString()}`)
        expect(parts.includes('Secure')).toBe(secure)
        expect(parts.some((part) => part.startsWith('Domain='))).toBe(false)
    },
)

test('输入不合法返回 400，不调用 service 或设置 Cookie', async () => {
    current = setup()
    const { app, login } = current

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/login',
        payload: { ...INPUT, password: '' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
        error: {
            code: 'INVALID_LOGIN_INPUT',
            message: expect.any(String),
            requestId: expect.any(String),
        },
    })
    expect(login).not.toHaveBeenCalled()
    expect(response.headers['set-cookie']).toBeUndefined()
})

test('身份校验失败返回 401，不设置 Cookie', async () => {
    current = setup()
    const { app, login } = current
    login.mockResolvedValue({
        ok: false,
        reason: 'invalid_credentials',
    })

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/login',
        payload: INPUT,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
        error: {
            code: 'INVALID_CREDENTIALS',
            message: '手机号或密码错误',
            requestId: expect.any(String),
        },
    })
    expect(response.headers['set-cookie']).toBeUndefined()
})

test('service 异常返回 500，不暴露内部错误或设置 Cookie', async () => {
    current = setup()
    const { app, login } = current
    login.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/login',
        payload: INPUT,
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '登录暂时失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
    expect(response.headers['set-cookie']).toBeUndefined()
})
