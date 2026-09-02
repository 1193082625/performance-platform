import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    shouldSampleSession,
} from './sampling'

describe('shouldSampleSession', () => {
    it('samples every session at rate 1', () => {
        expect(
            shouldSampleSession(
                'session-a',
                1,
            ),
        ).toBe(true)
    })

    it('makes a stable decision from the session ID', () => {
        expect(
            shouldSampleSession(
                'session-0',
                0.5,
            ),
        ).toBe(true)

        expect(
            shouldSampleSession(
                'session-a',
                0.5,
            ),
        ).toBe(false)
    })

    it('keeps an included session when the rate increases', () => {
        expect(
            shouldSampleSession(
                'session-a',
                0.5,
            ),
        ).toBe(false)

        expect(
            shouldSampleSession(
                'session-a',
                0.75,
            ),
        ).toBe(true)
    })

    it.each([
        0,
        -0.1,
        1.1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
    ])(
        'rejects invalid sample rate %s',
        (sampleRate) => {
            expect(() => {
                shouldSampleSession(
                    'session-a',
                    sampleRate,
                )
            }).toThrow(RangeError)
        },
    )
})