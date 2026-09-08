import type { MetricSeriesPoint, MetricUnit, PaintSeriesPoint } from "@performance-platform/protocol"

export type TrendStatistic = 'average' | 'p75'

export interface TrendPoint {
    time: string
    value: number | null
}

export interface TrendSeries {
    key: string
    label: string
    unit: MetricUnit
    color: string
    points: TrendPoint[]
}

export function createPaintTrendSeries(
    points: PaintSeriesPoint[],
    statistic: TrendStatistic,
): TrendSeries[] {
    return [
        {
          key: "fp",
          label: "FP",
          unit: "ms",
          color: "#09d9ea",
          points: points.map((point) => ({
            time: point.time,
            value: point.fp[statistic],
          })),
        },
        {
          key: "fcp",
          label: "FCP",
          unit: "ms",
          color: "#00baff",
          points: points.map((point) => ({
            time: point.time,
            value: point.fcp[statistic],
          })),
        },
    ];
}

interface CreateMetricTrendSeriesOptions {
    key: string
    label: string
    unit: MetricUnit
    color: string
    points: MetricSeriesPoint[]
    statistic: TrendStatistic
}

export function createMetricTrendSeries(
    options: CreateMetricTrendSeriesOptions
): TrendSeries {
    return {
      key: options.key,
      label: options.label,
      unit: options.unit,
      color: options.color,
      points: options.points.map((point) => ({
        time: point.time,
        value: point.stats[options.statistic],
      })),
    };
}