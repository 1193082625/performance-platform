import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { afterEach, expect, test, vi } from 'vitest'
import type { ProjectAppKeyService } from '../services/project-app-key-service.js'
import { registerProjectAppKeyRoutes } from './project-app-keys.js'

const TOKEN = 'session-token'
const PROJECT_ID = '101'
const APP_ID = 'app_test'
const KEY = {
    id: '301',
    prefix: 'ppk_example',
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    revokedAt: null,
}

function setup() {
    const createProjectAppKey = vi
        .fn<ProjectAppKeyService['createProjectAppKey']>()
        .mockResolvedValue({
            ok: true,
            key: KEY,
            plainTextKey: 'ppk_plain_text_only_once',
        })
    const listProjectAppKeys = vi
        .fn<ProjectAppKeyService['listProjectAppKeys']>()
        .mockResolvedValue({ ok: true, keys: [KEY] })
    const revokeProjectAppKey = vi
        .fn<ProjectAppKeyService['revokeProjectAppKey']>()
        .mockResolvedValue({ ok: true })
    const app = Fastify()
    app.register(cookie)
    app.register(registerProjectAppKeyRoutes, {
        projectAppKeyService: {
            createProjectAppKey,
            listProjectAppKeys,
            revokeProjectAppKey,
        },
    })
    return { app, createProjectAppKey, listProjectAppKeys, revokeProjectAppKey }
}

let current: ReturnType<typeof setup> | undefined
afterEach(async () => {
    await current?.app.close()
    current = undefined
})

test('创建密钥只在本次响应返回明文', async () => {
    current = setup()
    const { app, createProjectAppKey } = current
    const response = await app.inject({
        method: 'POST',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/keys`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({
        key: {
            id: KEY.id,
            prefix: KEY.prefix,
            createdAt: KEY.createdAt.toJSON(),
            revokedAt: null,
            plainText: 'ppk_plain_text_only_once',
        },
    })
    expect(createProjectAppKey).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        PROJECT_ID,
        APP_ID,
    )
})

test('列表响应不包含密钥明文', async () => {
    current = setup()
    const { app } = current
    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/keys`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
        keys: [
            {
                id: KEY.id,
                prefix: KEY.prefix,
                createdAt: KEY.createdAt.toJSON(),
                revokedAt: null,
            },
        ],
    })
})

test('停用密钥返回 204', async () => {
    current = setup()
    const { app, revokeProjectAppKey } = current
    const response = await app.inject({
        method: 'DELETE',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/keys/${KEY.id}`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(204)
    expect(revokeProjectAppKey).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        PROJECT_ID,
        APP_ID,
        KEY.id,
    )
})

test('应用不存在时返回 404', async () => {
    current = setup()
    const { app, listProjectAppKeys } = current
    listProjectAppKeys.mockResolvedValue({
        ok: false,
        reason: 'PROJECT_APP_NOT_FOUND',
    })
    const response = await app.inject({
        method: 'GET',
        url: `/monitor-api/projects/${PROJECT_ID}/apps/${APP_ID}/keys`,
        headers: { cookie: `pp_session=${TOKEN}` },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
        error: {
            code: 'PROJECT_APP_NOT_FOUND',
            message: '应用不存在或不属于当前项目',
        },
    })
})
