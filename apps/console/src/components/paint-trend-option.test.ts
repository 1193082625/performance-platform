import type { PaintSeriesPoint } from "@performance-platform/protocol";
import {
    describe,
    expect,
    it,
} from "vitest";

import {
    buildPaintTrendOption,
    formatPaintTrendTime,
} from './paint-trend-option.js'

const SERIES: PaintSeriesPoint[] = [
    {
        time: '2026-08-31T10:00:00.000Z',
        fp: {
            count: 2,
            average: 120.4,
            p50: 110,
            p75: 130,
            p90: 150,
        },

        fcp: {
            count: 2,
            average: 260.6,
            p50: 250,
            p75: 270,
            p90: 290,
        },
    },
    {
        time: '2026-08-31T11:00:00.000Z',

        fp: {
            count: 1,
            average: 135.5,
            p50: 135.5,
            p75: 135.5,
            p90: 135.5,
        },

        fcp: {
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
        },
    },
]

describe('buildPaintTrendOption', () => {
    
    it('build FP and FCP line series while preserving empty buckets', () => {
        
        const option = buildPaintTrendOption(SERIES)
        expect(option).toMatchObject({
            xAxis: {
                type: 'category',
            
                data: [
                    '2026-08-31T10:00:00.000Z',
                    '2026-08-31T11:00:00.000Z',
                ],
            
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
                
                    data: [
                        120,
                        136,
                    ],
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
                
                    data: [
                        261,
                        null,
                    ],
                },
            ],
        })
    })
    it('builds P75 trend series', () => {
        
        const option =
            buildPaintTrendOption(
                SERIES,
                'p75',
            )
    
        expect(option).toMatchObject({
            series: [
                {
                    name: 'FP',
                    data: [
                        130,
                        136,
                    ],
                },
    
                {
                    name: 'FCP',
                    data: [
                        270,
                        null,
                    ],
                },
            ],
        })
    })

    it('formats an ISO timestamp for the trend axis', () => {
        expect(
            formatPaintTrendTime(
                '2026-08-31T10:00:00.000Z',
            ),
        ).toBe('08-31 18:00')
    })
})