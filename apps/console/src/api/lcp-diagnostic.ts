import type { LcpDiagnosticAnalysisResponse } from '@performance-platform/protocol'
import type { DashboardScope } from './dashboard-scope.js'

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
            scope: DashboardScope,
            params: LcpDiagnosticQueryParams = {},
        ): Promise<LcpDiagnosticAnalysisResponse> {
            const url = new URL(
                `/monitor-api/projects/${encodeURIComponent(scope.projectId)}/apps/${encodeURIComponent(scope.appId)}/dashboard/lcp`,
                options.baseUrl,
            )

            if (params.from !== undefined)
                url.searchParams.set('from', params.from)
            if (params.to !== undefined) url.searchParams.set('to', params.to)

            const response = await options.fetch(url.toString(), {
                credentials: 'include',
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
