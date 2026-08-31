import type {
    PaintSeriesPoint,
    PaintStats
} from '@performance-platform/protocol'

import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption } from 'echarts/components'
import type { ComposeOption } from 'echarts/core'

export type PaintTrendOption = ComposeOption<
    | LineSeriesOption
    | GridComponentOption
    | LegendComponentOption
    | TooltipComponentOption
>

export type PaintTrendStatistic =
    | 'average'
    | 'p75'

export function formatPaintTrendTime(
    value: string,
): string {
    const parts = new Intl.DateTimeFormat(
        'zh-CN',
        {
            timeZone: 'Asia/Shanghai',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        },
    ).formatToParts(new Date(value))

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find(part => part.type === type)?.value ?? ''

    return [
        getPart('month'),
        getPart('day'),
    ].join('-') + ' ' + [
        getPart('hour'),
        getPart('minute'),
    ].join(':')
}

export function formatRelativePaintTrendTime(
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

function getRoundedValue(
    stats: PaintStats,
    statistic: PaintTrendStatistic,
): number | null {
    const value =
        stats[statistic]

    if (value === null) {
        return null
    }

    return Math.round(value)
}    

export function buildPaintTrendOption(
    points: PaintSeriesPoint[],
    statistic: PaintTrendStatistic = 'average',
): PaintTrendOption {
    const endTime = points.at(-1)?.time ?? ''

    return {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(3, 13, 31, 0.94)',
            borderColor: '#1763a7',
            textStyle: {
                color: '#dcecff',
            },
        },
        legend: {
            data: [
                'FP',
                'FCP',
            ],
            bottom: 0,
            itemWidth: 18,
            itemHeight: 8,
            textStyle: {
                color: '#8296bb',
            },
        },
        grid: {
            left: 48,
            right: 18,
            top: 30,
            bottom: 46,
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: points.map(point => point.time),
        
            axisLabel: {
                formatter: (value: string) =>
                    formatRelativePaintTrendTime(
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
            name: '毫秒',
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
                name: 'FP',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
            
                lineStyle: {
                    color: '#48dcff',
                    width: 3,
                    shadowColor: '#48dcff',
                    shadowBlur: 8,
                },
            
                itemStyle: {
                    color: '#48dcff',
                },

                areaStyle: {
                    color: 'rgba(72, 220, 255, 0.08)',
                },
            
                data: points.map(
                    point =>
                        getRoundedValue(
                            point.fp,
                            statistic,
                        ),
                ),
            },
            {
                name: 'FCP',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
            
                lineStyle: {
                    color: '#8d7cff',
                    width: 3,
                    shadowColor: '#8d7cff',
                    shadowBlur: 8,
                },
            
                itemStyle: {
                    color: '#8d7cff',
                },

                areaStyle: {
                    color: 'rgba(141, 124, 255, 0.07)',
                },
            
                data: points.map(
                    point =>
                        getRoundedValue(
                            point.fcp,
                            statistic,
                        ),
                ),
            },
        ]
    }
}
