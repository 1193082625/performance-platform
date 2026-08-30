import type { PaintMetricsQueryParams, PaintMetricsResponse } from "@performance-platform/protocol"


interface CreatePaintMetricsApiOptions {
    baseUrl: string
    fetch: typeof globalThis.fetch
}

export interface PaintMetricsApi {
    query(
        params: PaintMetricsQueryParams,
    ): Promise<PaintMetricsResponse>
}

export function createPaintMetricsApi(
    options: CreatePaintMetricsApiOptions
): PaintMetricsApi {
    return {
        async query(
            params: PaintMetricsQueryParams,
        ): Promise<PaintMetricsResponse> {
            const url = new URL(
                '/api/v1/metrics/paint',
                options.baseUrl,
            )

            if(params.from !== undefined) {
                url.searchParams.set(
                    'from',
                    params.from
                )
            }

            if(params.to !== undefined) {
                url.searchParams.set(
                    'to',
                    params.to
                )
            }

            if(params.interval !== undefined) {
                url.searchParams.set(
                    'interval',
                    params.interval
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
                throw new Error(`Metrics request failed with status ${response.status}`);
            }

            return await response.json() as PaintMetricsResponse
        }
    }
}