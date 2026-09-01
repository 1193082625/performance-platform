<template>
    <article class="paint-metric-card">
        <div class="paint-metric-card__content">
        <h2>{{ metric }}</h2>

        <div class="paint-metric-card__average">
            <span class="paint-metric-card__label">
                <Icon :icon="activityIcon" aria-hidden="true" />
                Average
            </span>
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
                <dt>
                    <Icon :icon="chartLineIcon" aria-hidden="true" />
                    P50{{ ' ' }}
                </dt>
                <dd>{{ formatMilliseconds(stats.p50) }}</dd>
            </div>
            <div>
                <dt>
                    <Icon :icon="chartDotsIcon" aria-hidden="true" />
                    P75{{ ' ' }}
                </dt>
                <dd>{{ formatMilliseconds(stats.p75) }}</dd>
            </div>
            <div>
                <dt>
                    <Icon :icon="histogramIcon" aria-hidden="true" />
                    P90{{ ' ' }}
                </dt>
                <dd>{{ formatMilliseconds(stats.p90) }}</dd>
            </div>
            <div>
                <dt>
                    <Icon :icon="databaseIcon" aria-hidden="true" />
                    Samples
                    <span class="sr-only">样本数{{ ' ' }}</span>
                </dt>
                <dd>{{ stats.count.toLocaleString() }}</dd>
            </div>
        </dl>
        </div>
    </article>
</template>

<script setup lang="ts">
import type { PaintStats } from '@performance-platform/protocol';
import { Icon } from '@iconify/vue'
import activityIcon from '@iconify-icons/tabler/activity'
import chartDotsIcon from '@iconify-icons/tabler/chart-dots-2'
import chartLineIcon from '@iconify-icons/tabler/chart-line'
import databaseIcon from '@iconify-icons/tabler/database'
import histogramIcon from '@iconify-icons/tabler/chart-histogram'

defineProps<{
    metric: 'FP' | 'FCP'
    stats: PaintStats
}>()

function formatMilliseconds(value: number | null): string {
    if (value === null) return '—'

    return `${Math.round(value).toLocaleString()} ms`
}
</script>
