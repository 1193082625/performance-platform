import { describe, expect, it } from "vitest";

import {
  createMetricTrendSeries,
  createPaintTrendSeries,
} from "./trend-series.js";

describe("createPaintTrendSeries", () => {
  it("maps paint points to average FP and FCP series", () => {
    const result = createPaintTrendSeries(
      [
        {
          time: "2026-09-08T08:00:00.000Z",
          fp: {
            count: 10,
            average: 120,
            p50: 110,
            p75: 140,
            p90: 180,
          },
          fcp: {
            count: 10,
            average: 240,
            p50: 220,
            p75: 280,
            p90: 320,
          },
        },
      ],
      "average",
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.points).toEqual([
      {
        time: "2026-09-08T08:00:00.000Z",
        value: 120,
      },
    ]);
    expect(result[1]?.points[0]?.value).toBe(240);
  });

  it("preserves null values when mapping p75", () => {
    const result = createPaintTrendSeries(
      [
        {
          time: "2026-09-08T08:00:00.000Z",
          fp: {
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
          },
          fcp: {
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
          },
        },
      ],
      "p75",
    );

    expect(result[0]?.points[0]?.value).toBeNull();
    expect(result[1]?.points[0]?.value).toBeNull();
  });
});

describe("createMetricTrendSeries", () => {
  it("maps a generic metric series", () => {
    const result = createMetricTrendSeries({
      key: "lcp",
      label: "LCP",
      unit: "ms",
      color: "#ae66fa",
      statistic: "p75",
      points: [
        {
          time: "2026-09-08T08:00:00.000Z",
          stats: {
            count: 12,
            average: 1800,
            p50: 1700,
            p75: 2200,
            p90: 2800,
          },
        },
      ],
    });

    expect(result.points).toEqual([
      {
        time: "2026-09-08T08:00:00.000Z",
        value: 2200,
      },
    ]);
  });
});