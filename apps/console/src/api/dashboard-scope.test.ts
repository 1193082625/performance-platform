import { expect, test, vi } from 'vitest'
import { createDashboardScopeApi } from './dashboard-scope.js'

test('lists project applications with the session cookie', async () => {
    const fetcher = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ apps: [] }) })
    const api = createDashboardScopeApi({
        baseUrl: 'http://localhost:5173',
        fetch: fetcher,
    })
    await expect(api.listApps('101')).resolves.toEqual([])
    expect(fetcher).toHaveBeenCalledWith(
        'http://localhost:5173/monitor-api/projects/101/apps',
        expect.objectContaining({ credentials: 'include' }),
    )
})
