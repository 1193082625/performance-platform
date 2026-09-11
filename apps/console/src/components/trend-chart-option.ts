import { type ComposeOption, type GridComponentOption, type LegendComponentOption, type LineSeriesOption, type TooltipComponentOption } from "echarts";
import type { TrendSeries } from "./trend-series";
import type { MetricUnit } from "@performance-platform/protocol";


export type TrendChartOption = ComposeOption<
    | LineSeriesOption
    | GridComponentOption
    | LegendComponentOption
    | TooltipComponentOption
>;

function collectTimes(series: TrendSeries[]): string[] {
    return [
        ...new Set(
            series.flatMap((item) => item.points.map((point) => point.time))
        ),
    ].sort((left, right) => Date.parse(left) - Date.parse(right))
}

export interface TrendTimeLabels {
    now: string
    hoursAgo(count: number): string
    daysAgo(count: number): string
}

const DEFAULT_TIME_LABELS: TrendTimeLabels = {
    now: "NOW",
    hoursAgo: (count) => `${count}H AGO`,
    daysAgo: (count) => `${count}D AGO`,
}

function formatTime(value: string, endTime: string, labels: TrendTimeLabels) {
    const differenceInHours = Math.max(
        0,
        Math.round(
            (new Date(endTime).getTime() - new Date(value).getTime()) / 3_600_000
        )
    )

    if (differenceInHours === 0) return labels.now
    if (differenceInHours < 24) return labels.hoursAgo(differenceInHours)

    return labels.daysAgo(Math.round(differenceInHours / 24))
}

function formatAxisValue(value: number, unit: MetricUnit): string {
    switch (unit) {
        case 'ms':
            return value >= 1_000
                ? `${(value / 1_000).toFixed(1)} s`
                : `${Math.round(value)} ms`
        case "score":
            return value.toFixed(3)
        case "byte":
            return `${(value / 1024 / 1024).toFixed(0)} MiB`
    }
}

export function buildTrendChartOption(
    series: TrendSeries[],
    timeLabels: TrendTimeLabels = DEFAULT_TIME_LABELS,
): TrendChartOption {
    const times = collectTimes(series)
    const endTime = times.at(-1) ?? ""
    const unit = series[0]?.unit ?? "ms"

    return {
        animation: false,

        textStyle: {
            fontFamily: 'Rajdhani, "Arial Narrow", Arial, sans-serif',
            color: "#c0cee9",
        },

        tooltip: {
            trigger: 'axis',
            backgroundColor: "#061326",
            borderColor: '#175677',
            textStyle: {
                color: '#e2ecff'
            }
        },

        legend: {
            top: 3,
            left: 'center',
            itemWidth: 14,
            itemHeight: 4,
            icon: "roundRect",
            itemGap: 22,
            textStyle: {
                color: "#bfd2eb",
                fontSize: 12,
                fontFamily: "Arial, sans-serif",
            }
        },

        grid: {
            left: 43,
            right: 18,
            top: 44,
            bottom: 34,
            containLabel: true
        },

        xAxis: {
            type: "category",
            data: times,
            boundaryGap: false,

            axisLine: {
                lineStyle: {
                    color: "#245272",
                },
            },

            axisTick: {
                show: false,
            },

            axisLabel: {
                color: "#bdcde8",
                fontFamily: "Arial, sans-serif",
                formatter: (value: string) => formatTime(value, endTime, timeLabels),
                showMinLabel: true,
                showMaxLabel: true,
            },

            splitLine: {
                show: true,
                lineStyle: {
                    color: "#0b263c",
                    opacity: 0.7,
                },
            },
        },

        yAxis: {
            type: "value",
            min: 0,

            axisLabel: {
                color: "#bdcde8",
                fontFamily: "Arial, sans-serif",
                formatter: (value: number) => formatAxisValue(value, unit),
            },

            axisLine: {
                show: true,
                lineStyle: {
                  color: "#245272",
                },
            },

            splitLine: {
                lineStyle: {
                    color: "#0d283e",
                    opacity: 0.8,
                },
            },
        },
        series: series.map((item) => {
            const valuesByTime = new Map(
                item.points.map((point) => [point.time, point.value])
            );
            const valueCount = item.points.filter(
                (point) => point.value !== null,
            ).length;
            const hasMissingValues = valueCount < times.length;

            return {
                id: item.key,
                name: item.label,
                type: "line",
                data: times.map((time) => valuesByTime.get(time) ?? null),
                connectNulls: false,
                symbol: 'circle',
                showSymbol: valueCount === 1 || hasMissingValues,
                showAllSymbol: hasMissingValues,
                symbolSize: valueCount === 1 ? 7 : 4,

                lineStyle: {
                    width: 1.6,
                    color: item.color
                },
                itemStyle: {
                    color: item.color
                },
                areaStyle: item.unit === "byte"
                    ? {
                        color: item.color,
                        opacity: 0.12,
                    }
                    : undefined
            }
        })
    }
}
