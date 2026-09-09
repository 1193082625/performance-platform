import type { LcpDiagnosticAnalysisResponse } from '@performance-platform/protocol'

interface LcpDiagnosticQueryParams {
    from?: string
    to?: string
}

export function createLcpDiagnosticApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(
            params: LcpDiagnosticQueryParams = {},
        ): Promise<LcpDiagnosticAnalysisResponse> {
            const url = new URL('/api/v2/diagnostics/lcp', options.baseUrl)

            if (params.from !== undefined)
                url.searchParams.set('from', params.from)
            if (params.to !== undefined) url.searchParams.set('to', params.to)

            const response = await options.fetch(url.toString(), {
                headers: { accept: 'application/json' },
            })

            if (!response.ok) {
                throw new Error(
                    `LCP diagnostic query failed with status ${response.status}`,
                )
            }

            return (await response.json()) as LcpDiagnosticAnalysisResponse
        },
    }
}
