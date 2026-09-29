import type { InpDiagnosticAnalysisResponse } from '@performance-platform/protocol'
import type { DashboardScope } from './dashboard-scope.js'

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
            scope: DashboardScope,
            params: InpDiagnosticQueryParams = {},
        ): Promise<InpDiagnosticAnalysisResponse> {
            const url = new URL(
                `/monitor-api/projects/${encodeURIComponent(scope.projectId)}/apps/${encodeURIComponent(scope.appId)}/dashboard/inp`,
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
                    `INP diagnostic query failed with status ${response.status}`,
                )
            }
            return (await response.json()) as InpDiagnosticAnalysisResponse
        },
    }
}
