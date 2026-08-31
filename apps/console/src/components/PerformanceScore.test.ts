import {
    describe,
    it,
    expect,
} from 'vitest'

import { mount } from '@vue/test-utils'

import PerformanceScore from './PerformanceScore.vue'

describe('PerformanceScore', () => {
    it('shows the overall score and its components', () => {
        const wrapper = mount(
            PerformanceScore,
            {
                props: {
                    score: {
                        value: 90,
                        status: 'good',
                        version: 'paint-v1',
                        components: {
                            fp: 90,
                            fcp: 90,
                        }
                    }
                }
            }
        )

        expect(wrapper.get('[data-testid="overall-score"]').text()).toBe('90')
        expect(wrapper.text()).toContain('综合性能评分')
        expect(wrapper.text()).toContain('状态良好')
        expect(wrapper.text()).toContain('FP 90')
        expect(wrapper.text()).toContain('FCP 90')
    })
    it('shows an unavailable state when score is null', () => {
        const wrapper = mount(
            PerformanceScore,
            {
                props: {
                    score: null,
                },
            },
        )
    
        expect(wrapper.text()).toContain(
            '综合性能评分',
        )
        expect(wrapper.text()).toContain(
            '暂无评分',
        )
        expect(
            wrapper
                .find('[data-testid="overall-score"]')
                .exists(),
        ).toBe(false)
    })
    it('shows the needs-improvement status', () => {
        const wrapper = mount(
            PerformanceScore,
            {
                props: {
                    score: {
                        value: 68,
                        status: 'needs-improvement',
                        version: 'paint-v1',
                        components: {
                            fp: 75,
                            fcp: 65,
                        }
                    }
                }
            }
        )
        expect(wrapper.text()).toContain('需要改进')
        expect(wrapper.attributes('data-status')).toBe('needs-improvement')
    })
})