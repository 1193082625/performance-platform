import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    evaluateMemoryHealth,
} from './memory-health.js'

const MEBIBYTE = 1024 ** 2
const START = 1_000_000
const STEP = 5 * 60_000

function createSnapshots(
    usedHeapValues: readonly number[],
    heapLimit = 1024 * MEBIBYTE,
) {
    return usedHeapValues.map(
        (usedHeap, index) => ({
            observedAt: START + index * STEP,
            usedHeap,
            heapLimit,
        }),
    )
}

describe('evaluateMemoryHealth', () => {
    it('requires six samples covering at least 20 minutes', () => {
        const result = evaluateMemoryHealth(
            createSnapshots([
                100, 101, 102, 103, 104,
            ]),
        )

        expect(result.status).toBe('INSUFFICIENT_DATA')
        expect(result.reasons).toEqual([
            'INSUFFICIENT_SAMPLES',
        ])
    })

    it('rates stable low utilization as normal', () => {
        const result = evaluateMemoryHealth(
            createSnapshots([
                100, 100, 100, 100, 100, 100,
            ]),
        )

        expect(result.status).toBe('NORMAL')
        expect(result.reasons).toEqual([])
    })

    it('rates 70 percent utilization as warning', () => {
        const result = evaluateMemoryHealth(
            createSnapshots(
                [600, 600, 600, 600, 600, 700],
                1000,
            ),
        )

        expect(result.status).toBe('WARNING')
        expect(result.reasons).toContain(
            'HIGH_HEAP_PRESSURE',
        )
    })

    it('rates 90 percent utilization as critical', () => {
        const result = evaluateMemoryHealth(
            createSnapshots(
                [800, 800, 800, 800, 800, 900],
                1000,
            ),
        )

        expect(result.status).toBe('CRITICAL')
        expect(result.reasons).toContain(
            'HIGH_HEAP_PRESSURE',
        )
    })

    it('warns about sustained heap growth', () => {
        const result = evaluateMemoryHealth(
            createSnapshots([
                100 * MEBIBYTE,
                108 * MEBIBYTE,
                116 * MEBIBYTE,
                124 * MEBIBYTE,
                132 * MEBIBYTE,
                140 * MEBIBYTE,
            ]),
        )

        expect(result.status).toBe('WARNING')
        expect(result.reasons).toContain(
            'SUSTAINED_HEAP_GROWTH',
        )
    })

    it('rates severe sustained heap growth as critical', () => {
        const result = evaluateMemoryHealth(
            createSnapshots([
                100 * MEBIBYTE,
                130 * MEBIBYTE,
                160 * MEBIBYTE,
                190 * MEBIBYTE,
                220 * MEBIBYTE,
                240 * MEBIBYTE,
            ]),
        )

        expect(result.status).toBe('CRITICAL')
        expect(result.reasons).toContain(
            'SUSTAINED_HEAP_GROWTH',
        )
    })

    it('does not treat one isolated spike as sustained growth', () => {
        const result = evaluateMemoryHealth(
            createSnapshots([
                100 * MEBIBYTE,
                100 * MEBIBYTE,
                100 * MEBIBYTE,
                160 * MEBIBYTE,
                100 * MEBIBYTE,
                100 * MEBIBYTE,
            ]),
        )

        expect(result.status).toBe('NORMAL')
    })
})
