import type { AlertEvaluationResponse } from '@performance-platform/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createAlertEvaluationApi } from './alert-evaluation.js'

const RESPONSE: AlertEvaluationResponse = {
    range: { from: '2026-09-10T00:00:00.000Z', to: '2026-09-11T00:00:00.000Z' },
    evaluatedAt: '2026-09-11T00:00:00.000Z',
    events: [],
}

describe('createAlertEvaluationApi', () => {
    it('queries alert events for the selected range', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify(RESPONSE), { status: 200 }),
        )
        const api = createAlertEvaluationApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
        await expect(api.query(RESPONSE.range)).resolves.toEqual(RESPONSE)
        const url = new URL(String(fetcher.mock.calls[0]?.[0]))
        expect(url.pathname).toBe('/api/v2/alerts/evaluate')
        expect(Object.fromEntries(url.searchParams)).toEqual(RESPONSE.range)
    })

    it('rejects a failed evaluation', async () => {
        const api = createAlertEvaluationApi({
            baseUrl: 'http://localhost:5001',
            fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
        })
        await expect(api.query()).rejects.toThrow('Alert evaluation failed with status 503')
    })
})
