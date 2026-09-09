<template>
  <details
    class="recommendation-popover"
    :class="`recommendation-popover--${recommendation.status.toLowerCase().replace('_', '-')}`"
  >
    <summary
      :aria-label="t('recommendations.show', { metric: recommendation.metric })"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          v-if="recommendation.status === 'NEEDS_IMPROVEMENT'"
          d="M9 18h6m-5 3h4M8.5 15.5A7 7 0 1 1 15.5 15.5C14.5 16.3 14 17 14 18h-4c0-1-.5-1.7-1.5-2.5Z"
        />
        <path
          v-else-if="recommendation.status === 'CRITICAL'"
          d="m8 2 8 0 6 6v8l-6 6H8l-6-6V8Zm4 5v7m0 3v.01"
        />
        <path
          v-else-if="recommendation.status === 'POOR'"
          d="M12 3 22 21H2Zm0 6v6m0 3v.01"
        />
        <path v-else d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 5v6m0 3v.01" />
      </svg>
    </summary>
    <div class="recommendation-popover__panel" role="note">
      <header>
        <strong>{{ recommendation.metric }}</strong>
        <span>{{ t(`status.${recommendation.status}`) }}</span>
      </header>
      <p>{{ t(recommendation.messageKey, recommendation.messageParams ?? {}) }}</p>
    </div>
  </details>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PerformanceRecommendation } from "./performance-recommendations.js";

defineProps<{
  recommendation: PerformanceRecommendation;
}>();

const { t } = useI18n();
</script>

<style scoped>
.recommendation-popover {
  position: absolute;
  top: 14px;
  right: 12px;
  z-index: 6;
}

.recommendation-popover summary {
  display: grid;
  width: 20px;
  height: 20px;
  padding: 0 2px 4px;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  color: #e6a74f;
  background: #161121;
  box-shadow: 0 0 12px #e6a74f40;
  cursor: pointer;
  list-style: none;
}

.recommendation-popover summary::-webkit-details-marker {
  display: none;
}
.recommendation-popover summary:hover {
  background: #2b1830;
}
.recommendation-popover summary:focus-visible {
  outline: 2px solid #8defff;
  outline-offset: 3px;
}
.recommendation-popover summary svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.recommendation-popover--poor summary,
.recommendation-popover--critical summary {
  color: #ff647d;
  background: #210d1a;
  box-shadow: 0 0 12px #ff59754d;
}

.recommendation-popover__panel {
  position: absolute;
  top: 27px;
  right: 0;
  width: min(220px, calc(100vw - 48px));
  padding: 12px 14px;
  border: 1px solid #7654bf;
  border-left: 3px solid #e6a74f;
  border-radius: 4px;
  color: #b8c8e3;
  background: #02091bf7;
  box-shadow:
    0 8px 28px #000a,
    0 0 18px #5d2da23d;
  backdrop-filter: blur(10px);
}

.recommendation-popover--poor .recommendation-popover__panel,
.recommendation-popover--critical .recommendation-popover__panel {
  border-left-color: #ff5975;
}
.recommendation-popover__panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.recommendation-popover__panel strong {
  color: #f2f6ff;
  font-size: 14px;
}
.recommendation-popover__panel span {
  color: #e6a74f;
  font-size: 11px;
  font-weight: 700;
}
.recommendation-popover--poor .recommendation-popover__panel span,
.recommendation-popover--critical .recommendation-popover__panel span {
  color: #ff6c83;
}
.recommendation-popover__panel p {
  margin: 7px 0 0;
  font:
    13px/1.5 Arial,
    sans-serif;
}
</style>
