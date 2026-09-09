import type { LcpDiagnosticResponse } from '@performance-platform/protocol'

export interface LcpDiagnosticFinding {
    ruleId: 'lcp.late-resource-discovery'
    phase: 'resourceLoadDelay'
    evidence: {
        overallP75: number
        phaseAverage: number
        contribution: number
        targetShare: number
        sampleCount: number
        evidenceSampleCount: number
    }
}

const MIN_EVIDENCE_SAMPLE_COUNT = 10
const MIN_EVIDENCE_COVERAGE = 0.5

export function evaluateLcpDiagnosticRules(
    diagnostic: LcpDiagnosticResponse,
): LcpDiagnosticFinding[] {
    const { sampleCount, evidenceSampleCount } = diagnostic

    // 至少有 10 个包含 attribution 的样本，避免极小样本误判
    // attribution 覆盖率至少为 50%，避免少数特殊样本代表全部流量
    if (
        sampleCount <= 0 ||
        evidenceSampleCount < MIN_EVIDENCE_SAMPLE_COUNT ||
        evidenceSampleCount / sampleCount < MIN_EVIDENCE_COVERAGE
    ) {
        return []
    }

    const overallP75 = diagnostic.overall.p75

    if (overallP75 === null || overallP75 <= 2_500) {
        return []
    }

    const {
        timeToFirstByte,
        resourceLoadDelay,
        resourceLoadDuration,
        elementRenderDelay,
    } = diagnostic.phases

    const average = [
        timeToFirstByte.average,
        resourceLoadDelay.average,
        resourceLoadDuration.average,
        elementRenderDelay.average,
    ]

    if (average.some((value) => value === null)) {
        return []
    }

    const totalAverage = average.reduce<number>(
        (total, value) => total + (value ?? 0),
        0,
    )

    if (totalAverage <= 0 || resourceLoadDelay.average === null) {
        return []
    }

    const contribution = resourceLoadDelay.average / totalAverage
    const targetShare = 0.1

    if (contribution <= targetShare) {
        return []
    }

    return [
        {
            ruleId: 'lcp.late-resource-discovery',
            phase: 'resourceLoadDelay',
            evidence: {
                overallP75,
                phaseAverage: resourceLoadDelay.average,
                contribution,
                targetShare,
                sampleCount: diagnostic.sampleCount,
                evidenceSampleCount: diagnostic.evidenceSampleCount,
            },
        },
    ]
}
