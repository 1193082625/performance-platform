<template>
    <section
        class="performance-score"
        :data-status="score?.status || ''"
    >
        <p class="performance-score__eyebrow">
            REAL-TIME PAINT · 综合性能评分
        </p>

        <span class="performance-score__callout performance-score__callout--start">
            VISUAL<br>START
        </span>
        <span class="performance-score__callout performance-score__callout--render">
            CONTENTFUL<br>RENDER
        </span>
        <span class="performance-score__callout performance-score__callout--speed">
            PERCEIVED<br>SPEED
        </span>
        <span class="performance-score__callout performance-score__callout--experience">
            USER<br>EXPERIENCE
        </span>

        <div class="performance-score__metrics">
            <div>
                <span>FP</span>
                <strong>{{ formatMilliseconds(fpAverage) }}</strong>
            </div>

            <div>
                <span>FCP</span>
                <strong>{{ formatMilliseconds(fcpAverage) }}</strong>
            </div>
        </div>

        <template v-if="score">
            <div class="performance-score__value">
                <span>综合评分</span>
                <strong data-testid="overall-score">{{score.value}}</strong>
                <small>/ 100</small>
            </div>
            <p class="performance-score__status">{{ STATUS_LABELS[score.status] }}</p>
            <div class="performance-score__components">
                <span>FP {{ score.components.fp }}</span>
                <span>FCP {{ score.components.fcp }}</span>
            </div>
        </template>
        <p v-else class="performance-score__empty">暂无评分</p>
    </section>
</template>

<script setup lang="ts">
import type { PaintScore, PaintScoreStatus } from '@performance-platform/protocol'
defineProps<{
    score: PaintScore | null
    fpAverage?: number | null
    fcpAverage?: number | null
}>()

function formatMilliseconds(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return '—'
    }

    return Math.round(value).toLocaleString()
}

const STATUS_LABELS: Record<PaintScoreStatus, string> = {
    'good': '状态良好',
    'needs-improvement': '需要改进',
    'poor': '状态较差'
}
</script>
