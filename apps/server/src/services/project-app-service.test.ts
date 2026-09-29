import { expect, test, vi } from 'vitest'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'
import type { ProjectRepository } from '../repositories/project-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'
import { createProjectAppService } from './project-app-service.js'

const TOKEN = 'test-session-token'
const USER_ID = '42'
const PROJECT_ID = '101'
const UUID = '123e4567-e89b-12d3-a456-426614174000'
const INPUT = {
    name: '官网 Web 端',
    platform: 'web' as const,
}
const PROJECT = {
    id: PROJECT_ID,
    name: '官网性能监控',
    description: '',
}
const APP = {
    id: '201',
    projectId: PROJECT_ID,
    appId: 'app_123e4567e89b12d3a456426614174000',
    name: INPUT.name,
    platform: INPUT.platform,
}

function setup() {
    const authenticate = vi
        .fn<SessionAuthenticationService['authenticate']>()
        .mockResolvedValue({
            ok: true,
            userId: USER_ID,
        })

    const findProjectOwnedByUser = vi
        .fn<ProjectRepository['findProjectOwnedByUser']>()
        .mockResolvedValue(PROJECT)

    const createProjectApp = vi
        .fn<ProjectAppRepository['createProjectApp']>()
        .mockResolvedValue(APP)

    const listProjectApps = vi
        .fn<ProjectAppRepository['listProjectApps']>()
        .mockResolvedValue([APP])

    const generateUuid = vi.fn(() => UUID)

    const service = createProjectAppService(
        { authenticate },
        { findProjectOwnedByUser },
        { createProjectApp, listProjectApps },
        generateUuid,
    )

    return {
        service,
        authenticate,
        findProjectOwnedByUser,
        createProjectApp,
        listProjectApps,
        generateUuid,
    }
}

test('为当前用户所属项目创建带系统 App ID 的应用', async () => {
    const { service, findProjectOwnedByUser, createProjectApp, generateUuid } =
        setup()

    await expect(
        service.createProjectApp(TOKEN, PROJECT_ID, INPUT),
    ).resolves.toEqual({
        ok: true,
        app: APP,
    })

    expect(findProjectOwnedByUser).toHaveBeenCalledExactlyOnceWith(
        PROJECT_ID,
        USER_ID,
    )
    expect(generateUuid).toHaveBeenCalledExactlyOnceWith()
    expect(createProjectApp).toHaveBeenCalledExactlyOnceWith({
        projectId: PROJECT_ID,
        appId: APP.appId,
        name: INPUT.name,
        platform: INPUT.platform,
    })
})

test('无效会话不能创建应用，也不查询项目', async () => {
    const { service, authenticate, findProjectOwnedByUser, createProjectApp } =
        setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(
        service.createProjectApp(TOKEN, PROJECT_ID, INPUT),
    ).resolves.toEqual({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    expect(findProjectOwnedByUser).not.toHaveBeenCalled()
    expect(createProjectApp).not.toHaveBeenCalled()
})

test('非所属项目返回未找到，且不创建应用', async () => {
    const { service, findProjectOwnedByUser, createProjectApp } = setup()
    findProjectOwnedByUser.mockResolvedValue(undefined)

    await expect(
        service.createProjectApp(TOKEN, PROJECT_ID, INPUT),
    ).resolves.toEqual({
        ok: false,
        reason: 'PROJECT_NOT_FOUND',
    })

    expect(createProjectApp).not.toHaveBeenCalled()
})

test('仓储异常继续向外抛出', async () => {
    const { service, createProjectApp } = setup()
    const error = new Error('project app storage unavailable')
    createProjectApp.mockRejectedValue(error)

    await expect(
        service.createProjectApp(TOKEN, PROJECT_ID, INPUT),
    ).rejects.toBe(error)
})
test('列出当前用户所属项目的应用', async () => {
    const { service, authenticate, findProjectOwnedByUser, listProjectApps } =
        setup()

    await expect(service.listProjectApps(TOKEN, PROJECT_ID)).resolves.toEqual({
        ok: true,
        apps: [APP],
    })

    expect(authenticate).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(findProjectOwnedByUser).toHaveBeenCalledExactlyOnceWith(
        PROJECT_ID,
        USER_ID,
    )
    expect(listProjectApps).toHaveBeenCalledExactlyOnceWith(PROJECT_ID)
})

test('无效会话不能列出应用，也不查询项目', async () => {
    const { service, authenticate, findProjectOwnedByUser, listProjectApps } =
        setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(service.listProjectApps(TOKEN, PROJECT_ID)).resolves.toEqual({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    expect(findProjectOwnedByUser).not.toHaveBeenCalled()
    expect(listProjectApps).not.toHaveBeenCalled()
})

test('非所属项目不能列出应用', async () => {
    const { service, findProjectOwnedByUser, listProjectApps } = setup()
    findProjectOwnedByUser.mockResolvedValue(undefined)

    await expect(service.listProjectApps(TOKEN, PROJECT_ID)).resolves.toEqual({
        ok: false,
        reason: 'PROJECT_NOT_FOUND',
    })

    expect(listProjectApps).not.toHaveBeenCalled()
})
