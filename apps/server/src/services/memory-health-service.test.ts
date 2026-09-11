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
        expect(queryLatestViewMemorySnapshots).toHaveBeenCalledWith({
            appId: 'demo-web',
            from: new Date(Date.UTC(2026, 8, 3, 12)),
            to: new Date(Date.UTC(2026, 8, 4, 12)),
        })
    })

    it('uses the requested time range', async () => {
        const queryLatestViewMemorySnapshots = vi.fn().mockResolvedValue([])
        const service = createMemoryHealthService({
            repository: { queryLatestViewMemorySnapshots },
            appId: 'demo-web',
            now: () => Date.UTC(2026, 8, 4, 12),
        })

        await service.query({
            from: '2026-09-04T11:00:00.000Z',
            to: '2026-09-04T12:00:00.000Z',
        })

        expect(queryLatestViewMemorySnapshots).toHaveBeenCalledWith({
            appId: 'demo-web',
            from: new Date('2026-09-04T11:00:00.000Z'),
            to: new Date('2026-09-04T12:00:00.000Z'),
        })
    })

    it('rejects an invalid time range', async () => {
        const service = createMemoryHealthService({
            repository: { queryLatestViewMemorySnapshots: vi.fn() },
            appId: 'demo-web',
            now: () => 0,
        })

        await expect(service.query({
            from: '2026-09-04T12:00:00.000Z',
            to: '2026-09-04T11:00:00.000Z',
        })).resolves.toEqual({ ok: false, code: 'INVALID_TIME_RANGE' })
    })

    it.each([
        ['from', { from: 'not-a-date' }],
        ['to', { to: 'not-a-date' }],
    ] as const)('rejects an invalid %s date', async (field, input) => {
        const queryLatestViewMemorySnapshots = vi.fn()
        const service = createMemoryHealthService({
            repository: { queryLatestViewMemorySnapshots },
            appId: 'demo-web',
            now: () => Date.UTC(2026, 8, 4, 12),
        })

        await expect(service.query(input)).resolves.toEqual({
            ok: false,
            code: 'INVALID_DATE',
            field,
        })
        expect(queryLatestViewMemorySnapshots).not.toHaveBeenCalled()
    })

    it('rejects a time range longer than 30 days', async () => {
        const queryLatestViewMemorySnapshots = vi.fn()
        const service = createMemoryHealthService({
            repository: { queryLatestViewMemorySnapshots },
            appId: 'demo-web',
            now: () => 0,
        })

        await expect(service.query({
            from: '2026-08-01T00:00:00.000Z',
            to: '2026-09-01T00:00:00.001Z',
        })).resolves.toEqual({ ok: false, code: 'TIME_RANGE_TOO_LARGE' })
        expect(queryLatestViewMemorySnapshots).not.toHaveBeenCalled()
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
