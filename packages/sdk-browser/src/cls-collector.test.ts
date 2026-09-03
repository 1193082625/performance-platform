import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    createClsCollector,
} from './cls-collector.js'
import type {
    ClsMetricLike,
} from './types/clsCollector.type.js'

function createHarness() {
    let callback:
        | ((metric: ClsMetricLike) => void)
        | undefined
    const onSample = vi.fn()
    const observeCls = vi.fn((listener) => {
        callback = listener
    })
    const collector = createClsCollector({
        timeOrigin: 1_000_000,
        observeCls,
        onSample,
    })

    return {
        collector,
        observeCls,
        onSample,
        emit(metric: ClsMetricLike) {
            if (callback === undefined) {
                throw new Error('CLS callback was not registered')
            }
            callback(metric)
        },
    }
}

describe('createClsCollector', () => {
    it('registers the CLS observer only once', () => {
        const { collector, observeCls } = createHarness()

        collector.start()
        collector.start()

        expect(observeCls).toHaveBeenCalledTimes(1)
    })

    it('converts the final CLS metric into a sample', () => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        emit({
            value: 0.084,
            lastEntryStartTime: 2_300.4,
        })

        expect(onSample).toHaveBeenCalledWith({
            type: 'web.vital.cls',
            occurredAt: 1_002_300,
            metricVersion: 'cls-v1',
            payload: {
                value: 0.084,
                unit: 'score',
            },
        })
    })

    it('reports at most one CLS sample per view', () => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        emit({ value: 0.04, lastEntryStartTime: 100 })
        emit({ value: 0.08, lastEntryStartTime: 200 })

        expect(onSample).toHaveBeenCalledTimes(1)
    })

    it('ignores callbacks after being destroyed', () => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        collector.destroy()
        emit({ value: 0.08, lastEntryStartTime: 200 })

        expect(onSample).not.toHaveBeenCalled()
    })

    it.each([
        { value: Number.NaN, lastEntryStartTime: 100 },
        { value: Number.POSITIVE_INFINITY, lastEntryStartTime: 100 },
        { value: -0.1, lastEntryStartTime: 100 },
        { value: 0.1, lastEntryStartTime: Number.NaN },
        { value: 0.1, lastEntryStartTime: -1 },
    ])('ignores an invalid CLS metric %#', (metric) => {
        const { collector, emit, onSample } = createHarness()

        collector.start()
        emit(metric)

        expect(onSample).not.toHaveBeenCalled()
    })

    it('does not throw when the CLS API is unavailable', () => {
        const collector = createClsCollector({
            timeOrigin: 1_000_000,
            onSample: vi.fn(),
        })

        expect(() => collector.start()).not.toThrow()
    })

    it('does not throw when CLS registration fails', () => {
        const collector = createClsCollector({
            timeOrigin: 1_000_000,
            observeCls: () => {
                throw new Error('CLS registration failed')
            },
            onSample: vi.fn(),
        })

        expect(() => collector.start()).not.toThrow()
    })
})
