import {
  ratePaintMetric,
  rateWebVital,
  type ClsDiagnosticFinding,
  type InpDiagnosticFinding,
  type LcpDiagnosticFinding,
  type MemoryHealthAssessment,
  type MetricRating,
  type MetricStats,
  type PaintStats,
} from "@performance-platform/protocol";

export type RecommendationStatus =
  | "NEEDS_IMPROVEMENT"
  | "POOR"
  | "WARNING"
  | "CRITICAL";

export interface PerformanceRecommendation {
  metric: "FP" | "FCP" | "LCP" | "CLS" | "INP" | "MEMORY";
  status: RecommendationStatus;
  messageKey: string;
  messageParams?: Record<string, number | string>;
}

interface RecommendationInput {
  fp?: PaintStats;
  fcp?: PaintStats;
  lcp?: MetricStats;
  cls?: MetricStats;
  clsFindings?: ClsDiagnosticFinding[];
  clsEvidence?: DiagnosticEvidence;
  inp?: MetricStats;
  inpFindings?: InpDiagnosticFinding[];
  inpEvidence?: DiagnosticEvidence;
  memoryHealth?: MemoryHealthAssessment | null;
  lcpFindings?: LcpDiagnosticFinding[];
  lcpEvidence?: DiagnosticEvidence;
}

interface DiagnosticEvidence {
  sampleCount: number;
  evidenceSampleCount: number;
}

function evidenceParams(evidence: DiagnosticEvidence) {
  return {
    evidenceSamples: evidence.evidenceSampleCount,
    samples: evidence.sampleCount,
    coverage: evidence.sampleCount === 0
      ? 0
      : Math.round((evidence.evidenceSampleCount / evidence.sampleCount) * 100),
    minimumSamples: 10,
    minimumCoverage: 50,
  };
}

function hasInsufficientEvidence(
  findings: readonly unknown[] | undefined,
  evidence: DiagnosticEvidence | undefined,
): evidence is DiagnosticEvidence {
  return findings?.length === 0 && evidence !== undefined && (
    evidence.evidenceSampleCount < 10 ||
    evidence.sampleCount <= 0 ||
    evidence.evidenceSampleCount / evidence.sampleCount < 0.5
  );
}

function recommendationStatus(
  rating: MetricRating,
): "NEEDS_IMPROVEMENT" | "POOR" | null {
  if (rating === "good") return null;
  return rating === "poor" ? "POOR" : "NEEDS_IMPROVEMENT";
}

export function createPerformanceRecommendations(
  input: RecommendationInput,
): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = [];

  const add = (
    metric: PerformanceRecommendation["metric"],
    stats: PaintStats | MetricStats | undefined,
    rate: (value: number) => MetricRating,
    messageKey: string,
  ) => {
    if (stats?.p75 === null || stats?.p75 === undefined) return;
    const status = recommendationStatus(rate(stats.p75));
    if (status !== null) recommendations.push({ metric, status, messageKey });
  };

  add("FP", input.fp, (value) => ratePaintMetric("web.paint.fp", value), "recommendations.fp");
  add("FCP", input.fcp, (value) => ratePaintMetric("web.paint.fcp", value), "recommendations.fcp");
  const primaryLcpFinding = input.lcpFindings
    ?.slice()
    .sort(
      (left, right) =>
        right.evidence.contribution / right.evidence.targetShare -
        left.evidence.contribution / left.evidence.targetShare,
    )[0];
  const lcpMessageKeys = {
    "lcp.slow-server-response": "recommendations.lcpSlowServerResponse",
    "lcp.late-resource-discovery": "recommendations.lcpLateResourceDiscovery",
    "lcp.slow-resource-load": "recommendations.lcpSlowResourceLoad",
    "lcp.slow-element-render": "recommendations.lcpSlowElementRender",
  } as const;
  add(
    "LCP",
    input.lcp,
    (value) => rateWebVital("web.vital.lcp", value),
    primaryLcpFinding === undefined
      ? "recommendations.lcp"
      : lcpMessageKeys[primaryLcpFinding.ruleId],
  );
  if (hasInsufficientEvidence(input.lcpFindings, input.lcpEvidence)) {
    const recommendation = recommendations.find((item) => item.metric === "LCP");
    if (recommendation !== undefined) {
      recommendation.messageKey = "recommendations.lcpInsufficientEvidence";
      recommendation.messageParams = evidenceParams(input.lcpEvidence);
    }
  }
  if (primaryLcpFinding !== undefined) {
    const recommendation = recommendations.find((item) => item.metric === "LCP");
    if (recommendation !== undefined) {
      recommendation.messageParams = {
        contribution: Math.round(primaryLcpFinding.evidence.contribution * 100),
        target: Math.round(primaryLcpFinding.evidence.targetShare * 100),
        evidenceSamples: primaryLcpFinding.evidence.evidenceSampleCount,
        samples: primaryLcpFinding.evidence.sampleCount,
      };
    }
  }
  add("CLS", input.cls, (value) => rateWebVital("web.vital.cls", value), "recommendations.cls");
  if (hasInsufficientEvidence(input.clsFindings, input.clsEvidence)) {
    const recommendation = recommendations.find((item) => item.metric === "CLS");
    if (recommendation !== undefined) {
      recommendation.messageKey = "recommendations.clsInsufficientEvidence";
      recommendation.messageParams = evidenceParams(input.clsEvidence);
    }
  }
  const clsPriority = {
    "cls.repeated-shift-target": 3,
    "cls.late-layout-shift": 2,
    "cls.early-load-shift": 1,
  } as const;
  const primaryClsFinding = input.clsFindings
    ?.slice()
    .sort(
      (left, right) => clsPriority[right.ruleId] - clsPriority[left.ruleId],
    )[0];
  if (primaryClsFinding !== undefined) {
    const recommendation = recommendations.find((item) => item.metric === "CLS");
    if (recommendation !== undefined) {
      recommendation.messageKey = {
        "cls.repeated-shift-target": "recommendations.clsRepeatedShiftTarget",
        "cls.late-layout-shift": "recommendations.clsLateLayoutShift",
        "cls.early-load-shift": "recommendations.clsEarlyLoadShift",
      }[primaryClsFinding.ruleId];
      recommendation.messageParams = {
        affectedSamples: primaryClsFinding.evidence.affectedSampleCount,
        evidenceSamples: primaryClsFinding.evidence.evidenceSampleCount,
        samples: primaryClsFinding.evidence.sampleCount,
        share: Math.round(primaryClsFinding.evidence.share * 100),
        ...(primaryClsFinding.ruleId === "cls.repeated-shift-target"
          ? { target: primaryClsFinding.target }
          : {}),
      };
    }
  }
  add("INP", input.inp, (value) => rateWebVital("web.vital.inp", value), "recommendations.inp");
  if (hasInsufficientEvidence(input.inpFindings, input.inpEvidence)) {
    const recommendation = recommendations.find((item) => item.metric === "INP");
    if (recommendation !== undefined) {
      recommendation.messageKey = "recommendations.inpInsufficientEvidence";
      recommendation.messageParams = evidenceParams(input.inpEvidence);
    }
  }
  const inpPriority = {
    "inp.repeated-interaction-target": 4,
    "inp.slow-event-handler": 3,
    "inp.high-input-delay": 2,
    "inp.high-presentation-delay": 1,
  } as const;
  const primaryInpFinding = input.inpFindings
    ?.slice()
    .sort((left, right) => inpPriority[right.ruleId] - inpPriority[left.ruleId])[0];
  if (primaryInpFinding !== undefined) {
    const recommendation = recommendations.find((item) => item.metric === "INP");
    if (recommendation !== undefined) {
      recommendation.messageKey = {
        "inp.high-input-delay": "recommendations.inpHighInputDelay",
        "inp.slow-event-handler": "recommendations.inpSlowEventHandler",
        "inp.high-presentation-delay": "recommendations.inpHighPresentationDelay",
        "inp.repeated-interaction-target": "recommendations.inpRepeatedInteractionTarget",
      }[primaryInpFinding.ruleId];
      recommendation.messageParams = {
        evidenceSamples: primaryInpFinding.evidence.evidenceSampleCount,
        samples: primaryInpFinding.evidence.sampleCount,
        ...(primaryInpFinding.ruleId === "inp.repeated-interaction-target"
          ? {
              target: primaryInpFinding.target,
              affectedSamples: primaryInpFinding.evidence.affectedSampleCount,
              share: Math.round(primaryInpFinding.evidence.share * 100),
            }
          : {
              phaseAverage: Math.round(primaryInpFinding.evidence.phaseAverage),
              contribution: Math.round(primaryInpFinding.evidence.contribution * 100),
            }),
      };
    }
  }

  const memoryStatus = input.memoryHealth?.status;
  if (memoryStatus === "WARNING" || memoryStatus === "CRITICAL") {
    recommendations.push({
      metric: "MEMORY",
      status: memoryStatus,
      messageKey:
        memoryStatus === "CRITICAL"
          ? "recommendations.memoryCritical"
          : "recommendations.memoryWarning",
    });
  }

  return recommendations;
}
