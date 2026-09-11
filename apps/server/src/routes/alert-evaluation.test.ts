import type { AlertEvaluationResponse } from '@performance-platform/protocol'
import Fastify from 'fastify'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlertEvaluationService } from '../services/alert-evaluation-service.js'
import { registerAlertEvaluationRoutes } from './alert-evaluation.js'

const RESPONSE: AlertEvaluationResponse = {
    range: {
        from: '2026-09-09T00:00:00.000Z',
        to: '2026-09-10T00:00:00.000Z',
    },
    evaluatedAt: '2026-09-10T00:00:00.000Z',
    events: [],
}

describe('GET /api/v2/alerts/evaluate', () => {
    const apps: Array<{ close(): Promise<void> }> = []
    afterEach(async () => {
        await Promise.all(apps.map((app) => app.close()))
        apps.length = 0
    })

    it('returns evaluated alert events', async () => {
        const evaluate = vi.fn<AlertEvaluationService['evaluate']>()
            .mockResolvedValue({ ok: true, value: RESPONSE })
        const app = Fastify()
        await app.register(registerAlertEvaluationRoutes, {
            alertEvaluationService: { evaluate },
        })
        apps.push(app)
        const response = await app.inject({
            method: 'GET',
            url: '/api/v2/alerts/evaluate?from=2026-09-09T00:00:00.000Z',
        })
        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual(RESPONSE)
    })

    it('maps validation errors', async () => {
        const evaluate = vi.fn<AlertEvaluationService['evaluate']>()
            .mockResolvedValue({ ok: false, code: 'INVALID_DATE', field: 'from' })
        const app = Fastify()
        await app.register(registerAlertEvaluationRoutes, {
            alertEvaluationService: { evaluate },
        })
        apps.push(app)
        const response = await app.inject({ method: 'GET', url: '/api/v2/alerts/evaluate?from=bad' })
        expect(response.statusCode).toBe(400)
        expect(response.json()).toMatchObject({
            error: { code: 'INVALID_DATE', message: 'from must be a valid ISO 8601 date' },
        })
    })
})
