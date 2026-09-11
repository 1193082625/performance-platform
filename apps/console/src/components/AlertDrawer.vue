<template>
  <div v-if="open" class="alert-drawer-layer">
    <button
      class="alert-drawer-backdrop"
      type="button"
      :aria-label="t('alerts.close')"
      @click="$emit('close')"
    ></button>
    <aside class="alert-drawer" role="dialog" aria-modal="true" :aria-label="t('alerts.title')">
      <header class="alert-drawer__header">
        <div>
          <span>{{ t("alerts.eyebrow") }}</span>
          <h2>{{ t("alerts.title") }}</h2>
          <p v-if="evaluation">{{ formatRange(evaluation.range.from, evaluation.range.to) }}</p>
        </div>
        <button type="button" class="alert-drawer__close" :aria-label="t('alerts.close')" @click="$emit('close')">×</button>
      </header>

      <p v-if="loading" class="alert-drawer__state" role="status">{{ t("alerts.loading") }}</p>
      <p v-else-if="error" class="alert-drawer__state alert-drawer__state--error" role="alert">{{ t("alerts.error") }}</p>
      <p v-else-if="evaluation?.events?.length === 0" class="alert-drawer__state">{{ t("alerts.empty") }}</p>

      <div v-else class="alert-list">
        <details
          v-for="event in sortedEvents"
          :key="event.alertId"
          class="alert-card"
          :class="`alert-card--${alertSeverity(event).toLowerCase().replace('_', '-')}`"
        >
          <summary>
            <div class="alert-card__identity">
              <span class="alert-card__signal"></span>
              <div><strong>{{ alertMetricName(event) }}</strong><small>{{ t(`status.${alertSeverity(event)}`) }}</small></div>
            </div>
            <dl>
              <div><dt>P75</dt><dd>{{ formatAlertValue(event) }}</dd></div>
              <div><dt>{{ t("alerts.threshold") }}</dt><dd>&gt; {{ formatAlertThreshold(event) }}</dd></div>
            </dl>
            <span class="alert-card__chevron">⌄</span>
          </summary>
          <div class="alert-card__details">
            <div class="alert-card__evidence">
              <span>{{ t("alerts.samples", { count: event.evidence.sampleCount }) }}</span>
              <span>{{ t("alerts.evidence", {
                evidence: event.evidence.diagnosticEvidenceSampleCount,
                total: event.evidence.diagnosticSampleCount,
              }) }}</span>
            </div>
            <div v-if="event.diagnosticFindings.length" class="alert-card__findings">
              <div v-for="finding in event.diagnosticFindings" :key="finding.ruleId">
                <strong>{{ t(alertFindingMessageKey(finding.ruleId)) }}</strong>
                <code>{{ finding.ruleId }}@{{ finding.ruleVersion }}</code>
              </div>
            </div>
            <p v-else class="alert-card__no-diagnosis">{{ t("alerts.noDiagnosis") }}</p>
          </div>
        </details>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import type { AlertEvaluationResponse } from '@performance-platform/protocol'
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  alertMetricName,
  alertSeverity,
  alertFindingMessageKey,
  formatAlertThreshold,
  formatAlertValue,
} from './alert-presentation.js'

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  evaluation: AlertEvaluationResponse | null
}>()
const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()

const sortedEvents = computed(() => [...(props.evaluation?.events ?? [])].sort((left, right) => {
  const severityDifference = Number(alertSeverity(right) === 'POOR') - Number(alertSeverity(left) === 'POOR')
  return severityDifference || alertMetricName(left).localeCompare(alertMetricName(right))
}))

function formatRange(from: string, to: string): string {
  const formatter = new Intl.DateTimeFormat(locale.value, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
  return `${formatter.format(new Date(from))} — ${formatter.format(new Date(to))} UTC`
}

function handleKeydown(event: KeyboardEvent): void {
  if (props.open && event.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.alert-drawer-layer{position:fixed;inset:0;z-index:50}.alert-drawer-backdrop{position:absolute;inset:0;width:100%;border:0;border-radius:0;background:#000815b8;backdrop-filter:blur(3px)}.alert-drawer{position:absolute;inset:0 0 0 auto;width:min(430px,100vw);padding:24px 20px;overflow:auto;color:#dbe8ff;background:linear-gradient(155deg,#07162cf8,#020713 68%);border-left:1px solid #21caed;box-shadow:-20px 0 60px #000b}.alert-drawer__header{display:flex;justify-content:space-between;gap:20px;padding:3px 4px 20px;border-bottom:1px solid #204866}.alert-drawer__header span{color:#51dbf3;font-size:11px;letter-spacing:.18em;text-transform:uppercase}.alert-drawer__header h2{margin-top:4px;font-size:30px;letter-spacing:.04em}.alert-drawer__header p{margin-top:5px;color:#7e9bbd;font-size:13px}.alert-drawer__close{width:36px;height:36px;border-color:#38617c;background:#061225;color:#a9c5dc;font-size:27px;line-height:1}.alert-drawer__state{margin:70px 10px;text-align:center;color:#8fa9c5}.alert-drawer__state--error{color:#ff8091}.alert-list{display:grid;gap:12px;padding-top:18px}.alert-card{border:1px solid #315778;border-left:3px solid #e6b34f;background:#061226cc;box-shadow:inset 0 0 18px #0c5c7b12}.alert-card--poor{border-left-color:#ff5f78}.alert-card summary{position:relative;display:grid;grid-template-columns:1fr auto;gap:13px;padding:16px 32px 15px 14px;cursor:pointer;list-style:none}.alert-card summary::-webkit-details-marker{display:none}.alert-card__identity{display:flex;align-items:center;gap:10px}.alert-card__signal{width:9px;height:9px;border-radius:50%;background:#e6b34f;box-shadow:0 0 12px #e6b34f}.alert-card--poor .alert-card__signal{background:#ff5f78;box-shadow:0 0 12px #ff5f78}.alert-card__identity div{display:flex;flex-direction:column}.alert-card__identity strong{font-size:22px}.alert-card__identity small{color:#e6b34f;font-size:10px;letter-spacing:.08em}.alert-card--poor .alert-card__identity small{color:#ff758a}.alert-card dl{display:flex;gap:17px}.alert-card dl div{display:flex;flex-direction:column;align-items:flex-end}.alert-card dt{color:#7191af;font-size:10px;letter-spacing:.08em}.alert-card dd{color:#f4f8ff;font-size:14px;white-space:nowrap}.alert-card__chevron{position:absolute;right:12px;top:25px;color:#7396b5;transition:transform .2s}.alert-card[open] .alert-card__chevron{transform:rotate(180deg)}.alert-card__details{padding:0 14px 15px;border-top:1px solid #173c58}.alert-card__evidence{display:flex;justify-content:space-between;gap:12px;padding:12px 0;color:#7f9fbd;font-size:12px}.alert-card__findings{display:grid;gap:8px}.alert-card__findings div{display:grid;gap:5px;padding:10px 11px;background:#0a1d32;border:1px solid #1e4865}.alert-card__findings strong{font-size:13px;font-weight:500}.alert-card__findings code{color:#54cce1;font-size:10px}.alert-card__no-diagnosis{padding:11px;color:#9db2c9;background:#0a1728;font-size:12px}@media(max-width:520px){.alert-drawer{padding:18px 14px}.alert-card dl{gap:9px}.alert-card summary{grid-template-columns:1fr}.alert-card dl div{align-items:flex-start}}
</style>
