import {
    describe,
    expect,
    it,
} from 'vitest'

import type {
    PaintStats,
} from '@performance-platform/protocol'

import {
    calculatePaintScore,
} from './paint-score.js'

function createStats(
    p75: number,
): PaintStats {
    return {
        count: 100,
        average: p75,
        p50: p75,
        p75,
        p90: p75,
    }
}

describe('calculatePaintScore', () => {
    it('scores good-threshold FP and FCP values as 90', () => {
        const result = calculatePaintScore({
            fp: createStats(1_000),
            fcp: createStats(1_800),
        })

        expect(result).toEqual({
            value: 90,
            status: 'good',
            version: 'paint-v1',

            components: {
                fp: 90,
                fcp: 90,
            },
        })
    })

    it.each([
        {
            name: 'ideal values',
            fp: 0,
            fcp: 0,
            expectedValue: 100,
            expectedStatus: 'good',
        },
    
        {
            name: 'poor thresholds',
            fp: 2_000,
            fcp: 3_000,
            expectedValue: 50,
            expectedStatus:
                'needs-improvement',
        },
    
        {
            name: 'double poor thresholds',
            fp: 4_000,
            fcp: 6_000,
            expectedValue: 0,
            expectedStatus: 'poor',
        },
    ])(
        'scores $name correctly',
        ({
            fp,
            fcp,
            expectedValue,
            expectedStatus,
        }) => {
            const result =
                calculatePaintScore({
                    fp: createStats(fp),
                    fcp: createStats(fcp),
                })
    
            expect(result?.value).toBe(
                expectedValue,
            )
    
            expect(result?.status).toBe(
                expectedStatus,
            )
        },
    )

    it('returns null when P75 data is unavailable', () => {
        const fp = {
            ...createStats(0),
            count: 0,
            average: null,
            p50: null,
            p75: null,
            p90: null,
        }
    
        const result = calculatePaintScore({
            fp,
            fcp: createStats(1_800),
        })
    
        expect(result).toBeNull()
    })
})