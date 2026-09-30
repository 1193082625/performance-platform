import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import Header from './Header.vue'

function mountHeader() {
    return mount(Header, {
        props: {
            selectedApp: {
                id: 'app-row',
                projectId: 'project-1',
                appId: 'store-web',
                name: '商城 Web',
                platform: 'web',
            },
            userName: 'Demo',
            totalSamples: 12,
            alertCount: 0,
            range: '24h',
        },
    })
}

test('emits the parent-owned range instead of keeping a second range state', async () => {
    const wrapper = mountHeader()
    await wrapper.get('.range-tabs button:nth-child(3)').trigger('click')
    expect(wrapper.emitted('select-range')).toEqual([['7d']])
})

test('emits navigation and sign-out events from actual button clicks', async () => {
    const wrapper = mountHeader()
    await wrapper.get('.secondary').trigger('click')
    await wrapper.get('.workspace-account button').trigger('click')
    expect(wrapper.get('.sign-out-button').attributes('aria-label')).toBe('退出登录')
    expect(wrapper.get('.sign-out-button').find('svg').exists()).toBe(true)
    expect(wrapper.emitted('go-apps')).toEqual([[]])
    expect(wrapper.emitted('sign-out')).toEqual([[]])
})
