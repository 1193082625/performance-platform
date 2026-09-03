import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    createInpCollector,
} from './inp-collector.js'
import type {
    InpMetricLike,
} from './types/inpCollector.type.js'

function createHarness() {
    let callback:
        | ((metric: InpMetricLike) => void)
        | undefined
    const onSample = vi.fn()
    const observeInp = vi.fn((listener) => {
        callback = listener
    })
    const collector = createInpCollector({
        timeOrigin: 1_000_000,
        observeInp,
        onSample,
    })

    return {
        collector,
        observeInp,
        onSample,
        emit(metric: InpMetricLike) {
            if (callback === undefined) {
                throw new Error('INP callback was not registered')
            }
            callback(metric)
        },
    }
}

describe('createInpCollector', () => {
    it('registers the INP observer only once', () => {
        const { collector, observeInp } = createHarness()

        collector.start()
        collector.start()

        expect(observeInp).toHaveBeenCalledTimes(1)
    })

    it('converts the final INP metric into a sample', () => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        emit({
            value: 248.4,
            interactionStartTime: 2_300.4,
        })

        expect(onSample).toHaveBeenCalledWith({
            type: 'web.vital.inp',
            occurredAt: 1_002_300,
            metricVersion: 'inp-v1',
            payload: {
                value: 248.4,
                unit: 'ms',
            },
        })
    })

    it('reports at most one INP sample per view', () => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        emit({ value: 120, interactionStartTime: 100 })
        emit({ value: 240, interactionStartTime: 200 })

        expect(onSample).toHaveBeenCalledTimes(1)
    })

    it('ignores callbacks after being destroyed', () => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        collector.destroy()
        emit({ value: 120, interactionStartTime: 100 })

        expect(onSample).not.toHaveBeenCalled()
    })

    it.each([
        { value: Number.NaN, interactionStartTime: 100 },
        { value: Number.POSITIVE_INFINITY, interactionStartTime: 100 },
        { value: -1, interactionStartTime: 100 },
        { value: 100, interactionStartTime: Number.NaN },
        { value: 100, interactionStartTime: -1 },
    ])('ignores an invalid INP metric %#', (metric) => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        emit(metric)

        expect(onSample).not.toHaveBeenCalled()
    })

    it('does not throw when the INP API is unavailable', () => {
        const collector = createInpCollector({
            timeOrigin: 1_000_000,
            onSample: vi.fn(),
        })

        expect(() => collector.start()).not.toThrow()
    })

    it('does not throw when INP registration fails', () => {
        const collector = createInpCollector({
            timeOrigin: 1_000_000,
            observeInp: () => {
                throw new Error('INP registration failed')
            },
            onSample: vi.fn(),
        })

        expect(() => collector.start()).not.toThrow()
    })
})
