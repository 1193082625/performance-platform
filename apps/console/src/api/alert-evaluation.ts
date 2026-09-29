import type { AlertEvaluationResponse } from '@performance-platform/protocol'
import type { DashboardScope } from './dashboard-scope.js'

interface AlertEvaluationQueryParams {
    from?: string
    to?: string
}

export function createAlertEvaluationApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(
            scope: DashboardScope,
            params: AlertEvaluationQueryParams = {},
        ): Promise<AlertEvaluationResponse> {
            const url = new URL(
                `/monitor-api/projects/${encodeURIComponent(scope.projectId)}/apps/${encodeURIComponent(scope.appId)}/dashboard/alerts`,
                options.baseUrl,
            )
            if (params.from !== undefined) url.searchParams.set('from', params.from)
            if (params.to !== undefined) url.searchParams.set('to', params.to)

            const response = await options.fetch(url.toString(), {
                credentials: 'include',
                headers: { accept: 'application/json' },
            })
            if (!response.ok) {
                throw new Error(`Alert evaluation failed with status ${response.status}`)
            }
            return (await response.json()) as AlertEvaluationResponse
        },
    }
}
