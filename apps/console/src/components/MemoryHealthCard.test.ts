import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MemoryHealthCard from './MemoryHealthCard.vue'
import type { MemoryHealthAssessment } from '@performance-platform/protocol'

function assessment(
    status: 'NORMAL' | 'WARNING' | 'CRITICAL',
): MemoryHealthAssessment {
    return {
        status,
        reasons: status === 'NORMAL'
            ? []
            : ['SUSTAINED_HEAP_GROWTH'],
        sampleCount: 6,
        window: { from: 1, to: 2 },
        latest: { usedHeap: 700, heapLimit: 1000, utilization: 0.7 },
        growth: { absolute: 40 * 1024 ** 2, ratio: 0.4, increasingTransitionRatio: 1 },
    }
}

describe('MemoryHealthCard', () => {
    it.each(['NORMAL', 'WARNING', 'CRITICAL'] as const)(
        'shows %s status prominently',
        (status) => {
            const wrapper = mount(MemoryHealthCard, {
                props: { assessment: assessment(status), loading: false, error: null },
            })

            expect(wrapper.attributes('data-status')).toBe(status)
            expect(wrapper.text()).toContain(status)
        },
    )

    it('explains when evidence is insufficient', () => {
        const wrapper = mount(MemoryHealthCard, {
            props: {
                assessment: {
                    status: 'INSUFFICIENT_DATA',
                    reasons: ['INSUFFICIENT_SAMPLES'],
                    sampleCount: 3,
                    window: { from: 1, to: 2 },
                    latest: null,
                    growth: null,
                },
                loading: false,
                error: null,
            },
        })

        expect(wrapper.text()).toContain('样本不足（3/6）')
    })
})
