import { expect, test, vi } from 'vitest'
import type { UserRepository } from '../repositories/user-repository.js'
import { verifyPassword } from '../security/password.js'
import { createRegisterService } from './register-service.js'

const INPUT = {
    name: 'register-test-user',
    phone: '13800000000',
    password: 'test-register-password',
}

const PROFILE = {
    id: '42',
    name: INPUT.name,
    phone: INPUT.phone,
}

function setup() {
    const createUser = vi.fn<UserRepository['createUser']>().mockResolvedValue({
        ok: true,
        user: PROFILE,
    })

    const service = createRegisterService({ createUser })

    return { service, createUser }
}

test('注册时保存密码哈希，并返回用户资料', async () => {
    const { service, createUser } = setup()

    await expect(service.register(INPUT)).resolves.toEqual({
        ok: true,
        user: PROFILE,
    })

    expect(createUser).toHaveBeenCalledTimes(1)

    const call = createUser.mock.calls[0]
    if (call === undefined) {
        throw new Error('Expected createUser to be called')
    }

    const saved = call[0]

    // 检查完整参数，确保没有把明文 password 字段传下去。
    expect(saved).toEqual({
        name: INPUT.name,
        phone: INPUT.phone,
        passwordHash: expect.any(String),
    })
    expect(saved.passwordHash).not.toBe(INPUT.password)

    // 确认保存的哈希确实对应本次输入的密码。
    await expect(
        verifyPassword(INPUT.password, saved.passwordHash),
    ).resolves.toBe(true)
}, 10_000)

test('手机号重复时传递 phone_taken 结果', async () => {
    const { service, createUser } = setup()
    createUser.mockResolvedValue({
        ok: false,
        reason: 'phone_taken',
    })

    await expect(service.register(INPUT)).resolves.toEqual({
        ok: false,
        reason: 'phone_taken',
    })
}, 10_000)

test('数据库异常继续向外抛出', async () => {
    const { service, createUser } = setup()
    const error = new Error('user storage unavailable')
    createUser.mockRejectedValue(error)

    await expect(service.register(INPUT)).rejects.toBe(error)
}, 10_000)
