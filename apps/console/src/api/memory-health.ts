import type { MemoryHealthAssessment } from '@performance-platform/protocol'

export function createMemoryHealthApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(
            params: { from?: string; to?: string } = {},
        ): Promise<MemoryHealthAssessment> {
            const url = new URL('/api/v2/memory-health', options.baseUrl)
            if (params.from !== undefined) {
                url.searchParams.set('from', params.from)
            }
            if (params.to !== undefined) {
                url.searchParams.set('to', params.to)
            }

            const response = await options.fetch(
                url,
                { headers: { accept: 'application/json' } },
            )

            if (!response.ok) {
                throw new Error(
                    `Memory health query failed with status ${response.status}`,
                )
            }

            return await response.json() as MemoryHealthAssessment
        },
    }
}
