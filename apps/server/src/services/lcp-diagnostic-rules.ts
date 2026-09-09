import type {
    LcpDiagnosticFinding,
    LcpDiagnosticResponse,
} from '@performance-platform/protocol'

const MIN_EVIDENCE_SAMPLE_COUNT = 10
const MIN_EVIDENCE_COVERAGE = 0.5

const PHASE_RULES = [
    {
        finding: {
            ruleId: 'lcp.slow-server-response',
            phase: 'timeToFirstByte',
        },
        targetShare: 0.4,
    },
    {
        finding: {
            ruleId: 'lcp.late-resource-discovery',
            phase: 'resourceLoadDelay',
        },
        targetShare: 0.1,
    },
    {
        finding: {
            ruleId: 'lcp.slow-resource-load',
            phase: 'resourceLoadDuration',
        },
        targetShare: 0.4,
    },
    {
        finding: {
            ruleId: 'lcp.slow-element-render',
            phase: 'elementRenderDelay',
        },
        targetShare: 0.1,
    },
] as const

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

    return PHASE_RULES.flatMap((rule): LcpDiagnosticFinding[] => {
        const phaseAverage = diagnostic.phases[rule.finding.phase].average

        if (phaseAverage === null) {
            return []
        }

        const contribution = phaseAverage / totalAverage
        if (contribution <= rule.targetShare) {
            return []
        }

        return [{
            ...rule.finding,
            ruleVersion: '1',
            evidence: {
                overallP75,
                phaseAverage,
                contribution,
                targetShare: rule.targetShare,
                sampleCount: diagnostic.sampleCount,
                evidenceSampleCount: diagnostic.evidenceSampleCount,
            },
        }]
    })
}
