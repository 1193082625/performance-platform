import {
  ratePaintMetric,
  rateWebVital,
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
}

interface RecommendationInput {
  fp?: PaintStats;
  fcp?: PaintStats;
  lcp?: MetricStats;
  cls?: MetricStats;
  inp?: MetricStats;
  memoryHealth?: MemoryHealthAssessment | null;
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
  add("LCP", input.lcp, (value) => rateWebVital("web.vital.lcp", value), "recommendations.lcp");
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
