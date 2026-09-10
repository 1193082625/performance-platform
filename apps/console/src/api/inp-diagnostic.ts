import type { InpDiagnosticAnalysisResponse } from '@performance-platform/protocol'

interface InpDiagnosticQueryParams {
    from?: string
    to?: string
}

export function createInpDiagnosticApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(
            params: InpDiagnosticQueryParams = {},
        ): Promise<InpDiagnosticAnalysisResponse> {
            const url = new URL('/api/v2/diagnostics/inp', options.baseUrl)
            if (params.from !== undefined)
                url.searchParams.set('from', params.from)
            if (params.to !== undefined) url.searchParams.set('to', params.to)

            const response = await options.fetch(url.toString(), {
                headers: { accept: 'application/json' },
            })
            if (!response.ok) {
                throw new Error(
                    `INP diagnostic query failed with status ${response.status}`,
                )
            }
            return (await response.json()) as InpDiagnosticAnalysisResponse
        },
    }
}
