import type {
    MetricQueryParams,
    MetricQueryResponse,
} from '@performance-platform/protocol'
import type { DashboardScope } from './dashboard-scope.js'

export function createDashboardMetricQueryApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(
            scope: DashboardScope,
            params: MetricQueryParams,
        ): Promise<MetricQueryResponse> {
            const url = new URL(
                `/monitor-api/projects/${encodeURIComponent(scope.projectId)}/apps/${encodeURIComponent(scope.appId)}/dashboard/metrics`,
                options.baseUrl,
            )
            url.searchParams.set('type', params.type)
            if (params.from !== undefined)
                url.searchParams.set('from', params.from)
            if (params.to !== undefined) url.searchParams.set('to', params.to)
            if (params.interval !== undefined)
                url.searchParams.set('interval', params.interval)

            const response = await options.fetch(url.toString(), {
                credentials: 'include',
                headers: { accept: 'application/json' },
            })
            if (!response.ok) {
                throw new Error(
                    `Dashboard metric query failed with status ${response.status}`,
                )
            }
            return (await response.json()) as MetricQueryResponse
        },
    }
}
