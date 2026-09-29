import { expect, test, vi } from 'vitest'
import type { UserRepository } from '../repositories/user-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'
import { createCurrentUserService } from './current-user-service.js'

const TOKEN = 'test-session-token'
const PROFILE = {
    id: '42',
    name: 'current-user-test',
    phone: '13800000000',
}

function setup() {
    const authenticate = vi
        .fn<SessionAuthenticationService['authenticate']>()
        .mockResolvedValue({
            ok: true,
            userId: PROFILE.id,
        })

    const findUserById = vi
        .fn<UserRepository['findUserById']>()
        .mockResolvedValue(PROFILE)

    const service = createCurrentUserService({ authenticate }, { findUserById })

    return { service, authenticate, findUserById }
}

test('有效会话返回当前用户公开资料', async () => {
    const { service, authenticate, findUserById } = setup()

    await expect(service.getCurrentUser(TOKEN)).resolves.toEqual({
        ok: true,
        user: PROFILE,
    })

    expect(authenticate).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(findUserById).toHaveBeenCalledExactlyOnceWith(PROFILE.id)
})

test('无效会话被拒绝，且不查询用户', async () => {
    const { service, authenticate, findUserById } = setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(service.getCurrentUser(TOKEN)).resolves.toEqual({
        ok: false,
    })

    expect(findUserById).not.toHaveBeenCalled()
})

test('会话有效但用户不存在时被拒绝', async () => {
    const { service, findUserById } = setup()
    findUserById.mockResolvedValue(undefined)

    await expect(service.getCurrentUser(TOKEN)).resolves.toEqual({
        ok: false,
    })
})

test('会话认证异常继续向外抛出', async () => {
    const { service, authenticate, findUserById } = setup()
    const error = new Error('session storage unavailable')
    authenticate.mockRejectedValue(error)

    await expect(service.getCurrentUser(TOKEN)).rejects.toBe(error)
    expect(findUserById).not.toHaveBeenCalled()
})

test('用户查询异常继续向外抛出', async () => {
    const { service, findUserById } = setup()
    const error = new Error('user storage unavailable')
    findUserById.mockRejectedValue(error)

    await expect(service.getCurrentUser(TOKEN)).rejects.toBe(error)
})
