import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
    ClsDiagnosticAnalysisResponse,
} from '@performance-platform/protocol'
import type {
    ClsDiagnosticService,
} from '../services/cls-diagnostic-service.js'
import { registerClsDiagnosticRoutes } from './cls-diagnostic.js'

const RESPONSE: ClsDiagnosticAnalysisResponse = {
    metric: { type: 'web.vital.cls', unit: 'score', metricVersion: 'cls-v1' },
    range: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-02T00:00:00.000Z',
    },
    sampleCount: 20,
    evidenceSampleCount: 20,
    overall: { average: 0.16, p75: 0.18 },
    largestShift: { average: 0.12, p75: 0.14 },
    loadStates: {
        loading: 0,
        domInteractive: 0,
        domContentLoaded: 5,
        complete: 15,
    },
    dominantTarget: null,
    findings: [],
}

describe('GET /api/v2/diagnostics/cls', () => {
    const apps: Array<{ close(): Promise<void> }> = []

    afterEach(async () => {
        await Promise.all(apps.map((app) => app.close()))
        apps.length = 0
    })

    it('returns aggregated CLS diagnostics', async () => {
        const query = vi.fn<ClsDiagnosticService['query']>()
            .mockResolvedValue({ ok: true, value: RESPONSE })
        const app = Fastify()
        await app.register(registerClsDiagnosticRoutes, {
            clsDiagnosticService: { query },
        })
        apps.push(app)

        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/diagnostics/cls?from=2026-09-01T00:00:00.000Z',
        })

        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(RESPONSE)
    })

    it('maps validation errors', async () => {
        const query = vi.fn<ClsDiagnosticService['query']>()
            .mockResolvedValue({
                ok: false,
                code: 'INVALID_DATE',
                field: 'from',
            })
        const app = Fastify()
        await app.register(registerClsDiagnosticRoutes, {
            clsDiagnosticService: { query },
        })
        apps.push(app)

        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/diagnostics/cls?from=bad',
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
