export interface ConsoleUser {
    id: string
    name: string
    phone: string
}

interface ApiOptions {
    baseUrl: string
    fetch: typeof globalThis.fetch
}

async function request<T>(
    options: ApiOptions,
    path: string,
    init: RequestInit,
): Promise<T> {
    const response = await options.fetch(
        new URL(path, options.baseUrl).toString(),
        {
            credentials: 'include',
            headers: { accept: 'application/json', ...init.headers },
            ...init,
        },
    )
    if (!response.ok)
        throw new Error(`Account request failed with status ${response.status}`)
    return (await response.json()) as T
}

export function createConsoleAccountApi(options: ApiOptions) {
    return {
        async currentUser(): Promise<ConsoleUser> {
            const response = await request<{ user: ConsoleUser }>(
                options,
                '/monitor-api/auth/me',
                { method: 'GET' },
            )
            return response.user
        },
        async login(input: {
            phone: string
            password: string
        }): Promise<ConsoleUser> {
            const response = await request<{ user: ConsoleUser }>(
                options,
                '/monitor-api/auth/login',
                {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(input),
                },
            )
            return response.user
        },
        async register(input: {
            name: string
            phone: string
            password: string
        }): Promise<void> {
            await request(options, '/monitor-api/auth/register', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(input),
            })
        },
        async logout(): Promise<void> {
            const response = await options.fetch(
                new URL('/monitor-api/auth/logout', options.baseUrl).toString(),
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { accept: 'application/json' },
                },
            )
            if (!response.ok)
                throw new Error(`Logout failed with status ${response.status}`)
        },
    }
}
