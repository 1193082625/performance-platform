import { expect, test, vi } from 'vitest'
import { createConsoleAccountApi } from './console-account.js'

test('logs in with credentials and includes browser cookies', async () => {
    const fetcher = vi
        .fn()
        .mockResolvedValue({
            ok: true,
            json: async () => ({
                user: { id: '1', name: 'Demo', phone: '13800000000' },
            }),
        })
    const api = createConsoleAccountApi({
        baseUrl: 'http://localhost:5173',
        fetch: fetcher,
    })
    await expect(
        api.login({ phone: '13800000000', password: 'secret12' }),
    ).resolves.toEqual({ id: '1', name: 'Demo', phone: '13800000000' })
    expect(fetcher).toHaveBeenCalledWith(
        'http://localhost:5173/monitor-api/auth/login',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
})
