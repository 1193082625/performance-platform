import { describe, it, expect, } from 'vitest'
import type { MetricEventV2 } from './types'

const baseEvent = {
    schemaVersion: '2.0',
    eventId: '075f9a46-f934-45e3-b355-e20490e90bb4',
    timestamp: Date.UTC(2026, 8, 2, 10, 0, 0),
    sampleRate: 0.5,
    metricVersion: 'test-v1',

    application: {
        id: 'demo-web',
        version: '0.1.0+test',
        environment: 'test',
    },

    runtime: {
        platform: 'web',
        sdk: {
            name: '@performance-platform/browser',
            version: '0.1.0',
        },
    },

    session: {
        sessionId: 'session-test-1',
        viewId: 'view-test-1',
    },
} as const

// 可以把 satisfies 理解为：
// 请 ts 检查左边这个对象是否满足 MetricsEventV2 的要求，但不要强行把它转换成 MetricEventV2
// 它只在编译阶段工作，运行时不存在

const lcpEvent = {
    ...baseEvent,
    type: 'web.vital.lcp',
    payload: {
        value: 1_800,
        unit: 'ms',
    },
} satisfies MetricEventV2

const clsEvent = {
    ...baseEvent,
    type: 'web.vital.cls',
    payload: {
      value: 0.12,
      unit: 'score',
    }
} satisfies MetricEventV2

const memoryEvent = {
    ...baseEvent,
    type: 'web.memory.used_heap',
    payload: {
        value: 78,
        unit: 'byte'
    }
} satisfies MetricEventV2

describe('MetricEventV2 type contract', () => {
    it('accepts valid metric and unit combinations', () => {
        expect(lcpEvent.payload.unit).toBe('ms')
        expect(clsEvent.payload.unit).toBe('score')
        expect(memoryEvent.payload.unit).toBe('byte')
    })
    it('rejects invalid unit', () => {
        const invalidClsMeasurement = {
            type: 'web.vital.cls',
            payload: {
                value: 0.12,
                unit: 'byte'
            },
        } as const

        // @ts-expect-error CLS 必须使用 score，不能使用 byte
        const invalidClsEvent: MetricEventV2 = {
            ...baseEvent,
            ...invalidClsMeasurement,
        }
        expect(invalidClsEvent.type).toBe('web.vital.cls')
    })
    it('must have sampleRate', () => {
        const {
            sampleRate: _sampleRate,
            ...baseWithoutSampleRate
        } = baseEvent

        /**
         * @ts-expect-error：
         *  它表示，我知道下一行会报错，而且我就是要验证它会报错
         */

        // @ts-expect-error MetricEventV2 必须携带 sampleRate
        const eventWithoutSampleRate: MetricEventV2 = {
            ...baseWithoutSampleRate,
            type: 'web.vital.lcp',
            payload: {
                value: 1_800,
                unit: 'ms'
            }
        }
    })
})