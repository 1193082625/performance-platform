import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'
import ConsoleShell from './ConsoleShell.vue'

const projects = [
    { id: 'p1', name: '商店', description: '面向客户' },
    { id: 'p2', name: '后台', description: '' },
]
const app = (projectId: string) => ({
    id: projectId + '-id',
    projectId,
    appId: 'web',
    name: projectId + ' 应用',
    platform: 'web',
})
const response = (body: unknown) => ({ ok: true, json: async () => body })
function setup(failApps = false) {
    const fetcher = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const path = new URL(String(input)).pathname
            if (path.endsWith('/auth/me'))
                return response({
                    user: { id: 'u1', name: 'Demo', phone: '13800000000' },
                })
            if (path.endsWith('/auth/logout')) return response({})
            if (path.endsWith('/projects')) return response({ projects })
            if (path.endsWith('/apps')) {
                if (failApps) throw new Error('offline')
                const projectId = path.split('/')[3]!
                if (init?.method === 'POST')
                    return response({
                        app: { ...app(projectId), name: '新应用' },
                    })
                return response({ apps: [app(projectId)] })
            }
            throw new Error('unexpected request: ' + path)
        },
    )
    vi.stubGlobal('fetch', fetcher)
    const wrapper = mount(ConsoleShell, {
        global: {
            stubs: {
                App: {
                    name: 'App',
                    props: ['scope'],
                    template:
                        '<div data-testid="monitor">{{ scope.projectId }}/{{ scope.appId }}</div>',
                },
            },
        },
    })
    return { wrapper, fetcher }
}
afterEach(() => vi.unstubAllGlobals())

test('starts at projects without fetching apps or mounting monitoring', async () => {
    const { wrapper, fetcher } = setup()
    await flushPromises()
    expect(wrapper.text()).toContain('你的项目')
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)
    expect(
        fetcher.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual(['/monitor-api/auth/me', '/monitor-api/projects'])
    wrapper.unmount()
})

test('moves to projects and loads them after Login authenticates', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname
        if (path.endsWith('/auth/me')) return { ok: false, status: 401 }
        if (path.endsWith('/auth/login'))
            return response({
                user: { id: 'u1', name: 'Demo', phone: '13800000000' },
            })
        if (path.endsWith('/projects')) return response({ projects })
        throw new Error('unexpected request: ' + path)
    })
    vi.stubGlobal('fetch', fetcher)
    const wrapper = mount(ConsoleShell)
    await flushPromises()

    await wrapper.get('input[autocomplete="tel"]').setValue('13800000000')
    await wrapper
        .get('input[autocomplete="current-password"]')
        .setValue('password')
    await wrapper.get('.stack-form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('你的项目')
    expect(wrapper.text()).toContain('商店')
    expect(
        fetcher.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual([
        '/monitor-api/auth/me',
        '/monitor-api/auth/login',
        '/monitor-api/projects',
    ])
    wrapper.unmount()
})

test('requires project then app selection, and clears scope when returning', async () => {
    const { wrapper, fetcher } = setup()
    await flushPromises()
    await wrapper.findAll('.selection-card')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('p2 应用')
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)
    expect(
        fetcher.mock.calls.some(([url]) =>
            String(url).endsWith('/projects/p2/apps'),
        ),
    ).toBe(true)
    await wrapper.get('.selection-card').trigger('click')
    expect(wrapper.get('[data-testid="monitor"]').text()).toBe('p2/web')
    wrapper.findComponent({ name: 'App' }).vm.$emit('go-apps')
    await flushPromises()
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('p2 应用')
    wrapper.unmount()
})

test('shows a retry state instead of an empty list when apps fail', async () => {
    const { wrapper } = setup(true)
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('重新加载')
    expect(wrapper.text()).not.toContain('这个项目还没有应用')
    wrapper.unmount()
})

test('creates an app in the selected project without automatically opening monitoring', async () => {
    const { wrapper, fetcher } = setup()
    await flushPromises()
    await wrapper.findAll('.selection-card')[1]!.trigger('click')
    await flushPromises()
    await wrapper.get('.selection-heading button').trigger('click')
    await wrapper.get('.entry-form input').setValue('新应用')
    await wrapper.get('.entry-form').trigger('submit')
    await flushPromises()
    const call = fetcher.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(String(call[0])).toContain('/projects/p2/apps')
    expect(wrapper.text()).toContain('新应用')
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)
    wrapper.unmount()
})

test('returns to login after the monitoring page emits sign-out', async () => {
    const { wrapper, fetcher } = setup()
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    wrapper.findComponent({ name: 'App' }).vm.$emit('sign-out')
    await flushPromises()
    expect(wrapper.text()).toContain('登录监控控制台')
    expect(
        fetcher.mock.calls.some(
            ([url, init]) =>
                String(url).endsWith('/monitor-api/auth/logout') &&
                init?.method === 'POST',
        ),
    ).toBe(true)
    wrapper.unmount()
})
