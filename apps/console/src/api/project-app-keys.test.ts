import { describe, expect, it, vi } from 'vitest'
import { createProjectAppKeyApi } from './project-app-keys.js'

const PROJECT_ID = 'project-1'
const APP_ID = 'app-1'

describe('createProjectAppKeyApi', () => {
  it('lists, creates, and revokes keys through the scoped monitor API', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ keys: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: {
              id: 'key-1',
              prefix: 'ppk_live_',
              createdAt: '2030-01-01T00:00:00.000Z',
              revokedAt: null,
              plainText: 'ppk_live_secret',
            },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = createProjectAppKeyApi({
      baseUrl: 'https://monitor.example.com',
      fetch: fetcher,
    })

    await expect(api.list(PROJECT_ID, APP_ID)).resolves.toEqual([])
    await expect(api.create(PROJECT_ID, APP_ID)).resolves.toMatchObject({
      plainText: 'ppk_live_secret',
    })
    await expect(api.revoke(PROJECT_ID, APP_ID, 'key-1')).resolves.toBeUndefined()

    expect(fetcher.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/monitor-api/projects/project-1/apps/app-1/keys',
      '/monitor-api/projects/project-1/apps/app-1/keys',
      '/monitor-api/projects/project-1/apps/app-1/keys/key-1',
    ])
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(fetcher.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE', credentials: 'include' })
  })
})
