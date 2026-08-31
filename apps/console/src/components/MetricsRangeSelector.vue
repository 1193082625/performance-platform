<template>
    <div class="btn-group">
        <!-- aria-pressed 是标准的 ARIA 无障碍属性，专门描述“可切换按钮当前是否被按下或选中” -->
        <button
            v-for="btn in buttons"
            :key="btn"
            type="button"
            :aria-pressed="btn === props.range"
            @click="emit('select', btn)"
        >{{btn}}</button>
    </div>
</template>

<script setup lang="ts">
import type {
    MetricsRange,
} from '../composables/use-paint-metrics.js'

const props = defineProps<{
    range: '1h' | '24h' | '7d' | '30d'
}>()
const emit = defineEmits<{
    select: [range: MetricsRange]
}>()

const buttons: MetricsRange[] = ['1h', '24h', '7d', '30d']

</script>