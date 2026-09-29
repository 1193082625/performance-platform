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
    </div>
    <div class="workspace-account">
      <span>欢迎你，{{ userName }}</span>
      <button type="button" @click="$emit('sign-out')">退出登录</button>
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
  'sign-out': []
  'open-alerts': []
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
  background: #0a131d;
  border-bottom: 1px solid #233541;
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
.workspace-account {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
  white-space: nowrap;
  font-size: 14px;
  color: #9eafc0;
}
.workspace-account button {
  padding: 8px 12px;
  border-color: #2a3c4c;
  background: transparent;
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
  .monitor-context {
    padding: 20px;
  }
  .monitor-context h2 {
    font-size: 22px;
  }
  .workspace-account {
    gap: 12px;
  }
}
</style>
