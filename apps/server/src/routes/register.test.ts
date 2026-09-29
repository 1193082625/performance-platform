import Fastify from 'fastify'
import { afterEach, expect, test, vi } from 'vitest'
import type { RegisterService } from '../services/register-service.js'
import { registerRegistrationRoutes } from './register.js'

const INPUT = {
    name: '测试用户',
    phone: '13800000000',
    password: 'test-password',
}

const PROFILE = {
    id: '42',
    name: INPUT.name,
    phone: INPUT.phone,
}

function setup() {
    const register = vi.fn<RegisterService['register']>().mockResolvedValue({
        ok: true,
        user: PROFILE,
    })

    const app = Fastify()
    app.register(registerRegistrationRoutes, {
        registerService: { register },
    })

    return { app, register }
}

let current: ReturnType<typeof setup> | undefined

afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test('注册成功返回 201，只返回公开资料', async () => {
    current = setup()
    const { app, register } = current

    // 模拟运行时对象意外携带额外字段。
    const user = { ...PROFILE, passwordHash: 'must-not-leak' }
    register.mockResolvedValue({ ok: true, user })

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/register',
        payload: {
            ...INPUT,
            name: ` ${INPUT.name} `,
            phone: ` ${INPUT.phone} `,
            role: 'admin',
        },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ user: PROFILE })
    expect(register).toHaveBeenCalledExactlyOnceWith(INPUT)
    expect(response.headers['set-cookie']).toBeUndefined()
})

test('输入不合法返回 400，不调用注册 service', async () => {
    current = setup()
    const { app, register } = current

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/register',
        payload: { ...INPUT, password: '12345' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
        error: {
            code: 'INVALID_REGISTER_INPUT',
            message: expect.any(String),
            requestId: expect.any(String),
        },
    })
    expect(register).not.toHaveBeenCalled()
})

test('手机号已注册返回 409', async () => {
    current = setup()
    const { app, register } = current
    register.mockResolvedValue({
        ok: false,
        reason: 'phone_taken',
    })

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/register',
        payload: INPUT,
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
        error: {
            code: 'PHONE_TAKEN',
            message: '该手机号已注册',
            requestId: expect.any(String),
        },
    })
})

test('service 异常返回 500，不暴露内部错误', async () => {
    current = setup()
    const { app, register } = current
    register.mockRejectedValue(new Error('private database details'))

    const response = await app.inject({
        method: 'POST',
        url: '/monitor-api/auth/register',
        payload: INPUT,
    })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
        error: {
            code: 'INTERNAL_ERROR',
            message: '注册暂时失败，请稍后重试',
            requestId: expect.any(String),
        },
    })
})
