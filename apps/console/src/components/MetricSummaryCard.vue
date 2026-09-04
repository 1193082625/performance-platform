<template>
    <article
        class="metric-summary-card"
        :data-unit="unit"
    >
        <header class="metric-summary-card__header">
            <div>
                <span class="metric-summary-card__eyebrow">
                    {{ eyebrow }}
                </span>
                <h2>{{ label }}</h2>
            </div>

            <span class="metric-summary-card__version">
                {{ metricVersion }}
            </span>
        </header>

        <div class="metric-summary-card__body">
            <div class="metric-summary-card__primary">
                <span>AVERAGE</span>
                <strong data-testid="metric-summary-average">
                    {{ formatValue(stats.average) }}
                </strong>
            </div>

            <dl>
                <div>
                    <dt>P75</dt>
                    <dd data-testid="metric-summary-p75">
                        {{ formatValue(stats.p75) }}
                    </dd>
                </div>
                <div>
                    <dt>SAMPLES</dt>
                    <dd data-testid="metric-summary-samples">
                        {{ stats.count.toLocaleString() }}
                    </dd>
                </div>
            </dl>
        </div>

        <p
            v-if="rating !== null"
            class="metric-summary-card__rating"
            :data-rating="rating"
        >
            {{ formatRating(rating) }}
        </p>

        <p
            v-if="stats.count === 0"
            class="metric-summary-card__empty"
        >
            暂无 {{ label }} 数据
        </p>
    </article>
</template>

<script setup lang="ts">
import type {
    MetricRating,
    MetricStats,
    MetricUnit,
    MetricVersion,
    WebMetric,
} from '@performance-platform/protocol'
import { rateWebVital } from '@performance-platform/protocol'
import { computed } from 'vue'
import { formatBytes } from './metric-value-format.js';


const props = withDefaults(
    defineProps<{
        label: string
        type: WebMetric
        stats: MetricStats
        unit: MetricUnit
        metricVersion: MetricVersion
        eyebrow?: string
    }>(),
    {
        eyebrow: 'CORE WEB VITAL',
    },
)

const rating = computed(() => {
    if (props.stats.p75 === null) {
        return null
    }

    switch (props.type) {
        case 'web.vital.lcp':
        case 'web.vital.cls':
        case 'web.vital.inp':
            return rateWebVital(
                props.type,
                props.stats.p75,
            )

        default:
            return null
    }
})

function formatRating(
    value: MetricRating,
): string {
    switch (value) {
        case 'good':
            return 'GOOD'
        case 'needs-improvement':
            return 'NEEDS IMPROVEMENT'
        case 'poor':
            return 'POOR'
    }
}

function formatValue(value: number | null): string {
    if (value === null) return '—'

    switch (props.unit) {
        case 'ms':
            return `${Math.round(value).toLocaleString()} ms`
        case 'score':
            return value.toFixed(3)
        case 'byte':
            return formatBytes(value)
    }
}
</script>
