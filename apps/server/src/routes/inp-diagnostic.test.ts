import type { InpDiagnosticAnalysisResponse } from '@performance-platform/protocol'
import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InpDiagnosticService } from '../services/inp-diagnostic-service.js'
import { registerInpDiagnosticRoutes } from './inp-diagnostic.js'

const RESPONSE: InpDiagnosticAnalysisResponse = {
    metric: { type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1' },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 20,
    evidenceSampleCount: 20,
    overall: { average: 260, p75: 280 },
    phases: {
        inputDelay: { average: 40, p75: 50 },
        processingDuration: { average: 140, p75: 160 },
        presentationDelay: { average: 80, p75: 90 },
    },
    dominantTarget: null,
    findings: [],
}

describe('GET /api/v2/diagnostics/inp', () => {
    const apps: Array<{ close(): Promise<void> }> = []
    afterEach(async () => {
        await Promise.all(apps.map((app) => app.close()))
        apps.length = 0
    })

    it('returns aggregated INP diagnostics', async () => {
        const query = vi.fn<InpDiagnosticService['query']>()
            .mockResolvedValue({ ok: true, value: RESPONSE })
        const app = Fastify()
        await app.register(registerInpDiagnosticRoutes, {
            inpDiagnosticService: { query },
        })
        apps.push(app)
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/diagnostics/inp?from=2026-09-01T00:00:00.000Z',
        })
        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(RESPONSE)
    })

    it('maps validation errors', async () => {
        const query = vi.fn<InpDiagnosticService['query']>().mockResolvedValue({
            ok: false,
            code: 'INVALID_DATE',
            field: 'from',
        })
        const app = Fastify()
        await app.register(registerInpDiagnosticRoutes, {
            inpDiagnosticService: { query },
        })
        apps.push(app)
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/diagnostics/inp?from=bad',
        })
        expect(response.statusCode).toBe(400)
        expect(response.json()).toMatchObject({
            error: {
                code: 'INVALID_DATE',
                message: 'from must be a valid ISO 8601 date',
            },
        })
    })
})
