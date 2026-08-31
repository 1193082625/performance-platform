import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    mount,
} from '@vue/test-utils'

import MetricsRangeSelector from './MetricsRangeSelector.vue'

describe('MetricsRangeSelector', () => {
    it('shows all ranges and marks the current range as selected', () => {
        const wrapper = mount(
            MetricsRangeSelector,
            {
                props: {
                    range: '24h',
                },
            },
        )

        const buttons = wrapper.findAll('button')

        expect(
            buttons.map(
                button => button.text(),
            ),
        ).toEqual([
            '1h',
            '24h',
            '7d',
            '30d',
        ])

        expect(
            wrapper
                .get('button[aria-pressed="true"]')
                .text(),
        ).toBe('24h')
    })
    it('emits the selected range when a button is clicked', async () => {
        const wrapper = mount(
            MetricsRangeSelector,
            {
                props: {
                    range: '24h',
                },
            },
        )
    
        const sevenDayButton =
            wrapper
                .findAll('button')
                .find(
                    button =>
                        button.text() === '7d',
                )
    
        expect(
            sevenDayButton,
        ).toBeDefined()
    
        await sevenDayButton!.trigger('click')
    
        expect(
            wrapper.emitted('select'),
        ).toEqual([
            ['7d'],
        ])
    })
})