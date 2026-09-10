import type { InpDiagnosticResponse } from '@performance-platform/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createInpDiagnosticService } from './inp-diagnostic-service.js'

const FROM = '2026-09-01T00:00:00.000Z'
const TO = '2026-09-02T00:00:00.000Z'
const RESPONSE: InpDiagnosticResponse = {
    metric: { type: 'web.vital.inp', unit: 'ms', metricVersion: 'inp-v1' },
    range: { from: FROM, to: TO },
    sampleCount: 20,
    evidenceSampleCount: 20,
    overall: { average: 260, p75: 280 },
    phases: {
        inputDelay: { average: 40, p75: 50 },
        processingDuration: { average: 140, p75: 160 },
        presentationDelay: { average: 80, p75: 90 },
    },
    dominantTarget: null,
}

function setup() {
    const repository = { queryInpDiagnostics: vi.fn().mockResolvedValue(RESPONSE) }
    return {
        repository,
        service: createInpDiagnosticService({
            repository,
            appId: 'demo-web',
            now: () => Date.parse(TO),
        }),
    }
}

describe('InpDiagnosticService', () => {
    it('queries and evaluates INP diagnostics', async () => {
        const { repository, service } = setup()
        await expect(service.query({ from: FROM, to: TO })).resolves.toEqual({
            ok: true,
            value: {
                ...RESPONSE,
                findings: [expect.objectContaining({ ruleId: 'inp.slow-event-handler' })],
            },
        })
        expect(repository.queryInpDiagnostics).toHaveBeenCalledWith({
            appId: 'demo-web',
            from: new Date(FROM),
            to: new Date(TO),
        })
    })

    it.each([
        [{ from: 'bad', to: TO }, 'INVALID_DATE'],
        [{ from: TO, to: FROM }, 'INVALID_TIME_RANGE'],
        [{ from: '2026-07-01T00:00:00.000Z', to: TO }, 'TIME_RANGE_TOO_LARGE'],
    ] as const)('validates the requested range', async (input, code) => {
        const { service } = setup()
        await expect(service.query(input)).resolves.toMatchObject({ ok: false, code })
    })

    it('maps repository failures to storage unavailable', async () => {
        const { repository, service } = setup()
        repository.queryInpDiagnostics.mockRejectedValue(new Error('offline'))
        await expect(service.query({ from: FROM, to: TO })).resolves.toMatchObject({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
        })
    })
})
