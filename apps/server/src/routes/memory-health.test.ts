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
        await app.register(registerMemoryHealthRoutes, {
            memoryHealthService: {
                query: vi.fn().mockResolvedValue({ ok: true, value }),
            },
        })

        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/memory-health',
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(value)
        await app.close()
    })
})
