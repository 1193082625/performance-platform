import { describe, expect, it } from "vitest";

import { createPerformanceRecommendations } from "./performance-recommendations.js";

const stats = (p75: number | null) => ({
  count: p75 === null ? 0 : 1,
  average: p75,
  p50: p75,
  p75,
  p90: p75,
});

describe("createPerformanceRecommendations", () => {
  it("returns recommendations only for abnormal metric ratings", () => {
    expect(
      createPerformanceRecommendations({
        fp: stats(1_500),
        fcp: stats(3_100),
        lcp: stats(2_000),
        cls: stats(0.3),
        inp: stats(100),
      }),
    ).toEqual([
      { metric: "FP", status: "NEEDS_IMPROVEMENT", messageKey: "recommendations.fp" },
      { metric: "FCP", status: "POOR", messageKey: "recommendations.fcp" },
      { metric: "CLS", status: "POOR", messageKey: "recommendations.cls" },
    ]);
  });

  it("adds status-specific memory recommendations", () => {
    const base = {
      reasons: ["SUSTAINED_HEAP_GROWTH" as const],
      sampleCount: 8,
      window: { from: 1, to: 2 },
      latest: { usedHeap: 900, heapLimit: 1_000, utilization: 0.9 },
      growth: { absolute: 100, ratio: 0.5, increasingTransitionRatio: 1 },
    };

    expect(
      createPerformanceRecommendations({
        memoryHealth: { ...base, status: "CRITICAL" },
      }),
    ).toEqual([
      {
        metric: "MEMORY",
        status: "CRITICAL",
        messageKey: "recommendations.memoryCritical",
      },
    ]);
  });

  it("uses evidence-backed advice for late LCP resource discovery", () => {
    expect(
      createPerformanceRecommendations({
        lcp: stats(3_200),
        lcpFindings: [
          {
            ruleId: "lcp.late-resource-discovery",
            ruleVersion: "1",
            phase: "resourceLoadDelay",
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
      }),
    ).toEqual([
      {
        metric: "LCP",
        status: "NEEDS_IMPROVEMENT",
        messageKey: "recommendations.lcpLateResourceDiscovery",
        messageParams: {
          contribution: 20,
          target: 10,
          evidenceSamples: 80,
          samples: 100,
        },
      },
    ]);
  });

  it("returns no advice for good, empty, or insufficient data", () => {
    expect(
      createPerformanceRecommendations({
        fp: stats(500),
        fcp: stats(null),
        lcp: stats(2_500),
      }),
    ).toEqual([]);
  });
});
