<template>
    <article
        class="metric-summary-card"
        :data-unit="unit"
    >
        <header class="metric-summary-card__header">
            <div>
                <span class="metric-summary-card__eyebrow">
                    CORE WEB VITAL
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
    WebVitalMetric,
} from '@performance-platform/protocol'
import { rateWebVital } from '@performance-platform/protocol'
import { computed } from 'vue'


const props = defineProps<{
    label: string
    type: WebVitalMetric
    stats: MetricStats
    unit: MetricUnit
    metricVersion: MetricVersion
}>()

const rating = computed(() => {
    if (props.stats.p75 === null) {
        return null
    }

    // Web Vitals 通常以 P75 判断整体用户体验
    return rateWebVital(
        props.type,
        props.stats.p75,
    )
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
            return `${(value / 1024 / 1024).toFixed(1)} MiB`
    }
}
</script>
