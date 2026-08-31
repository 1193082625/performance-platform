<template>
    <article class="paint-metric-card">
        <h2>{{ metric }}</h2>

        <div class="paint-metric-card__average">
            <span>Average</span>
            <strong data-testid="metric-average">
                {{ formatMilliseconds(stats.average) }}
            </strong>
        </div>
        <p
            v-if="stats.count === 0"
            class="paint-metric-card__empty"
        >
            暂无数据
        </p>
        <dl class="paint-metric-card__stats">
            <div>
                <dt>P50{{ ' ' }}</dt>
                <dd>{{ formatMilliseconds(stats.p50) }}</dd>
            </div>
            <div>
                <dt>P75{{ ' ' }}</dt>
                <dd>{{ formatMilliseconds(stats.p75) }}</dd>
            </div>
            <div>
                <dt>P90{{ ' ' }}</dt>
                <dd>{{ formatMilliseconds(stats.p90) }}</dd>
            </div>
            <div>
                <dt>
                    Samples
                    <span class="sr-only">样本数{{ ' ' }}</span>
                </dt>
                <dd>{{ stats.count.toLocaleString() }}</dd>
            </div>
        </dl>
    </article>
</template>

<script setup lang="ts">
import type { PaintStats } from '@performance-platform/protocol';

defineProps<{
    metric: 'FP' | 'FCP'
    stats: PaintStats
}>()

function formatMilliseconds(value: number | null): string {
    if(value === null) return '—'

    return `${Math.round(value)} ms`
}
</script>
