import { describe, expect, it, vi } from 'vitest'

import type {
    LcpDiagnosticAnalysisResponse,
    LcpDiagnosticResponse,
} from '@performance-platform/protocol'

import { createLcpDiagnosticService } from './lcp-diagnostic-service.js'

const FROM = '2026-09-01T00:00:00.000Z'

const TO = '2026-09-02T00:00:00.000Z'

const RESPONSE: LcpDiagnosticResponse = {
    metric: {
        type: 'web.vital.lcp',
        unit: 'ms',
        metricVersion: 'lcp-v1',
    },
    range: {
        from: FROM,
        to: TO,
    },
    sampleCount: 100,
    evidenceSampleCount: 80,
    overall: {
        average: 3_000,
        p75: 3_200,
    },
    phases: {
        timeToFirstByte: {
            average: 900,
            p75: 1_000,
        },
        resourceLoadDelay: {
            average: 600,
            p75: 700,
        },
        resourceLoadDuration: {
            average: 1_200,
            p75: 1_200,
        },
        elementRenderDelay: {
            average: 300,
            p75: 500,
        },
    },
}

const ANALYSIS_RESPONSE: LcpDiagnosticAnalysisResponse = {
    ...RESPONSE,
    findings: [
        {
            ruleId: 'lcp.late-resource-discovery',
            ruleVersion: '1',
            phase: 'resourceLoadDelay',
            evidence: {
                overallP75: 3_200,
                phaseAverage: 600,
                contribution: 0.2,
                targetShare: 0.1,
                sampleCount: 100,
                evidenceSampleCount: 80,
            },
        },
    ],
}

function setup() {
    const repository = {
        queryLcpDiagnostics: vi.fn().mockResolvedValue(RESPONSE),
    }

    const service = createLcpDiagnosticService({
        repository,
        appId: 'demo-web',
        now: () => Date.parse(TO),
    })

    return {
        repository,
        service,
    }
}

describe('LcpDiagnosticService', () => {
    it('queries LCP diagnostics for the requested range', async () => {
        const { repository, service } = setup()

        await expect(
            service.query({
                from: FROM,
                to: TO,
            }),
        ).resolves.toEqual({
            ok: true,
            value: ANALYSIS_RESPONSE,
        })

        expect(repository.queryLcpDiagnostics).toHaveBeenCalledWith({
            appId: 'demo-web',
            from: new Date(FROM),
            to: new Date(TO),
        })
    })

    it.each([
        [
            {
                from: 'not-a-date',
                to: TO,
            },
            'from',
        ],
        [
            {
                from: FROM,
                to: 'not-a-date',
            },
            'to',
        ],
    ] as const)('rejects invalid date %#', async (input, field) => {
        const { repository, service } = setup()

        await expect(service.query(input)).resolves.toEqual({
            ok: false,
            code: 'INVALID_DATE',
            field,
        })

        expect(repository.queryLcpDiagnostics).not.toHaveBeenCalled()
    })

    it('rejects a range whose start is not before its end', async () => {
        const { repository, service } = setup()

        await expect(
            service.query({
                from: TO,
                to: FROM,
            }),
        ).resolves.toEqual({
            ok: false,
            code: 'INVALID_TIME_RANGE',
        })

        expect(repository.queryLcpDiagnostics).not.toHaveBeenCalled()
    })

    it('rejects a range longer than 30 days', async () => {
        const { repository, service } = setup()

        await expect(
            service.query({
                from: '2026-08-01T00:00:00.000Z',
                to: '2026-09-01T00:00:00.001Z',
            }),
        ).resolves.toEqual({
            ok: false,
            code: 'TIME_RANGE_TOO_LARGE',
        })

        expect(repository.queryLcpDiagnostics).not.toHaveBeenCalled()
    })

    it('queries the latest 24 hours by default', async () => {
        const { repository, service } = setup()

        await service.query({})

        expect(repository.queryLcpDiagnostics).toHaveBeenCalledWith({
            appId: 'demo-web',
            from: new Date(Date.parse(TO) - 24 * 60 * 60 * 1_000),
            to: new Date(TO),
        })
    })

    it('returns storage unavailable when the repository fails', async () => {
        const cause = new Error('database unavailable')

        const repository = {
            queryLcpDiagnostics: vi.fn().mockRejectedValue(cause),
        }

        const service = createLcpDiagnosticService({
            repository,
            appId: 'demo-web',
            now: () => Date.parse(TO),
        })

        await expect(
            service.query({
                from: FROM,
                to: TO,
            }),
        ).resolves.toEqual({
            ok: false,
            code: 'STORAGE_UNAVAILABLE',
            cause,
        })
    })
})
