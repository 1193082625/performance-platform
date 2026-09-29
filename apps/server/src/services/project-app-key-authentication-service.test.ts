import { expect, test, vi } from 'vitest'
import { createHash } from 'node:crypto'
import type { ProjectAppKeyRepository } from '../repositories/project-app-key-repository.js'
import { createProjectAppKeyAuthenticationService } from './project-app-key-authentication-service.js'

test('有效应用密钥返回所属项目和应用 ID', async () => {
    const findActiveProjectAppByKeyHash = vi.fn().mockResolvedValue({
        projectId: '42',
        appId: 'outfit-web',
    })
    const repository: Pick<
        ProjectAppKeyRepository,
        'findActiveProjectAppByKeyHash'
    > = {
        findActiveProjectAppByKeyHash,
    }
    const service = createProjectAppKeyAuthenticationService(repository)
    const result = await service.authenticate('ppk_test_key')
    expect(result).toEqual({
        ok: true,
        projectId: '42',
        appId: 'outfit-web',
    })

    expect(findActiveProjectAppByKeyHash).toHaveBeenCalledWith(
        createHash('sha256').update('ppk_test_key').digest('hex'),
    )
})

test('缺少、未知或已停用 Key 都被拒绝', async () => {
    const findActiveProjectAppByKeyHash = vi.fn().mockResolvedValue(undefined)
    const repository: Pick<
        ProjectAppKeyRepository,
        'findActiveProjectAppByKeyHash'
    > = {
        findActiveProjectAppByKeyHash,
    }
    const service = createProjectAppKeyAuthenticationService(repository)
    await expect(service.authenticate(undefined)).resolves.toEqual({
        ok: false,
    })
    await expect(service.authenticate('ppk_unknown')).resolves.toEqual({
        ok: false,
    })
})
