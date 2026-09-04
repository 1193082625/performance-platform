<template>
    <section class="metric-trend-chart">
        <h2>{{ title }}</h2>

        <p
            v-if="!hasSamples"
            class="metric-trend-chart__empty"
        >
            暂无 {{ label }} 趋势数据
        </p>

        <VChart
            v-else
            data-testid="metric-trend-chart"
            class="metric-trend-chart__canvas"
            :option="option"
            autoresize
        />
    </section>
</template>

<script setup lang="ts">
import type {
    MetricSeriesPoint,
    MetricUnit,
} from '@performance-platform/protocol'
import {
    LineChart,
} from 'echarts/charts'
import {
    GridComponent,
    TooltipComponent,
} from 'echarts/components'
import {
    use,
} from 'echarts/core'
import {
    SVGRenderer,
} from 'echarts/renderers'
import {
    computed,
} from 'vue'
import VChart from 'vue-echarts'

import {
    buildMetricTrendOption,
} from './metric-trend-option.js'
import type {
    MetricTrendStatistic,
} from './metric-trend-option.js'

use([
    SVGRenderer,
    LineChart,
    GridComponent,
    TooltipComponent,
])

const props = withDefaults(
    defineProps<{
        points: MetricSeriesPoint[]
        label: string
        unit: MetricUnit
        title?: string
        statistic?: MetricTrendStatistic
        color?: string
    }>(),
    {
        title: '指标趋势',
        statistic: 'p75',
    },
)

const option = computed(
    () => buildMetricTrendOption({
        points: props.points,
        label: props.label,
        unit: props.unit,
        statistic: props.statistic,
        color: props.color,
    }),
)

const hasSamples = computed(
    () => props.points.some(
        point => point.stats.count > 0,
    ),
)
</script>

<style scoped>
.metric-trend-chart__canvas {
    width: 100%;
    height: 100%;
    min-height: 0;
}
</style>
