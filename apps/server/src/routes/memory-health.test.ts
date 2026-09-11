import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { registerMemoryHealthRoutes } from './memory-health.js'

describe('GET /api/v2/memory-health', () => {
    it('returns the memory health assessment', async () => {
        const app = Fastify()
        const value = {
            status: 'NORMAL' as const,
            reasons: [],
            sampleCount: 6,
            window: { from: 1, to: 2 },
            latest: {
                usedHeap: 100,
                heapLimit: 1000,
                utilization: 0.1,
            },
            growth: {
                absolute: 0,
                ratio: 0,
                increasingTransitionRatio: 0,
            },
        }
        const query = vi.fn().mockResolvedValue({ ok: true, value })
        await app.register(registerMemoryHealthRoutes, {
            memoryHealthService: { query },
        })

        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/memory-health?from=2026-09-04T11%3A00%3A00.000Z&to=2026-09-04T12%3A00%3A00.000Z',
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(value)
        expect(query).toHaveBeenCalledWith({
            from: '2026-09-04T11:00:00.000Z',
            to: '2026-09-04T12:00:00.000Z',
        })
        await app.close()
    })

    it.each([
        ['INVALID_DATE', { code: 'INVALID_DATE', field: 'from' }, 'from must be a valid ISO 8601 date'],
        ['INVALID_TIME_RANGE', { code: 'INVALID_TIME_RANGE' }, 'from must be earlier than to'],
        ['TIME_RANGE_TOO_LARGE', { code: 'TIME_RANGE_TOO_LARGE' }, 'time range must not exceed 30 days'],
    ] as const)('maps %s to a 400 response', async (_code, result, message) => {
        const app = Fastify()
        await app.register(registerMemoryHealthRoutes, {
            memoryHealthService: {
                query: vi.fn().mockResolvedValue({ ok: false, ...result }),
            },
        })

        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/memory-health',
        })

        expect(response.statusCode).toBe(400)
        expect(response.json()).toMatchObject({
            error: { code: result.code, message },
        })
        await app.close()
    })
})
