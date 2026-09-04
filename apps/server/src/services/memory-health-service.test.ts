import { describe, expect, it, vi } from 'vitest'
import { createMemoryHealthService } from './memory-health-service.js'

describe('MemoryHealthService', () => {
    it('evaluates snapshots from the latest view', async () => {
        const queryLatestViewMemorySnapshots = vi.fn()
            .mockResolvedValue([])
        const service = createMemoryHealthService({
            repository: { queryLatestViewMemorySnapshots },
            appId: 'demo-web',
            now: () => Date.UTC(2026, 8, 4, 12),
        })

        const result = await service.query()

        expect(result).toMatchObject({
            ok: true,
            value: {
                status: 'INSUFFICIENT_DATA',
            },
        })
        expect(queryLatestViewMemorySnapshots).toHaveBeenCalledOnce()
    })

    it('reports storage failures', async () => {
        const cause = new Error('database unavailable')
        const service = createMemoryHealthService({
            repository: {
                queryLatestViewMemorySnapshots: vi.fn()
                    .mockRejectedValue(cause),
            },
            appId: 'demo-web',
            now: () => 0,
        })

        await expect(service.query()).resolves.toEqual({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
            cause,
        })
    })
})
