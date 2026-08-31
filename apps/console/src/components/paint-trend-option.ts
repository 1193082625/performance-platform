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
    return {
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: [
                'FP',
                'FCP',
            ]
        },
        xAxis: {
            type: 'category',
            data: points.map(point => point.time),
        
            axisLabel: {
                formatter: formatPaintTrendTime,
                color: '#8da4c8',
            },
        
            axisLine: {
                lineStyle: {
                    color: '#285a9a',
                },
            },
        },
        
        yAxis: {
            type: 'value',
            name: '毫秒',
            min: 0,
        
            nameTextStyle: {
                color: '#8da4c8',
            },
        
            axisLabel: {
                color: '#8da4c8',
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