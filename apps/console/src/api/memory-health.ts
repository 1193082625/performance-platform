import type { MemoryHealthAssessment } from '@performance-platform/protocol'

export function createMemoryHealthApi(options: {
    baseUrl: string
    fetch: typeof globalThis.fetch
}) {
    return {
        async query(): Promise<MemoryHealthAssessment> {
            const response = await options.fetch(
                new URL('/api/v2/memory-health', options.baseUrl),
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
