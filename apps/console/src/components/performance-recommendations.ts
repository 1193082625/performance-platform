import {
  ratePaintMetric,
  rateWebVital,
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
  inp?: MetricStats;
  memoryHealth?: MemoryHealthAssessment | null;
  lcpFindings?: LcpDiagnosticFinding[];
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
  add("INP", input.inp, (value) => rateWebVital("web.vital.inp", value), "recommendations.inp");

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
