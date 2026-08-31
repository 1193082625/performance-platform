import type {
    PaintScore,
    PaintScoreStatus,
    PaintStats,
} from '@performance-platform/protocol'

interface PaintScoreInput {
    fp: PaintStats
    fcp: PaintStats
}

interface MetricThresholds {
    good: number
    poor: number
}

const FP_THRESHOLDS = {
    good: 1_000,
    poor: 2_000,
} satisfies MetricThresholds

const FCP_THRESHOLDS = {
    good: 1_800,
    poor: 3_000,
} satisfies MetricThresholds

function roundToOneDecimal(
    value: number,
): number {
    return Math.round(value * 10) / 10
}

/**
 * 把一个毫秒值转换成 0-100 的分数，性能耗时越小越好
 * @param value 
 * @param thresholds 
 * @returns 
 */
function calculateMetricScore(
    value: number,
    thresholds: MetricThresholds,
): number {
    const {
        good,
        poor,
    } = thresholds

    // 把耗时映射到 90-100
    if (value <= good) {
        return (
            90
            + 10 * (good - value) / good
        )
    }

    if (value <= poor) {
        return (
            90
            - 40
            * (value - good)
            / (poor - good)
        )
    }

    if (value <= poor * 2) {
        return (
            50
            * (poor * 2 - value)
            / poor
        )
    }

    return 0
}

function getStatus(
    score: number,
): PaintScoreStatus {
    if (score >= 90) {
        return 'good'
    }

    if (score >= 50) {
        return 'needs-improvement'
    }

    return 'poor'
}

export function calculatePaintScore(
    input: PaintScoreInput,
): PaintScore | null {
    if (
        input.fp.p75 === null
        || input.fcp.p75 === null
    ) {
        return null
    }

    const fp = roundToOneDecimal(
        calculateMetricScore(
            input.fp.p75,
            FP_THRESHOLDS,
        ),
    )

    const fcp = roundToOneDecimal(
        calculateMetricScore(
            input.fcp.p75,
            FCP_THRESHOLDS,
        ),
    )

    const value = roundToOneDecimal(
        fp * 0.3 + fcp * 0.7,
    )

    return {
        value,
        status: getStatus(value),
        version: 'paint-v1',

        components: {
            fp,
            fcp,
        },
    }
}