import type { ClsDiagnosticResponse } from '@performance-platform/protocol'
import { describe, expect, it, vi } from 'vitest'
import { createClsDiagnosticService } from './cls-diagnostic-service.js'

const FROM = '2026-09-01T00:00:00.000Z'
const TO = '2026-09-02T00:00:00.000Z'

const RESPONSE: ClsDiagnosticResponse = {
    metric: { type: 'web.vital.cls', unit: 'score', metricVersion: 'cls-v1' },
    range: { from: FROM, to: TO },
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
}

function setup() {
    const repository = {
        queryClsDiagnostics: vi.fn().mockResolvedValue(RESPONSE),
    }
    return {
        repository,
        service: createClsDiagnosticService({
            repository,
            appId: 'demo-web',
            now: () => Date.parse(TO),
        }),
    }
}

describe('ClsDiagnosticService', () => {
    it('queries and evaluates CLS diagnostics', async () => {
        const { repository, service } = setup()

        const result = await service.query({ from: FROM, to: TO })

        expect(result).toEqual({
            ok: true,
            value: {
                ...RESPONSE,
                findings: [expect.objectContaining({
                    ruleId: 'cls.late-layout-shift',
                })],
            },
        })
        expect(repository.queryClsDiagnostics).toHaveBeenCalledWith({
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
        await expect(service.query(input)).resolves.toMatchObject({
            ok: false,
            code,
        })
    })
})
