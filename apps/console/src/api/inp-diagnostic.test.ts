import type { InpDiagnosticAnalysisResponse } from '@performance-platform/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createInpDiagnosticApi } from './inp-diagnostic.js'

const RESPONSE = {
    metric: { type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1' },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 20,
    evidenceSampleCount: 18,
    overall: { average: 260, p75: 280 },
    phases: {
        inputDelay: { average: 40, p75: 50 },
        processingDuration: { average: 140, p75: 160 },
        presentationDelay: { average: 80, p75: 90 },
    },
    dominantTarget: null,
    findings: [],
} satisfies InpDiagnosticAnalysisResponse

describe('createInpDiagnosticApi', () => {
    it('queries INP diagnostics for a time range', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify(RESPONSE), { status: 200 }),
        )
        const api = createInpDiagnosticApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
        await expect(api.query(RESPONSE.range)).resolves.toEqual(RESPONSE)
        const url = new URL(String(fetcher.mock.calls[0]?.[0]))
        expect(url.pathname).toBe('/api/v2/diagnostics/inp')
        expect(Object.fromEntries(url.searchParams)).toEqual(RESPONSE.range)
    })

    it('rejects a non-successful response', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(null, { status: 503 }),
        )
        const api = createInpDiagnosticApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })
        await expect(api.query()).rejects.toThrow(
            'INP diagnostic query failed with status 503',
        )
    })
})
