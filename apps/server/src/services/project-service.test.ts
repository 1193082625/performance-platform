import { expect, test, vi } from 'vitest'
import type { ProjectRepository } from '../repositories/project-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'
import { createProjectService } from './project-service.js'

const TOKEN = 'test-session-token'
const USER_ID = '42'
const PROJECTS = [
    {
        id: '101',
        name: '穿搭业务',
        description: '多端性能监控项目',
    },
]
const CREATE_INPUT = {
    name: '新的 Web 项目',
    description: '用于监控官网性能',
}

function setup() {
    const authenticate = vi
        .fn<SessionAuthenticationService['authenticate']>()
        .mockResolvedValue({
            ok: true,
            userId: USER_ID,
        })

    const listProjectsOwnedByUser = vi
        .fn<ProjectRepository['listProjectsOwnedByUser']>()
        .mockResolvedValue(PROJECTS)

    const createProject = vi
        .fn<ProjectRepository['createProject']>()
        .mockResolvedValue(PROJECTS[0]!)

    const service = createProjectService(
        { authenticate },
        {
            createProject,
            listProjectsOwnedByUser,
        },
    )

    return { service, authenticate, createProject, listProjectsOwnedByUser }
}

test('使用会话认证得到的用户 ID 查询项目', async () => {
    const { service, authenticate, listProjectsOwnedByUser } = setup()

    await expect(service.listProjects(TOKEN)).resolves.toEqual({
        ok: true,
        projects: PROJECTS,
    })

    expect(authenticate).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(listProjectsOwnedByUser).toHaveBeenCalledExactlyOnceWith(USER_ID)
})

test('无效会话被拒绝，且不查询项目', async () => {
    const { service, authenticate, listProjectsOwnedByUser } = setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(service.listProjects(TOKEN)).resolves.toEqual({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    expect(listProjectsOwnedByUser).not.toHaveBeenCalled()
})

test('用户没有项目时正常返回空列表', async () => {
    const { service, listProjectsOwnedByUser } = setup()
    listProjectsOwnedByUser.mockResolvedValue([])

    await expect(service.listProjects(TOKEN)).resolves.toEqual({
        ok: true,
        projects: [],
    })
})
test('使用会话认证得到的用户 ID 创建项目', async () => {
    const { service, authenticate, createProject } = setup()

    await expect(service.createProject(TOKEN, CREATE_INPUT)).resolves.toEqual({
        ok: true,
        project: PROJECTS[0],
    })

    expect(authenticate).toHaveBeenCalledExactlyOnceWith(TOKEN)
    expect(createProject).toHaveBeenCalledExactlyOnceWith(USER_ID, CREATE_INPUT)
})

test('无效会话不能创建项目，且不调用仓储', async () => {
    const { service, authenticate, createProject } = setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(service.createProject(TOKEN, CREATE_INPUT)).resolves.toEqual({
        ok: false,
        reason: 'UNAUTHENTICATED',
    })

    expect(createProject).not.toHaveBeenCalled()
})

test('创建项目的仓储异常继续向外抛出', async () => {
    const { service, createProject } = setup()
    const error = new Error('project storage unavailable')
    createProject.mockRejectedValue(error)

    await expect(service.createProject(TOKEN, CREATE_INPUT)).rejects.toBe(error)
})
