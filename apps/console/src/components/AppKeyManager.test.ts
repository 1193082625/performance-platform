import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppKeyManager from './AppKeyManager.vue'

const app = {
  id: 'app-row',
  projectId: 'project-1',
  appId: 'store-web',
  name: '商城 Web',
  platform: 'web',
}

describe('AppKeyManager', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists, creates, and revokes keys through the selected application scope', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            keys: [{ id: 'old-key', prefix: 'ppk_old_', createdAt: '2030-01-01T00:00:00.000Z', revokedAt: null }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            key: { id: 'new-key', prefix: 'ppk_new_', createdAt: '2030-01-02T00:00:00.000Z', revokedAt: null, plainText: 'ppk_live_secret' },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(AppKeyManager, { props: { projectId: 'project-1', app } })
    await flushPromises()
    expect(wrapper.text()).toContain('ppk_old_••••')

    await wrapper.get('.key-dialog__actions button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('ppk_live_secret')
    expect(wrapper.text()).toContain('ppk_new_••••')

    await wrapper.get('.key-row .danger').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已停用')

    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      '/monitor-api/projects/project-1/apps/store-web/keys',
      '/monitor-api/projects/project-1/apps/store-web/keys',
      '/monitor-api/projects/project-1/apps/store-web/keys/new-key',
    ])
  })
})
