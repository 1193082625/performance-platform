export interface ProjectAppKey {
  id: string
  prefix: string
  createdAt: string
  revokedAt: string | null
}

export interface CreatedProjectAppKey extends ProjectAppKey {
  plainText: string
}

interface ApiOptions {
  baseUrl: string
  fetch: typeof globalThis.fetch
}

function keyPath(projectId: string, appId: string): string {
  return `/monitor-api/projects/${encodeURIComponent(projectId)}/apps/${encodeURIComponent(appId)}/keys`
}

async function request<T>(
  options: ApiOptions,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await options.fetch(new URL(path, options.baseUrl).toString(), {
    credentials: 'include',
    headers: { accept: 'application/json', ...init.headers },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`Application key request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export function createProjectAppKeyApi(options: ApiOptions) {
  return {
    async list(projectId: string, appId: string): Promise<ProjectAppKey[]> {
      const response = await request<{ keys: ProjectAppKey[] }>(
        options,
        keyPath(projectId, appId),
      )
      return response.keys
    },
    async create(
      projectId: string,
      appId: string,
    ): Promise<CreatedProjectAppKey> {
      const response = await request<{ key: CreatedProjectAppKey }>(
        options,
        keyPath(projectId, appId),
        { method: 'POST' },
      )
      return response.key
    },
    async revoke(projectId: string, appId: string, keyId: string): Promise<void> {
      const response = await options.fetch(
        new URL(`${keyPath(projectId, appId)}/${encodeURIComponent(keyId)}`, options.baseUrl).toString(),
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { accept: 'application/json' },
        },
      )
      if (!response.ok) {
        throw new Error(`Application key revocation failed with status ${response.status}`)
      }
    },
  }
}
