import type {
    MetricQueryParams,
    MetricQueryResponse,
} from '@performance-platform/protocol'

interface CreateMetricQueryApiOptions {
    baseUrl: string
    fetch: typeof globalThis.fetch
}

export interface MetricQueryApi {
    query(
        params: MetricQueryParams,
    ): Promise<MetricQueryResponse>
}

export function createMetricQueryApi(
    options: CreateMetricQueryApiOptions,
): MetricQueryApi {
    return {
        async query(
            params: MetricQueryParams,
        ): Promise<MetricQueryResponse> {
            const url = new URL(
                '/api/v2/metrics',
                options.baseUrl,
            )

            url.searchParams.set(
                'type',
                params.type,
            )

            if (params.from !== undefined) {
                url.searchParams.set(
                    'from',
                    params.from,
                )
            }

            if (params.to !== undefined) {
                url.searchParams.set(
                    'to',
                    params.to,
                )
            }

            if (params.interval !== undefined) {
                url.searchParams.set(
                    'interval',
                    params.interval,
                )
            }

            const response = await options.fetch(
                url.toString(),
                {
                    headers: {
                        accept: 'application/json',
                    },
                },
            )

            if (!response.ok) {
                throw new Error(
                    `Metric query failed with status ${response.status}`,
                )
            }

            return await response.json() as MetricQueryResponse
        },
    }
}