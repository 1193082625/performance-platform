import type {
    MemoryHealthAssessment,
    MemoryHealthReason,
    MemoryHealthSnapshot,
    MemoryHealthStatus,
} from './types.js'

const MEBIBYTE = 1024 ** 2

export const MEMORY_HEALTH_THRESHOLDS = {
    minimumSamples: 6,
    minimumWindowMs: 20 * 60_000,
    minimumIncreasingTransitionRatio: 0.8,
    warning: {
        utilization: 0.7,
        growthAbsolute: 32 * MEBIBYTE,
        growthRatio: 0.2,
    },
    critical: {
        utilization: 0.9,
        growthAbsolute: 128 * MEBIBYTE,
        growthRatio: 0.5,
    },
} as const

function isValidSnapshot(
    snapshot: MemoryHealthSnapshot,
): boolean {
    return (
        Number.isFinite(snapshot.observedAt)
        && Number.isFinite(snapshot.usedHeap)
        && Number.isFinite(snapshot.heapLimit)
        && snapshot.observedAt >= 0
        && snapshot.usedHeap >= 0
        && snapshot.heapLimit > 0
        && snapshot.usedHeap <= snapshot.heapLimit
    )
}

export function evaluateMemoryHealth(
    snapshots: readonly MemoryHealthSnapshot[],
): MemoryHealthAssessment {
    const validSnapshots = [...snapshots]
        .filter(isValidSnapshot)
        .sort(
            (left, right) =>
                left.observedAt - right.observedAt,
        )

    const first = validSnapshots[0]
    const latest = validSnapshots.at(-1)
    const windowMs =
        first === undefined || latest === undefined
            ? 0
            : latest.observedAt - first.observedAt

    if (
        first === undefined
        || latest === undefined
        || validSnapshots.length
            < MEMORY_HEALTH_THRESHOLDS.minimumSamples
        || windowMs
            < MEMORY_HEALTH_THRESHOLDS.minimumWindowMs
    ) {
        return {
            status: 'INSUFFICIENT_DATA',
            reasons: ['INSUFFICIENT_SAMPLES'],
            sampleCount: validSnapshots.length,
            window: {
                from: first?.observedAt ?? null,
                to: latest?.observedAt ?? null,
            },
            latest: latest === undefined
                ? null
                : {
                    usedHeap: latest.usedHeap,
                    heapLimit: latest.heapLimit,
                    utilization:
                        latest.usedHeap / latest.heapLimit,
                },
            growth: null,
        }
    }

    const growthAbsolute =
        latest.usedHeap - first.usedHeap
    const growthRatio = first.usedHeap === 0
        ? growthAbsolute > 0
            ? Number.POSITIVE_INFINITY
            : 0
        : growthAbsolute / first.usedHeap

    let increasingTransitions = 0

    for (let index = 1; index < validSnapshots.length; index += 1) {
        const previous = validSnapshots[index - 1]
        const current = validSnapshots[index]

        if (
            previous !== undefined
            && current !== undefined
            && current.usedHeap > previous.usedHeap
        ) {
            increasingTransitions += 1
        }
    }

    const increasingTransitionRatio =
        increasingTransitions / (validSnapshots.length - 1)
    const utilization = latest.usedHeap / latest.heapLimit
    const sustainedGrowth =
        increasingTransitionRatio
            >= MEMORY_HEALTH_THRESHOLDS
                .minimumIncreasingTransitionRatio

    const criticalGrowth =
        sustainedGrowth
        && growthAbsolute
            >= MEMORY_HEALTH_THRESHOLDS.critical.growthAbsolute
        && growthRatio
            >= MEMORY_HEALTH_THRESHOLDS.critical.growthRatio
    const warningGrowth =
        sustainedGrowth
        && growthAbsolute
            >= MEMORY_HEALTH_THRESHOLDS.warning.growthAbsolute
        && growthRatio
            >= MEMORY_HEALTH_THRESHOLDS.warning.growthRatio

    let status: MemoryHealthStatus = 'NORMAL'
    const reasons: MemoryHealthReason[] = []

    if (
        utilization
            >= MEMORY_HEALTH_THRESHOLDS.critical.utilization
        || criticalGrowth
    ) {
        status = 'CRITICAL'
    } else if (
        utilization
            >= MEMORY_HEALTH_THRESHOLDS.warning.utilization
        || warningGrowth
    ) {
        status = 'WARNING'
    }

    if (
        utilization
            >= MEMORY_HEALTH_THRESHOLDS.warning.utilization
    ) {
        reasons.push('HIGH_HEAP_PRESSURE')
    }

    if (warningGrowth) {
        reasons.push('SUSTAINED_HEAP_GROWTH')
    }

    return {
        status,
        reasons,
        sampleCount: validSnapshots.length,
        window: {
            from: first.observedAt,
            to: latest.observedAt,
        },
        latest: {
            usedHeap: latest.usedHeap,
            heapLimit: latest.heapLimit,
            utilization,
        },
        growth: {
            absolute: growthAbsolute,
            ratio: growthRatio,
            increasingTransitionRatio,
        },
    }
}
