import type {
    ClsDiagnosticFinding,
    ClsDiagnosticResponse,
} from '@performance-platform/protocol'

const MIN_EVIDENCE_SAMPLE_COUNT = 10
const MIN_EVIDENCE_COVERAGE = 0.5
const DOMINANT_LOAD_PHASE_SHARE = 0.5
const REPEATED_TARGET_SHARE = 0.3

export function evaluateClsDiagnosticRules(
    diagnostic: ClsDiagnosticResponse,
): ClsDiagnosticFinding[] {
    const { sampleCount, evidenceSampleCount } = diagnostic
    const overallP75 = diagnostic.overall.p75

    if (
        sampleCount <= 0 ||
        evidenceSampleCount < MIN_EVIDENCE_SAMPLE_COUNT ||
        evidenceSampleCount / sampleCount < MIN_EVIDENCE_COVERAGE ||
        overallP75 === null ||
        overallP75 <= 0.1
    ) {
        return []
    }

    const findings: ClsDiagnosticFinding[] = []
    const earlyCount =
        diagnostic.loadStates.loading +
        diagnostic.loadStates.domInteractive +
        diagnostic.loadStates.domContentLoaded
    const earlyShare = earlyCount / evidenceSampleCount
    const completeShare = diagnostic.loadStates.complete / evidenceSampleCount

    if (earlyShare > DOMINANT_LOAD_PHASE_SHARE) {
        findings.push({
            ruleId: 'cls.early-load-shift',
            ruleVersion: '1',
            loadPhase: 'early',
            evidence: {
                overallP75,
                sampleCount,
                evidenceSampleCount,
                affectedSampleCount: earlyCount,
                share: earlyShare,
            },
        })
    }

    if (completeShare > DOMINANT_LOAD_PHASE_SHARE) {
        findings.push({
            ruleId: 'cls.late-layout-shift',
            ruleVersion: '1',
            loadPhase: 'complete',
            evidence: {
                overallP75,
                sampleCount,
                evidenceSampleCount,
                affectedSampleCount: diagnostic.loadStates.complete,
                share: completeShare,
            },
        })
    }

    const target = diagnostic.dominantTarget
    if (
        target !== null &&
        target.count >= MIN_EVIDENCE_SAMPLE_COUNT &&
        target.share >= REPEATED_TARGET_SHARE
    ) {
        findings.push({
            ruleId: 'cls.repeated-shift-target',
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
