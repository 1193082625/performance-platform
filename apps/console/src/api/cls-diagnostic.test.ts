import { describe, expect, it, vi } from 'vitest'
import type {
    ClsDiagnosticAnalysisResponse,
} from '@performance-platform/protocol'
import { createClsDiagnosticApi } from './cls-diagnostic.js'

const SCOPE = { projectId: 'project-1', appId: 'app-1' }

const RESPONSE = {
    metric: { type: 'web.vital.cls', unit: 'score', metricVersion: 'cls-v1' },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 20,
    evidenceSampleCount: 18,
    overall: { average: 0.16, p75: 0.18 },
    largestShift: { average: 0.12, p75: 0.14 },
    loadStates: {
        loading: 0,
        domInteractive: 0,
        domContentLoaded: 3,
        complete: 15,
    },
    dominantTarget: null,
    findings: [],
} satisfies ClsDiagnosticAnalysisResponse

describe('createClsDiagnosticApi', () => {
    it('queries CLS diagnostics for a time range', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(JSON.stringify(RESPONSE), { status: 200 }),
        )
        const api = createClsDiagnosticApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        await expect(api.query(SCOPE, RESPONSE.range)).resolves.toEqual(RESPONSE)

        const url = new URL(String(fetcher.mock.calls[0]?.[0]))
        expect(url.pathname).toBe('/monitor-api/projects/project-1/apps/app-1/dashboard/cls')
        expect(Object.fromEntries(url.searchParams)).toEqual(RESPONSE.range)
    })

    it('rejects a non-successful response', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(null, { status: 503 }),
        )
        const api = createClsDiagnosticApi({
            baseUrl: 'http://localhost:5001',
            fetch: fetcher,
        })

        await expect(api.query(SCOPE)).rejects.toThrow(
            'CLS diagnostic query failed with status 503',
        )
    })
})
