import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import ConsoleShell from './ConsoleShell.vue'
import { createConsoleRouter } from './router.js'

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
async function setup(
    failApps = false,
    keyState: 'active' | 'never-created' | 'all-revoked' = 'active',
    initialPath = '/projects',
) {
    const fetcher = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const path = new URL(String(input)).pathname
            if (path.endsWith('/auth/me'))
                return response({
                    user: { id: 'u1', name: 'Demo', phone: '13800000000' },
                })
            if (path.endsWith('/auth/logout')) return response({})
            if (path.endsWith('/projects')) return response({ projects })
            if (path.endsWith('/keys')) {
                return response({
                    keys:
                        keyState === 'never-created'
                            ? []
                            : [
                              {
                                  id: 'key-1',
                                  prefix: 'ppk_live_',
                                  createdAt: '2030-01-01T00:00:00.000Z',
                                  revokedAt:
                                      keyState === 'active'
                                          ? null
                                          : '2030-01-02T00:00:00.000Z',
                              },
                          ]
                })
            }
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
    const router = createConsoleRouter(createMemoryHistory())
    await router.push(initialPath)
    await router.isReady()
    const wrapper = mount(ConsoleShell, {
        global: {
            plugins: [router],
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
    return { wrapper, fetcher, router }
}
afterEach(() => vi.unstubAllGlobals())

test('starts at projects without fetching apps or mounting monitoring', async () => {
    const { wrapper, fetcher } = await setup()
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
    const router = createConsoleRouter(createMemoryHistory())
    await router.push('/projects')
    await router.isReady()
    const wrapper = mount(ConsoleShell, { global: { plugins: [router] } })
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
    const { wrapper, fetcher, router } = await setup()
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
    await wrapper.get('.app-card__entry').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="monitor"]').text()).toBe('p2/web')
    expect(router.currentRoute.value.path).toBe('/projects/p2/apps/web/monitor')
    wrapper.findComponent({ name: 'App' }).vm.$emit('go-apps')
    await flushPromises()
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('p2 应用')
    wrapper.unmount()
})

test('restores the selected app from a direct monitoring URL', async () => {
    const { wrapper, router } = await setup(
        false,
        'active',
        '/projects/p2/apps/web/monitor',
    )
    await flushPromises()

    expect(wrapper.get('[data-testid="monitor"]').text()).toBe('p2/web')
    expect(router.currentRoute.value.name).toBe('monitor')
    wrapper.unmount()
})

test('shows a retry state instead of an empty list when apps fail', async () => {
    const { wrapper } = await setup(true)
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('重新加载')
    expect(wrapper.text()).not.toContain('这个项目还没有应用')
    wrapper.unmount()
})

test('returns to the project list from the application list', async () => {
    const { wrapper, router } = await setup()
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('p1 应用')

    await wrapper.get('.back-button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('你的项目')
    expect(router.currentRoute.value.path).toBe('/projects')
    expect(wrapper.findAll('.selection-card')).toHaveLength(2)
    wrapper.unmount()
})

test('shows historical monitoring only after previously created keys were all revoked', async () => {
    const { wrapper } = await setup(false, 'all-revoked')
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()

    expect(wrapper.get('.app-card__entry').text()).toContain('配置 App Key')
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)

    await wrapper.get('.app-card__entry').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="dialog"]').text()).toContain('App Key')

    await wrapper.get('.key-dialog__close').trigger('click')
    await wrapper.get('.history-button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="monitor"]').text()).toBe('p1/web')
    wrapper.unmount()
})

test('does not offer monitoring when an application has never created an App Key', async () => {
    const { wrapper } = await setup(false, 'never-created')
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()

    expect(wrapper.get('.app-card__entry').text()).toContain('配置 App Key')
    expect(wrapper.find('.history-button').exists()).toBe(false)
    expect(wrapper.find('[data-testid="monitor"]').exists()).toBe(false)
    wrapper.unmount()
})

test('creates an app in the selected project without automatically opening monitoring', async () => {
    const { wrapper, fetcher } = await setup()
    await flushPromises()
    await wrapper.findAll('.selection-card')[1]!.trigger('click')
    await flushPromises()
    await wrapper.get('.create-entry-button').trigger('click')
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
    const { wrapper, fetcher } = await setup()
    await flushPromises()
    await wrapper.get('.selection-card').trigger('click')
    await flushPromises()
    await wrapper.get('.app-card__entry').trigger('click')
    await flushPromises()
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
