import { expect, test, vi } from 'vitest'
import type { ProjectAppKeyRepository } from '../repositories/project-app-key-repository.js'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'
import type { ProjectRepository } from '../repositories/project-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'
import { createProjectAppKeyService } from './project-app-key-service.js'

const TOKEN = 'session-token'
const USER_ID = '42'
const PROJECT_ID = '101'
const APP_ID = 'app_test'
const PROJECT_APP_ID = '201'
const NOW = new Date('2030-01-01T00:00:00.000Z')
const KEY = {
    id: '301',
    prefix: 'ppk_example',
    createdAt: NOW,
    revokedAt: null,
}

function setup() {
    const authenticate = vi
        .fn<SessionAuthenticationService['authenticate']>()
        .mockResolvedValue({ ok: true, userId: USER_ID })
    const findProjectOwnedByUser = vi
        .fn<ProjectRepository['findProjectOwnedByUser']>()
        .mockResolvedValue({
            id: PROJECT_ID,
            name: '测试项目',
            description: '',
        })
    const findProjectApp = vi
        .fn<ProjectAppRepository['findProjectApp']>()
        .mockResolvedValue({
            id: PROJECT_APP_ID,
            projectId: PROJECT_ID,
            appId: APP_ID,
            name: '测试应用',
            platform: 'web',
        })
    const createProjectAppKey = vi
        .fn<ProjectAppKeyRepository['createProjectAppKey']>()
        .mockResolvedValue(KEY)
    const listProjectAppKeys = vi
        .fn<ProjectAppKeyRepository['listProjectAppKeys']>()
        .mockResolvedValue([KEY])
    const revokeProjectAppKey = vi
        .fn<ProjectAppKeyRepository['revokeProjectAppKey']>()
        .mockResolvedValue(undefined)
    const generateKey = vi.fn(() => ({
        plainText: 'ppk_plain_text_only_once',
        hash: 'stored-hash',
        prefix: KEY.prefix,
    }))

    const service = createProjectAppKeyService(
        { authenticate },
        { findProjectOwnedByUser },
        { findProjectApp },
        { createProjectAppKey, listProjectAppKeys, revokeProjectAppKey },
        () => NOW,
        generateKey,
    )

    return {
        service,
        authenticate,
        findProjectOwnedByUser,
        findProjectApp,
        createProjectAppKey,
        listProjectAppKeys,
        revokeProjectAppKey,
        generateKey,
    }
}

test('为所属应用创建密钥，只把哈希写入仓储', async () => {
    const { service, createProjectAppKey, generateKey } = setup()

    await expect(
        service.createProjectAppKey(TOKEN, PROJECT_ID, APP_ID),
    ).resolves.toEqual({
        ok: true,
        key: KEY,
        plainTextKey: 'ppk_plain_text_only_once',
    })

    expect(generateKey).toHaveBeenCalledExactlyOnceWith()
    expect(createProjectAppKey).toHaveBeenCalledExactlyOnceWith({
        projectAppId: PROJECT_APP_ID,
        keyHash: 'stored-hash',
        keyPrefix: KEY.prefix,
    })
})

test('无效会话不会查询项目、应用或密钥', async () => {
    const {
        service,
        authenticate,
        findProjectOwnedByUser,
        findProjectApp,
        createProjectAppKey,
    } = setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(
        service.createProjectAppKey(TOKEN, PROJECT_ID, APP_ID),
    ).resolves.toEqual({ ok: false, reason: 'UNAUTHENTICATED' })

    expect(findProjectOwnedByUser).not.toHaveBeenCalled()
    expect(findProjectApp).not.toHaveBeenCalled()
    expect(createProjectAppKey).not.toHaveBeenCalled()
})

test('列出应用密钥时不生成新密钥', async () => {
    const { service, listProjectAppKeys, generateKey } = setup()

    await expect(
        service.listProjectAppKeys(TOKEN, PROJECT_ID, APP_ID),
    ).resolves.toEqual({ ok: true, keys: [KEY] })

    expect(listProjectAppKeys).toHaveBeenCalledExactlyOnceWith(PROJECT_APP_ID)
    expect(generateKey).not.toHaveBeenCalled()
})

test('停用密钥时限定所属应用并写入当前时间', async () => {
    const { service, revokeProjectAppKey } = setup()

    await expect(
        service.revokeProjectAppKey(TOKEN, PROJECT_ID, APP_ID, KEY.id),
    ).resolves.toEqual({ ok: true })

    expect(revokeProjectAppKey).toHaveBeenCalledExactlyOnceWith(
        KEY.id,
        PROJECT_APP_ID,
        NOW,
    )
})
