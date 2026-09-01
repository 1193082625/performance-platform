<template>
    <section class="paint-trend-chart">
        <h2>{{ props.title }}</h2>

        <p
            v-if="points.length === 0"
            class="paint-trend-chart__empty"
        >
            暂无趋势数据
        </p>

        <VChart
            v-else
            data-testid="paint-trend-chart"
            class="paint-trend-chart__canvas"
            :option="option"
            autoresize
        />
    </section>
</template>

<script setup lang="ts">
import {
    computed,
} from 'vue'

import type {
    PaintSeriesPoint,
} from '@performance-platform/protocol'

import {
    LineChart,
} from 'echarts/charts'

import {
    GridComponent,
    LegendComponent,
    TooltipComponent,
} from 'echarts/components'

import {
    use,
} from 'echarts/core'

import {
    SVGRenderer,
} from 'echarts/renderers'

import VChart from 'vue-echarts'

import {
    buildPaintTrendOption,
} from './paint-trend-option.js'

import type {
    PaintTrendStatistic,
} from './paint-trend-option.js'


use([
    SVGRenderer,
    LineChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
])

const props = withDefaults(
    defineProps<{
        points: PaintSeriesPoint[]
        title?: string
        statistic?: PaintTrendStatistic
    }>(),
    {
        title: '性能趋势',
        statistic: 'average',
    },
)

const option = computed(
    () =>
        buildPaintTrendOption(
            props.points,
            props.statistic,
        ),
)
</script>

<style scoped>
.paint-trend-chart__canvas {
    width: 100%;
    height: 100%;
    min-height: 0;
}
</style>
