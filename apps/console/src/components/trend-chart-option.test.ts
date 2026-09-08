import { describe, expect, it } from "vitest";

import { buildTrendChartOption } from "./trend-chart-option.js";
import type { TrendSeries } from "./trend-series.js";

describe("buildTrendChartOption", () => {
  it("uses real timestamps and values", () => {
    const series: TrendSeries[] = [
      {
        key: "fp",
        label: "FP",
        unit: "ms",
        color: "#09d9ea",
        points: [
          {
            time: "2026-09-08T09:00:00.000Z",
            value: 180,
          },
          {
            time: "2026-09-08T08:00:00.000Z",
            value: 120,
          },
        ],
      },
    ];

    const option = buildTrendChartOption(series);

    expect(option.xAxis).toMatchObject({
      data: [
        "2026-09-08T08:00:00.000Z",
        "2026-09-08T09:00:00.000Z",
      ],
    });

    expect(option.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "fp",
          name: "FP",
          data: [120, 180],
        }),
      ]),
    );
  });

  it("aligns separate series by timestamp", () => {
    const series: TrendSeries[] = [
      {
        key: "fp",
        label: "FP",
        unit: "ms",
        color: "#09d9ea",
        points: [
          {
            time: "2026-09-08T08:00:00.000Z",
            value: 120,
          },
          {
            time: "2026-09-08T09:00:00.000Z",
            value: 180,
          },
        ],
      },
      {
        key: "fcp",
        label: "FCP",
        unit: "ms",
        color: "#00baff",
        points: [
          {
            time: "2026-09-08T09:00:00.000Z",
            value: 300,
          },
        ],
      },
    ];

    const option = buildTrendChartOption(series);
    const chartSeries = option.series as Array<{
      id: string;
      data: Array<number | null>;
    }>;

    expect(chartSeries.find((item) => item.id === "fp")?.data).toEqual([
      120,
      180,
    ]);

    expect(chartSeries.find((item) => item.id === "fcp")?.data).toEqual([
      null,
      300,
    ]);
  });

  it("preserves null metric values", () => {
    const option = buildTrendChartOption([
      {
        key: "fp",
        label: "FP",
        unit: "ms",
        color: "#09d9ea",
        points: [
          {
            time: "2026-09-08T08:00:00.000Z",
            value: null,
          },
        ],
      },
    ]);

    expect(option.series).toEqual([
      expect.objectContaining({
        data: [null],
        connectNulls: false,
      }),
    ]);
  });

  it("returns an empty chart configuration for empty series", () => {
    const option = buildTrendChartOption([]);

    expect(option.series).toEqual([]);
    expect(option.xAxis).toMatchObject({
      data: [],
    });
  });
});