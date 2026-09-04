<template>
    <article class="memory-health-card" :data-status="assessment?.status ?? 'LOADING'">
        <span>MEMORY HEALTH</span>
        <strong>{{ title }}</strong>
        <p>{{ message }}</p>
    </article>
</template>

<script setup lang="ts">
import type { MemoryHealthAssessment } from '@performance-platform/protocol'
import { computed } from 'vue'
import { formatBytes } from './metric-value-format.js'

const props = defineProps<{
    assessment: MemoryHealthAssessment | null
    loading: boolean
    error: string | null
}>()

const title = computed(() => {
    if (props.loading) return 'LOADING'
    if (props.error !== null) return 'UNAVAILABLE'
    return props.assessment?.status?.replace('_', ' ') ?? 'UNAVAILABLE'
})

const message = computed(() => {
    const value = props.assessment
    if (props.loading) return '正在评估内存状态'
    if (props.error !== null) return '内存状态加载失败'
    if (value === null || value.status === undefined) {
        return '暂无内存状态'
    }
    if (value.status === 'INSUFFICIENT_DATA') {
        return `样本不足（${value.sampleCount}/6）`
    }

    const utilization = value.latest === null
        ? '—'
        : `${(value.latest.utilization * 100).toFixed(1)}%`
    const growth = value.growth === null
        ? '—'
        : formatBytes(Math.max(0, value.growth.absolute))

    if (value.status === 'CRITICAL') {
        return `极高内存压力或高度疑似泄漏 · 利用率 ${utilization} · 增长 ${growth}`
    }
    if (value.status === 'WARNING') {
        return `检测到可疑内存风险 · 利用率 ${utilization} · 增长 ${growth}`
    }
    return `内存状态正常 · 利用率 ${utilization}`
})
</script>
