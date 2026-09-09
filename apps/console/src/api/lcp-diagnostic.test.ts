import { describe, expect, it, vi } from 'vitest'

import type { LcpDiagnosticAnalysisResponse } from '@performance-platform/protocol'

import { createLcpDiagnosticApi } from './lcp-diagnostic.js'

const RESPONSE = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 100,
    evidenceSampleCount: 80,
    overall: { average: 3_000, p75: 3_200 },
    phases: {
        timeToFirstByte: { average: 900, p75: 1_000 },
        resourceLoadDelay: { average: 600, p75: 700 },
        resourceLoadDuration: { average: 1_100, p75: 1_200 },
        elementRenderDelay: { average: 400, p75: 500 },
    },
    findings: [],
} satisfies LcpDiagnosticAnalysisResponse

describe('createLcpDiagnosticApi', () => {
    it('queries LCP diagnostics for a time range', async () => {
        const fetcher = vi
            .fn<typeof fetch>()
            .mockResolvedValue(
                new Response(JSON.stringify(RESPONSE), { status: 200 }),
            )
        const api = createLcpDiagnosticApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        await expect(
            api.query({
                from: RESPONSE.range.from,
                to: RESPONSE.range.to,
            }),
        ).resolves.toEqual(RESPONSE)

        const [requestedUrl, init] = fetcher.mock.calls[0]!
        const url = new URL(String(requestedUrl))
        expect(url.pathname).toBe('/api/v2/diagnostics/lcp')
        expect(Object.fromEntries(url.searchParams)).toEqual(RESPONSE.range)
        expect(init).toEqual({ headers: { accept: 'application/json' } })
    })

    it('rejects a non-successful response', async () => {
        const fetcher = vi
            .fn<typeof fetch>()
            .mockResolvedValue(new Response(null, { status: 503 }))
        const api = createLcpDiagnosticApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        await expect(api.query()).rejects.toThrow(
            'LCP diagnostic query failed with status 503',
        )
    })
})
