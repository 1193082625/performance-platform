import type {
    ClsDiagnosticAnalysisResponse,
} from '@performance-platform/protocol'

interface ClsDiagnosticQueryParams {
    from?: string
    to?: string
}

export function createClsDiagnosticApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(
            params: ClsDiagnosticQueryParams = {},
        ): Promise<ClsDiagnosticAnalysisResponse> {
            const url = new URL('/api/v2/diagnostics/cls', options.baseUrl)

            if (params.from !== undefined)
                url.searchParams.set('from', params.from)
            if (params.to !== undefined) url.searchParams.set('to', params.to)

            const response = await options.fetch(url.toString(), {
                headers: { accept: 'application/json' },
            })

            if (!response.ok) {
                throw new Error(
                    `CLS diagnostic query failed with status ${response.status}`,
                )
            }

            return (await response.json()) as ClsDiagnosticAnalysisResponse
        },
    }
}
