<template>
  <div class="key-dialog-backdrop" @click.self="$emit('close')">
    <section v-frame class="key-dialog tech-frame" role="dialog" aria-modal="true" aria-labelledby="app-key-title">
      <header class="key-dialog__header">
        <div>
          <p class="eyebrow">APPLICATION CREDENTIALS</p>
          <h2 id="app-key-title">{{ app.name }} 的 App Key</h2>
          <p>每个密钥仅能向此应用上报数据。</p>
        </div>
        <button class="key-dialog__close" type="button" aria-label="关闭密钥管理" @click="$emit('close')">×</button>
      </header>

      <div v-if="plainTextKey" class="key-secret" role="status">
        <p><strong>请立即复制此密钥。</strong> 为安全起见，关闭后将无法再次查看完整内容。</p>
        <code>{{ plainTextKey }}</code>
        <button class="primary" type="button" @click="copyPlainText">{{ copyLabel }}</button>
      </div>

      <div class="key-dialog__actions">
        <p>将密钥放入真实项目的 SDK 配置中，勿提交到公开仓库。</p>
        <button class="secondary" type="button" :disabled="creating" @click="createKey">
          {{ creating ? '创建中…' : '+ 创建 App Key' }}
        </button>
      </div>

      <p v-if="error" class="notice error" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="key-dialog__empty" role="status">正在加载密钥…</p>
      <div v-else-if="keys.length" class="key-list">
        <article v-for="key in keys" :key="key.id" class="key-row" :class="{ revoked: key.revokedAt }">
          <div>
            <strong>{{ key.prefix }}••••</strong>
            <span>创建于 {{ formatDate(key.createdAt) }}</span>
          </div>
          <div class="key-row__state">
            <span>{{ key.revokedAt ? '已停用' : '启用中' }}</span>
            <button v-if="!key.revokedAt" class="danger" type="button" :disabled="revokingId === key.id" @click="revokeKey(key.id)">
              {{ revokingId === key.id ? '停用中…' : '停用' }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="key-dialog__empty">还没有 App Key。创建一个后即可接入真实项目。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { DashboardApp } from '../api/dashboard-scope.js'
import {
  createProjectAppKeyApi,
  type ProjectAppKey,
} from '../api/project-app-keys.js'

const props = defineProps<{ projectId: string; app: DashboardApp }>()
defineEmits<{ close: [] }>()

const api = createProjectAppKeyApi({
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
})
const keys = ref<ProjectAppKey[]>([])
const loading = ref(true)
const creating = ref(false)
const revokingId = ref('')
const error = ref('')
const plainTextKey = ref('')
const copyLabel = ref('复制密钥')

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

async function loadKeys(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    keys.value = await api.list(props.projectId, props.app.appId)
  } catch {
    error.value = '密钥加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function createKey(): Promise<void> {
  creating.value = true
  error.value = ''
  try {
    const created = await api.create(props.projectId, props.app.appId)
    plainTextKey.value = created.plainText
    copyLabel.value = '复制密钥'
    keys.value.unshift(created)
  } catch {
    error.value = '密钥创建失败，请稍后重试。'
  } finally {
    creating.value = false
  }
}

async function copyPlainText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(plainTextKey.value)
    copyLabel.value = '已复制'
  } catch {
    copyLabel.value = '请手动复制'
  }
}

async function revokeKey(keyId: string): Promise<void> {
  revokingId.value = keyId
  error.value = ''
  try {
    await api.revoke(props.projectId, props.app.appId, keyId)
    keys.value = keys.value.map((key) =>
      key.id === keyId ? { ...key, revokedAt: new Date().toISOString() } : key,
    )
  } catch {
    error.value = '密钥停用失败，请稍后重试。'
  } finally {
    revokingId.value = ''
  }
}

onMounted(() => void loadKeys())
</script>

<style scoped>
.key-dialog-backdrop { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 24px; background: #010716ba; backdrop-filter: blur(8px); }
.key-dialog { --accent: #17d6f3; width: min(100%, 720px); padding: 30px; background: transparent; }
.key-dialog :deep(.frame-surface) { fill: #06111ff7; }
.key-dialog__header, .key-dialog__actions, .key-row, .key-row__state { display: flex; align-items: center; }
.key-dialog__header, .key-dialog__actions { justify-content: space-between; gap: 20px; }
.key-dialog__header h2 { margin: 8px 0; font-size: 30px; }
.key-dialog__header p:last-child, .key-dialog__actions p, .key-row span { color: #8da1b5; }
.key-dialog__close { width: 38px; height: 38px; border-color: #315a73; font-size: 27px; line-height: 1; }
.key-secret { margin: 24px 0; padding: 18px; border: 1px solid #39d5ed; background: #042239; }
.key-secret p { color: #bcecf4; line-height: 1.5; }
.key-secret code { display: block; overflow-x: auto; margin: 14px 0; padding: 12px; color: #85f1ff; background: #010b16; font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.key-dialog__actions { padding: 18px 0; border-block: 1px solid #183a52; }
.key-list { margin-top: 14px; }
.key-row { justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px solid #183a52; }
.key-row strong, .key-row span { display: block; }
.key-row strong { color: #d8f9ff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.key-row span { margin-top: 5px; font-size: 13px; }
.key-row__state { gap: 13px; }
.key-row__state > span { color: #75e7a6; white-space: nowrap; }
.key-row.revoked { opacity: .58; }
.key-row.revoked .key-row__state > span { color: #9aacba; }
.danger { color: #ffacb6; border-color: #7b3544; background: #2a1118; }
.key-dialog__empty { padding: 36px 0 12px; color: #8da1b5; text-align: center; }
@media (max-width: 600px) { .key-dialog-backdrop { align-items: end; padding: 12px; } .key-dialog { padding: 24px 20px; } .key-dialog__header, .key-dialog__actions { align-items: flex-start; } .key-dialog__actions { flex-direction: column; } .key-row { align-items: flex-start; flex-direction: column; } }
</style>
