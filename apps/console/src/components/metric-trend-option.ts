import type {
    MetricSeriesPoint,
    MetricUnit,
} from '@performance-platform/protocol'

import type {
    LineSeriesOption,
} from 'echarts/charts'
import type {
    GridComponentOption,
    TooltipComponentOption,
} from 'echarts/components'
import type {
    ComposeOption,
} from 'echarts/core'
import { bytesToMebibytes } from './metric-value-format.js'

export type MetricTrendOption = ComposeOption<
    | LineSeriesOption
    | GridComponentOption
    | TooltipComponentOption
>

export type MetricTrendStatistic =
    | 'average'
    | 'p75'

export interface BuildMetricTrendOptionInput {
    points: MetricSeriesPoint[]
    label: string
    unit: MetricUnit
    statistic: MetricTrendStatistic
    color?: string
}

export function formatRelativeMetricTrendTime(
    value: string,
    endValue: string,
): string {
    const differenceInHours = Math.max(
        0,
        Math.round(
            (
                new Date(endValue).getTime()
                - new Date(value).getTime()
            ) / 3_600_000,
        ),
    )

    if (differenceInHours === 0) {
        return 'NOW'
    }

    if (differenceInHours < 24) {
        return `${differenceInHours}H AGO`
    }

    return `${Math.round(differenceInHours / 24)}D AGO`
}

function formatUnit(
    unit: MetricUnit,
): string {
    switch (unit) {
        case 'ms':
            return '毫秒'
        case 'score':
            return '分数'
        case 'byte':
            return 'MiB'
    }
}

function formatMetricValue(
    value: number | null,
    unit: MetricUnit,
): number | null {
    if (value === null) {
        return null
    }

    switch (unit) {
        case 'ms':
            return Math.round(value)
        case 'score':
            return Number(value.toFixed(3))
        case 'byte':
            return bytesToMebibytes(value)
    }
}

export function buildMetricTrendOption(
    input: BuildMetricTrendOptionInput,
): MetricTrendOption {
    const endTime = input.points.at(-1)?.time ?? ''
    const color = input.color ?? '#48dcff'

    return {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(3, 13, 31, 0.94)',
            borderColor: color,
            textStyle: {
                color: '#dcecff',
            },
        },
        grid: {
            left: 48,
            right: 18,
            top: 30,
            bottom: 30,
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: input.points.map(
                point => point.time,
            ),
            axisLabel: {
                formatter: (value: string) =>
                    formatRelativeMetricTrendTime(
                        value,
                        endTime,
                    ),
                color: '#8da4c8',
                showMinLabel: true,
                showMaxLabel: true,
            },
            axisLine: {
                lineStyle: {
                    color: '#285a9a',
                },
            },
            axisTick: {
                show: false,
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(72, 220, 255, 0.06)',
                },
            },
        },
        yAxis: {
            type: 'value',
            name: formatUnit(input.unit),
            min: 0,
            splitNumber: 2,
            nameTextStyle: {
                color: '#8da4c8',
            },
            axisLabel: {
                color: '#8da4c8',
            },
            axisLine: {
                show: false,
            },
            axisTick: {
                show: false,
            },
            splitLine: {
                lineStyle: {
                    color: 'rgba(72, 220, 255, 0.12)',
                },
            },
        },
        series: [
            {
                name: input.label,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                connectNulls: false,
                lineStyle: {
                    color,
                    width: 3,
                    shadowColor: color,
                    shadowBlur: 8,
                },
                itemStyle: {
                    color,
                },
                areaStyle: {
                    color,
                    opacity: 0.08,
                },
                data: input.points.map(
                    point => formatMetricValue(
                        point.stats[input.statistic],
                        input.unit,
                    ),
                ),
            },
        ],
    }
}
