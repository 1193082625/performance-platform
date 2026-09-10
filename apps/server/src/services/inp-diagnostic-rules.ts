import type {
    InpDiagnosticFinding,
    InpDiagnosticResponse,
} from '@performance-platform/protocol'

const MIN_EVIDENCE_SAMPLE_COUNT = 10
const MIN_EVIDENCE_COVERAGE = 0.5
const REPEATED_TARGET_SHARE = 0.3

const PHASE_RULES = [
    {
        ruleId: 'inp.high-input-delay',
        phase: 'inputDelay',
    },
    {
        ruleId: 'inp.slow-event-handler',
        phase: 'processingDuration',
    },
    {
        ruleId: 'inp.high-presentation-delay',
        phase: 'presentationDelay',
    },
] as const

export function evaluateInpDiagnosticRules(
    diagnostic: InpDiagnosticResponse,
): InpDiagnosticFinding[] {
    const { sampleCount, evidenceSampleCount } = diagnostic
    const overallP75 = diagnostic.overall.p75

    if (
        sampleCount <= 0 ||
        evidenceSampleCount < MIN_EVIDENCE_SAMPLE_COUNT ||
        evidenceSampleCount / sampleCount < MIN_EVIDENCE_COVERAGE ||
        overallP75 === null ||
        overallP75 <= 200
    ) {
        return []
    }

    const phases = PHASE_RULES.map((rule) => ({
        ...rule,
        average: diagnostic.phases[rule.phase].average,
    }))

    if (phases.some((phase) => phase.average === null)) {
        return []
    }

    const totalAverage = phases.reduce(
        (total, phase) => total + (phase.average ?? 0),
        0,
    )
    if (totalAverage <= 0) return []

    const dominantPhase = phases.reduce((current, phase) =>
        (phase.average ?? 0) > (current.average ?? 0) ? phase : current,
    )
    const phaseAverage = dominantPhase.average ?? 0
    const findings: InpDiagnosticFinding[] = [{
        ruleId: dominantPhase.ruleId,
        ruleVersion: '1',
        phase: dominantPhase.phase,
        evidence: {
            overallP75,
            phaseAverage,
            contribution: phaseAverage / totalAverage,
            sampleCount,
            evidenceSampleCount,
        },
    } as InpDiagnosticFinding]

    const target = diagnostic.dominantTarget
    if (
        target !== null &&
        target.count >= MIN_EVIDENCE_SAMPLE_COUNT &&
        target.share >= REPEATED_TARGET_SHARE
    ) {
        findings.push({
            ruleId: 'inp.repeated-interaction-target',
            ruleVersion: '1',
            target: target.selector,
            evidence: {
                overallP75,
                sampleCount,
                evidenceSampleCount,
                affectedSampleCount: target.count,
                share: target.share,
            },
        })
    }

    return findings
}
