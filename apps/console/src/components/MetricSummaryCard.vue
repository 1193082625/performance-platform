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
            v-if="stats.count === 0"
            class="metric-summary-card__empty"
        >
            暂无 LCP 数据
        </p>
    </article>
</template>

<script setup lang="ts">
import type {
    MetricStats,
    MetricUnit,
    MetricVersion,
} from '@performance-platform/protocol'

const props = defineProps<{
    label: string
    stats: MetricStats
    unit: MetricUnit
    metricVersion: MetricVersion
}>()

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
