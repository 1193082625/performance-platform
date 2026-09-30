<template>
  <header v-frame class="topbar tech-frame">
    <div class="flex">
      <div class="brand workspace-brand">
        <Icon name="pulse" />
        <strong>PERFORMANCE <small>CONSOLE</small></strong>
      </div>
      <div class="monitor-context" v-if="selectedApp">
        <div class="flex item-center">
          <!-- <span class="eyebrow">APPLICATION MONITORING</span> -->
          <h2>
            {{ selectedApp?.name }}
            <small>{{ selectedApp?.platform?.toUpperCase() }}</small>
          </h2>
        </div>
      </div>
    </div>
    <div class="header-center" v-if="selectedApp">
      <div class="sample-total">
        <span>{{ t('app.totalSamples') }}</span>
        <strong>{{ n(totalSamples || 0) }}</strong>
      </div>
      <MetricsRangeSelector
        v-if="range"
        :range="range"
        @select="emit('select-range', $event)"
      />
      <!-- <div class="date-time">
      <Icon name="clock" />
      <div>
        <span>{{ dashboardDate }}</span
        ><strong>{{ dashboardTime }} UTC</strong>
      </div>
    </div> -->

      <button
        type="button"
        class="locale-toggle"
        :title="t('app.switchLanguage')"
        @click="toggleLocale"
      >
        {{ locale === 'en-US' ? '中文' : 'EN' }}
      </button>
      <button
        type="button"
        class="alert-count-button"
        :class="{ 'alert-count-button--active': (props.alertCount || 0) > 0 }"
        :aria-label="t('alerts.open', { count: props.alertCount })"
        @click="emit('open-alerts')"
      >
        <span>{{ t('alerts.current') }}</span>
        <strong>{{ props.alertCount }}</strong>
      </button>
      <button class="secondary" type="button" @click="emit('go-apps')">
        切换应用
      </button>
      <button class="secondary" type="button" @click="emit('manage-keys')">
        应用密钥
      </button>
    </div>
    <div class="header-account-actions">
      <button class="guide-button" type="button" @click="emit('open-guide')">
        使用指南
      </button>
      <Logout :user-name="userName" @sign-out="emit('sign-out')" />
    </div>
  </header>
</template>
<script setup lang="ts">
import Icon from './Icon.vue'
import { computed } from 'vue'
import MetricsRangeSelector from './MetricsRangeSelector.vue'
import { useI18n } from 'vue-i18n'
import { LOCALE_STORAGE_KEY, type AppLocale } from '../i18n'
import type { DashboardApp } from '../api/dashboard-scope'
import type { MetricsRange } from '../composables/metrics-range.js'
import Logout from './Logout.vue'
const { t, n, locale } = useI18n()
document.documentElement.lang = locale.value
function toggleLocale(): void {
  const nextLocale: AppLocale = locale.value === 'en-US' ? 'zh-CN' : 'en-US'
  locale.value = nextLocale
  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
  document.documentElement.lang = nextLocale
}
const props = defineProps<{
  userName: string
  selectedApp?: DashboardApp
  totalSamples?: number
  alertCount?: number
  range?: MetricsRange
}>()
const emit = defineEmits<{
  'select-range': [range: MetricsRange]
  'go-apps': []
  'manage-keys': []
  'sign-out': []
  'open-alerts': []
  'open-guide': []
}>()
const selectedApp = computed(() => props.selectedApp)
</script>

<style scoped>
.workspace-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: none;
  text-align: left;
}
.header-account-actions { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.guide-button { height: 34px; padding: 0 10px; border-color: #2a556d; background: #061b2d; color: #93e8f1; font-size: 13px; }
.workspace-brand strong {
  font-size: 14px;
  letter-spacing: 0.1em;
}
.workspace-brand small {
  display: block;
  color: #71879b;
  font-size: 10px;
  letter-spacing: 0.2em;
  margin-top: 3px;
}
.monitor-context {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 24px 32px;
}
.monitor-context h2 {
  margin-top: 7px;
  font-size: 26px;
}
.monitor-context small {
  font-size: 11px;
  color: #859caf;
  margin-left: 12px;
}
.secondary {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 9px;
  height: 40px;
  padding: 0 12px;
  white-space: nowrap;
  color: #8defff;
  border-color: #245272;
  background: #03152a;
}
@media (max-width: 650px) {
  .workspace-account {
    gap: 12px;
  }
}
</style>
