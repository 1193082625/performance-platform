import { expect, test, vi } from 'vitest'
import type { SessionRepository } from '../repositories/session-repository.js'
import { hashSessionToken } from '../security/session-token.js'
import { createLogoutService } from './logout-service.js'

const NOW = new Date('2030-01-01T00:00:00.000Z')
const TOKEN = 'test-session-token'

function setup() {
    const revokeSessionByTokenHash = vi
        .fn<SessionRepository['revokeSessionByTokenHash']>()
        .mockResolvedValue(undefined)

    const service = createLogoutService({ revokeSessionByTokenHash }, () => NOW)

    return { service, revokeSessionByTokenHash }
}

test('退出登录按令牌哈希撤销会话，并使用当前时间', async () => {
    const { service, revokeSessionByTokenHash } = setup()

    await expect(service.logout(TOKEN)).resolves.toBeUndefined()

    expect(revokeSessionByTokenHash).toHaveBeenCalledExactlyOnceWith(
        hashSessionToken(TOKEN),
        NOW,
    )
})

test.each([undefined, ''])('缺少或空令牌不查询数据库：%j', async (token) => {
    const { service, revokeSessionByTokenHash } = setup()

    await expect(service.logout(token)).resolves.toBeUndefined()

    expect(revokeSessionByTokenHash).not.toHaveBeenCalled()
})

test('数据库异常继续向外抛出', async () => {
    const { service, revokeSessionByTokenHash } = setup()
    const error = new Error('session storage unavailable')
    revokeSessionByTokenHash.mockRejectedValue(error)

    await expect(service.logout(TOKEN)).rejects.toBe(error)
})
