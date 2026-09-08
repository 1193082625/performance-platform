<script setup>
import Icon from './Icon.vue'
defineProps({ value: [String, Number], unit: String, color: String, health: Boolean, progress: { type: Number, default: 77 } })
</script>
<template>
  <div class="ring" :class="{ 'health-ring': health }" :style="{ '--ring-color': color }">
    <svg class="ring-art" viewBox="0 0 180 180" aria-hidden="true">
      <circle class="ticks" cx="90" cy="90" r="77"/>
      <circle class="fine-ring" cx="90" cy="90" r="72"/>
      <circle class="track" cx="90" cy="90" r="66"/>
      <circle class="progress" cx="90" cy="90" r="66" :stroke-dasharray="`${progress * 4.147} 414.7`" transform="rotate(-90 90 90)"/>
      <circle class="inner-ring" cx="90" cy="90" r="60"/>
      <path class="crosshairs" d="M90 17v10M90 153v10M17 90h10m126 0h10"/>
      <g fill="currentColor" opacity=".8"><circle cx="35" cy="90" r="1.7"/><circle cx="145" cy="90" r="1.7"/></g>
    </svg>
    <div class="ring-value">
      <Icon v-if="health" name="shield"/>
      <template v-else><strong>{{ value }}</strong><span>{{ unit }}</span></template>
    </div>
  </div>
</template>
