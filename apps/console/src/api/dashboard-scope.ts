export interface DashboardProject {
    id: string
    name: string
    description: string
}

export interface DashboardApp {
    id: string
    projectId: string
    appId: string
    name: string
    platform: string
}

export interface DashboardScope {
    projectId: string
    appId: string
}

interface ApiOptions {
    baseUrl: string
    fetch: typeof globalThis.fetch
}

async function requestJson<T>(
    fetcher: typeof globalThis.fetch,
    url: URL,
    label: string,
    init: RequestInit = {},
): Promise<T> {
    const response = await fetcher(url.toString(), {
        credentials: 'include',
        headers: { accept: 'application/json', ...init.headers },
        ...init,
    })

    if (!response.ok) {
        throw new Error(`${label} failed with status ${response.status}`)
    }

    return (await response.json()) as T
}

export function createDashboardScopeApi(options: ApiOptions) {
    return {
        async createProject(input: {
            name: string
            description: string
        }): Promise<DashboardProject> {
            const response = await requestJson<{ project: DashboardProject }>(
                options.fetch,
                new URL('/monitor-api/projects', options.baseUrl),
                'Project creation',
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(input),
                },
            )
            return response.project
        },
        async listProjects(): Promise<DashboardProject[]> {
            const response = await requestJson<{
                projects: DashboardProject[]
            }>(
                options.fetch,
                new URL('/monitor-api/projects', options.baseUrl),
                'Project query',
            )
            return response.projects
        },
        async createApp(
            projectId: string,
            input: { name: string; platform: string },
        ): Promise<DashboardApp> {
            const response = await requestJson<{ app: DashboardApp }>(
                options.fetch,
                new URL(
                    `/monitor-api/projects/${encodeURIComponent(projectId)}/apps`,
                    options.baseUrl,
                ),
                'Application creation',
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(input),
                },
            )
            return response.app
        },
        async listApps(projectId: string): Promise<DashboardApp[]> {
            const response = await requestJson<{ apps: DashboardApp[] }>(
                options.fetch,
                new URL(
                    `/monitor-api/projects/${encodeURIComponent(projectId)}/apps`,
                    options.baseUrl,
                ),
                'Application query',
            )
            return response.apps
        },
    }
}
