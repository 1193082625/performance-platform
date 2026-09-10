import { describe, expect, it } from "vitest";
import type { InpDiagnosticFinding } from "@performance-platform/protocol";

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

  it("prioritizes the finding that most exceeds its target share", () => {
    const evidence = {
      overallP75: 3_200,
      phaseAverage: 900,
      contribution: 0.3,
      targetShare: 0.1,
      sampleCount: 100,
      evidenceSampleCount: 80,
    };

    const [recommendation] = createPerformanceRecommendations({
      lcp: stats(3_200),
      lcpFindings: [
        {
          ruleId: "lcp.slow-server-response",
          ruleVersion: "1",
          phase: "timeToFirstByte",
          evidence: {
            ...evidence,
            contribution: 0.5,
            targetShare: 0.4,
          },
        },
        {
          ruleId: "lcp.slow-element-render",
          ruleVersion: "1",
          phase: "elementRenderDelay",
          evidence,
        },
      ],
    });

    expect(recommendation?.messageKey).toBe(
      "recommendations.lcpSlowElementRender",
    );
    expect(recommendation?.messageParams).toMatchObject({
      contribution: 30,
      target: 10,
    });
  });

  it.each([
    {
      finding: {
        ruleId: "lcp.slow-server-response",
        ruleVersion: "1",
        phase: "timeToFirstByte",
      } as const,
      messageKey: "recommendations.lcpSlowServerResponse",
    },
    {
      finding: {
        ruleId: "lcp.slow-resource-load",
        ruleVersion: "1",
        phase: "resourceLoadDuration",
      } as const,
      messageKey: "recommendations.lcpSlowResourceLoad",
    },
    {
      finding: {
        ruleId: "lcp.slow-element-render",
        ruleVersion: "1",
        phase: "elementRenderDelay",
      } as const,
      messageKey: "recommendations.lcpSlowElementRender",
    },
  ])("maps $finding.ruleId to precise advice", ({ finding, messageKey }) => {
    const [recommendation] = createPerformanceRecommendations({
      lcp: stats(3_200),
      lcpFindings: [
        {
          ...finding,
          evidence: {
            overallP75: 3_200,
            phaseAverage: 1_500,
            contribution: 0.5,
            targetShare: 0.4,
            sampleCount: 100,
            evidenceSampleCount: 80,
          },
        },
      ],
    });

    expect(recommendation?.messageKey).toBe(messageKey);
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

  it("prioritizes a repeated INP target and includes its evidence", () => {
    const [recommendation] = createPerformanceRecommendations({
      inp: stats(280),
      inpFindings: [
        {
          ruleId: "inp.slow-event-handler",
          ruleVersion: "1",
          phase: "processingDuration",
          evidence: {
            overallP75: 280,
            phaseAverage: 140,
            contribution: 0.54,
            sampleCount: 100,
            evidenceSampleCount: 80,
          },
        },
        {
          ruleId: "inp.repeated-interaction-target",
          ruleVersion: "1",
          target: "#checkout",
          evidence: {
            overallP75: 280,
            sampleCount: 100,
            evidenceSampleCount: 80,
            affectedSampleCount: 32,
            share: 0.4,
          },
        },
      ],
    });

    expect(recommendation).toEqual({
      metric: "INP",
      status: "NEEDS_IMPROVEMENT",
      messageKey: "recommendations.inpRepeatedInteractionTarget",
      messageParams: {
        target: "#checkout",
        affectedSamples: 32,
        evidenceSamples: 80,
        samples: 100,
        share: 40,
      },
    });
  });

  it.each([
    ["inp.high-input-delay", "inputDelay", "recommendations.inpHighInputDelay"],
    ["inp.slow-event-handler", "processingDuration", "recommendations.inpSlowEventHandler"],
    ["inp.high-presentation-delay", "presentationDelay", "recommendations.inpHighPresentationDelay"],
  ] as const)("maps %s to precise INP advice", (ruleId, phase, messageKey) => {
    const [recommendation] = createPerformanceRecommendations({
      inp: stats(280),
      inpFindings: [{
        ruleId,
        ruleVersion: "1",
        phase,
        evidence: {
          overallP75: 280,
          phaseAverage: 140.4,
          contribution: 0.536,
          sampleCount: 100,
          evidenceSampleCount: 80,
        },
      } as InpDiagnosticFinding],
    });

    expect(recommendation).toMatchObject({
      messageKey,
      messageParams: {
        phaseAverage: 140,
        contribution: 54,
        evidenceSamples: 80,
        samples: 100,
      },
    });
  });

  it("prioritizes a repeated CLS target and includes its evidence", () => {
    const evidence = {
      overallP75: 0.18,
      sampleCount: 100,
      evidenceSampleCount: 80,
      affectedSampleCount: 32,
      share: 0.4,
    };

    const [recommendation] = createPerformanceRecommendations({
      cls: stats(0.18),
      clsFindings: [
        {
          ruleId: "cls.late-layout-shift",
          ruleVersion: "1",
          loadPhase: "complete",
          evidence: { ...evidence, affectedSampleCount: 50, share: 0.625 },
        },
        {
          ruleId: "cls.repeated-shift-target",
          ruleVersion: "1",
          target: ".promo-banner",
          evidence,
        },
      ],
    });

    expect(recommendation).toEqual({
      metric: "CLS",
      status: "NEEDS_IMPROVEMENT",
      messageKey: "recommendations.clsRepeatedShiftTarget",
      messageParams: {
        target: ".promo-banner",
        affectedSamples: 32,
        evidenceSamples: 80,
        samples: 100,
        share: 40,
      },
    });
  });

  it.each([
    {
      finding: {
        ruleId: "cls.late-layout-shift",
        ruleVersion: "1",
        loadPhase: "complete",
      } as const,
      messageKey: "recommendations.clsLateLayoutShift",
    },
    {
      finding: {
        ruleId: "cls.early-load-shift",
        ruleVersion: "1",
        loadPhase: "early",
      } as const,
      messageKey: "recommendations.clsEarlyLoadShift",
    },
  ])("maps $finding.ruleId to precise CLS advice", ({ finding, messageKey }) => {
    const [recommendation] = createPerformanceRecommendations({
      cls: stats(0.18),
      clsFindings: [{
        ...finding,
        evidence: {
          overallP75: 0.18,
          sampleCount: 100,
          evidenceSampleCount: 80,
          affectedSampleCount: 50,
          share: 0.625,
        },
      }],
    });

    expect(recommendation?.messageKey).toBe(messageKey);
  });
});
