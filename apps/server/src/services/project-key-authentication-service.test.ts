import { expect, test, vi } from 'vitest'
import type { ProjectKeyRepository } from '../repositories/event-repository.js'
import { createProjectKeyAuthenticationService } from './project-key-authentication-service.js'
import { createHash } from 'crypto'

test('有效项目 Key 返回所属项目 ID', async () => {
    const findActiveProjectByKeyHash = vi
        .fn()
        .mockResolvedValue({ projectId: '42' })
    const repository: ProjectKeyRepository = {
        findActiveProjectByKeyHash,
    }
    const service = createProjectKeyAuthenticationService(repository)
    const result = await service.authenticate('ppk_test_key')
    expect(result).toEqual({
        ok: true,
        projectId: '42',
    })

    expect(findActiveProjectByKeyHash).toHaveBeenCalledWith(
        createHash('sha256').update('ppk_test_key').digest('hex'),
    )
})

test('缺少、未知或已停用 Key 都被拒绝', async () => {
    const findActiveProjectByKeyHash = vi.fn().mockResolvedValue(undefined)
    const repository: ProjectKeyRepository = {
        findActiveProjectByKeyHash,
    }
    const service = createProjectKeyAuthenticationService(repository)
    await expect(service.authenticate(undefined)).resolves.toEqual({
        ok: false,
    })
    await expect(service.authenticate('ppk_unknown')).resolves.toEqual({
        ok: false,
    })
})
