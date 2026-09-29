import { beforeAll, expect, test, vi } from 'vitest'
import type { UserRepository } from '../repositories/user-repository.js'
import type { SessionRepository } from '../repositories/session-repository.js'
import { hashPassword } from '../security/password.js'
import { hashSessionToken } from '../security/session-token.js'
import { createLoginService } from './login-service.js'

const NOW = new Date('2030-01-01T00:00:00.000Z')
const PASSWORD = 'correct-test-password'
const PROFILE = {
    id: '42',
    name: 'login-test-user',
    phone: '13800000000',
}

let passwordHash: string

beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD)
}, 10_000)

function setup() {
    const findUserByPhone = vi
        .fn<UserRepository['findUserByPhone']>()
        .mockResolvedValue({
            ...PROFILE,
            passwordHash,
        })

    const createSession = vi
        .fn<SessionRepository['createSession']>()
        .mockResolvedValue(undefined)

    const service = createLoginService(
        { findUserByPhone },
        { createSession },
        () => NOW,
    )

    return { service, findUserByPhone, createSession }
}

test('正确密码创建会话，只存令牌哈希并返回公开资料', async () => {
    const { service, findUserByPhone, createSession } = setup()

    const result = await service.login({
        phone: PROFILE.phone,
        password: PASSWORD,
    })

    if (!result.ok) {
        throw new Error('Expected login to succeed')
    }

    expect(findUserByPhone).toHaveBeenCalledExactlyOnceWith(PROFILE.phone)
    expect(result.user).toEqual(PROFILE)
    expect(result.sessionToken.length).toBeGreaterThan(0)
    expect(result.expiresAt).toEqual(new Date('2030-01-08T00:00:00.000Z'))

    expect(createSession).toHaveBeenCalledExactlyOnceWith({
        userId: PROFILE.id,
        tokenHash: hashSessionToken(result.sessionToken),
        expiresAt: result.expiresAt,
    })
}, 10_000)

test('错误密码被拒绝，且不创建会话', async () => {
    const { service, createSession } = setup()

    await expect(
        service.login({
            phone: PROFILE.phone,
            password: 'wrong-password',
        }),
    ).resolves.toEqual({
        ok: false,
        reason: 'invalid_credentials',
    })

    expect(createSession).not.toHaveBeenCalled()
}, 10_000)

test('手机号不存在时返回相同失败结果，且不创建会话', async () => {
    const { service, findUserByPhone, createSession } = setup()
    findUserByPhone.mockResolvedValue(undefined)

    await expect(
        service.login({
            phone: PROFILE.phone,
            password: PASSWORD,
        }),
    ).resolves.toEqual({
        ok: false,
        reason: 'invalid_credentials',
    })

    expect(createSession).not.toHaveBeenCalled()
})

test('保存会话失败时抛出异常，不返回登录成功', async () => {
    const { service, createSession } = setup()
    const error = new Error('session storage unavailable')
    createSession.mockRejectedValue(error)

    await expect(
        service.login({
            phone: PROFILE.phone,
            password: PASSWORD,
        }),
    ).rejects.toBe(error)
}, 10_000)
