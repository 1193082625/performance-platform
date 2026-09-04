import {
    evaluateMemoryHealth,
    type MemoryHealthAssessment,
} from '@performance-platform/protocol'
import type {
    MemoryHealthRepository,
} from '../repositories/event-repository.js'

const DEFAULT_RANGE_MS = 24 * 60 * 60 * 1_000

export interface MemoryHealthService {
    query(): Promise<
        | { ok: true; value: MemoryHealthAssessment }
        | { ok: false; code: 'STORAGE_UNAVAILABLE'; cause: unknown }
    >
}

export function createMemoryHealthService(options: {
    repository: MemoryHealthRepository
    appId: string
    now(): number
}): MemoryHealthService {
    return {
        async query() {
            const now = options.now()

            try {
                const snapshots = await options.repository
                    .queryLatestViewMemorySnapshots({
                        appId: options.appId,
                        from: new Date(now - DEFAULT_RANGE_MS),
                        to: new Date(now),
                    })

                return {
                    ok: true,
                    value: evaluateMemoryHealth(snapshots),
                }
            } catch (cause) {
                return {
                    ok: false,
                    code: 'STORAGE_UNAVAILABLE',
                    cause,
                }
            }
        },
    }
}
