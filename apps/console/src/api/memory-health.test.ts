import { describe, expect, it, vi } from 'vitest'

import { createMemoryHealthApi } from './memory-health.js'

describe('createMemoryHealthApi', () => {
    it('sends the selected time range', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify({
                status: 'INSUFFICIENT_DATA',
                reasons: ['TOO_FEW_SAMPLES'],
                sampleCount: 0,
                window: null,
                latest: null,
                growth: null,
            }), { status: 200 }),
        )
        const api = createMemoryHealthApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        await api.query({
            from: '2026-09-04T11:00:00.000Z',
            to: '2026-09-04T12:00:00.000Z',
        })

        const url = new URL(String(fetcher.mock.calls[0]![0]))
        expect(Object.fromEntries(url.searchParams)).toEqual({
            from: '2026-09-04T11:00:00.000Z',
            to: '2026-09-04T12:00:00.000Z',
        })
    })
})
