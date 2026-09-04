import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    bytesToMebibytes,
    formatBytes,
} from './metric-value-format.js'

describe('metric value formatting', () => {
    it.each([
        [0, '0 B'],
        [1024, '1 KiB'],
        [1024 ** 2, '1 MiB'],
        [23_437_190, '22.35 MiB'],
        [4_395_630_592, '4.09 GiB'],
    ] as const)(
        'formats %s bytes as %s',
        (value, expected) => {
            expect(formatBytes(value)).toBe(expected)
        },
    )

    it.each([
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
        [-1],
    ])(
        'rejects invalid byte value %s',
        (value) => {
            expect(formatBytes(value)).toBe('—')
        },
    )

    it('converts bytes to mebibytes for charts', () => {
        expect(
            bytesToMebibytes(23_437_190),
        ).toBe(22.4)
    })
})