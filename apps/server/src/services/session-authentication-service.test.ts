import { expect, test, vi } from 'vitest'
import type {
    SessionRepository,
    StoredSession,
} from '../repositories/session-repository.js'
import { hashSessionToken } from '../security/session-token.js'
import { createSessionAuthenticationService } from './session-authentication-service.js'

const NOW = new Date('2030-01-01T00:00:00.000Z')
const TOKEN = 'test-session-token'

function setup(session: StoredSession | undefined) {
    const findSessionByTokenHash = vi
        .fn<SessionRepository['findSessionByTokenHash']>()
        .mockResolvedValue(session)

    const service = createSessionAuthenticationService(
        { findSessionByTokenHash },
        () => NOW,
    )

    return { service, findSessionByTokenHash }
}

test('有效会话返回用户 ID，并使用令牌哈希查询', async () => {
    const { service, findSessionByTokenHash } = setup({
        userId: '42',
        expiresAt: new Date(NOW.getTime() + 1),
        revokedAt: null,
    })

    await expect(service.authenticate(TOKEN)).resolves.toEqual({
        ok: true,
        userId: '42',
    })

    expect(findSessionByTokenHash).toHaveBeenCalledExactlyOnceWith(
        hashSessionToken(TOKEN),
    )
})

test('缺少或空令牌直接拒绝，不查询数据库', async () => {
    const { service, findSessionByTokenHash } = setup(undefined)

    await expect(service.authenticate(undefined)).resolves.toEqual({
        ok: false,
    })
    await expect(service.authenticate('')).resolves.toEqual({
        ok: false,
    })

    expect(findSessionByTokenHash).not.toHaveBeenCalled()
})

test('未知会话被拒绝', async () => {
    const { service } = setup(undefined)

    await expect(service.authenticate(TOKEN)).resolves.toEqual({
        ok: false,
    })
})

test.each([
    ['刚好到期', 0],
    ['已经过期', -1],
])('%s的会话被拒绝', async (_label, offset) => {
    const { service } = setup({
        userId: '42',
        expiresAt: new Date(NOW.getTime() + offset),
        revokedAt: null,
    })

    await expect(service.authenticate(TOKEN)).resolves.toEqual({
        ok: false,
    })
})

test('尚未过期但已撤销的会话被拒绝', async () => {
    const { service } = setup({
        userId: '42',
        expiresAt: new Date(NOW.getTime() + 60_000),
        revokedAt: new Date(NOW.getTime() - 1),
    })

    await expect(service.authenticate(TOKEN)).resolves.toEqual({
        ok: false,
    })
})

test('数据库异常继续向外抛出', async () => {
    const { service, findSessionByTokenHash } = setup(undefined)
    const error = new Error('database unavailable')
    findSessionByTokenHash.mockRejectedValue(error)

    await expect(service.authenticate(TOKEN)).rejects.toBe(error)
})
