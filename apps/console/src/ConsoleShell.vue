<template>
  <Loading v-if="loadingSession" />

  <Login v-else-if="user === null" @authenticated="handleAuthenticated" />

  <main v-else class="workspace">
    <UsageGuide v-if="isGuideRoute" @go-projects="goProjects" />
    <p
      v-if="!isGuideRoute && managementError"
      class="workspace-message notice error"
      role="alert"
    >
      {{ managementError }}
      <button v-if="!selectedProject" @click="loadProjects">重试</button>
    </p>
    <template v-if="!isGuideRoute && selectedProject && selectedApp">
      <App
        :key="selectedProject.id + '/' + selectedApp.appId"
        :scope="{ projectId: selectedProject.id, appId: selectedApp.appId }"
        :selectedApp="selectedApp"
        :user-name="userName || ''"
        @go-apps="goApps"
        @sign-out="signOut"
        @manage-keys="selectedApp && openKeyManager(selectedApp)"
        @open-guide="openGuide"
      />
    </template>
    <AppKeyManager
      v-if="!isGuideRoute && selectedProject && keyManagerApp"
      :project-id="selectedProject.id"
      :app="keyManagerApp"
      @availability-change="updateAppKeyAvailability"
      @open-guide="openGuide"
      @close="closeKeyManager"
    />
    <section v-else-if="!isGuideRoute" class="selection-page">
      <header v-frame class="selection-heading tech-frame">
        <div>
          <p class="eyebrow">
            {{
              selectedProject
                ? 'STEP 02 / SELECT APPLICATION'
                : 'STEP 01 / SELECT PROJECT'
            }}
          </p>
          <h1>{{ selectedProject ? selectedProject.name : '你的项目' }}</h1>
          <p>
            {{
              selectedProject
                ? '选择一个应用。没有启用 App Key 时，请先完成配置；仍可查看历史监控。'
                : '选择项目，再选择需要查看的应用。'
            }}
          </p>
        </div>
        <div class="flex-col gap-12">
          <Logout :user-name="userName" @sign-out="signOut" />
          <div class="selection-heading__actions">
            <button
              class="secondary guide-entry-button"
              type="button"
              @click="openGuide"
            >
              使用指南
            </button>
            <button
              v-if="selectedProject"
              class="secondary back-button"
              type="button"
              @click="goProjects"
            >
              ← 返回项目列表
            </button>
            <button
              class="secondary create-entry-button"
              type="button"
              @click="
                selectedProject
                  ? (showAppForm = !showAppForm)
                  : (showProjectForm = !showProjectForm)
              "
            >
              {{
                selectedProject
                  ? showAppForm
                    ? '取消创建'
                    : '+ 创建应用'
                  : showProjectForm
                    ? '取消创建'
                    : '+ 创建项目'
              }}
            </button>
          </div>
        </div>
      </header>
      <form
        v-if="!selectedProject && showProjectForm"
        class="entry-form"
        @submit.prevent="createProject"
      >
        <button
          class="entry-form__close"
          type="button"
          aria-label="关闭创建项目"
          @click="showProjectForm = !showProjectForm"
        >
          ×
        </button>
        <label
          >项目名称<input
            v-model.trim="projectName"
            required
            maxlength="100"
            placeholder="例如：电商平台"
        /></label>
        <label
          >项目说明<input
            v-model.trim="projectDescription"
            placeholder="这个项目用于什么？（可选）"
        /></label>
        <div class="entry-form__btn-group">
          <button class="default" @click="showProjectForm = !showProjectForm">
            取消创建
          </button>
          <button class="primary" :disabled="projectSubmitting">
            {{ projectSubmitting ? '创建中…' : '创建项目' }}
          </button>
        </div>
      </form>
      <form
        v-if="selectedProject && showAppForm"
        class="entry-form"
        @submit.prevent="createApp"
      >
        <button
          class="entry-form__close"
          type="button"
          aria-label="关闭创建应用"
          @click="showAppForm = !showAppForm"
        >
          ×
        </button>
        <p>创建到项目：{{ selectedProject.name }} · Web 应用</p>
        <label
          >应用名称<input
            v-model.trim="appName"
            required
            maxlength="100"
            placeholder="例如：官网 Web"
        /></label>
        <div class="entry-form__btn-group">
          <button class="default" @click="showAppForm = !showAppForm">
            取消创建
          </button>
          <button class="primary" :disabled="appSubmitting">
            {{ appSubmitting ? '创建中…' : '创建应用' }}
          </button>
        </div>
      </form>
      <p
        v-if="projectsLoading || appsLoading"
        class="selection-empty"
        role="status"
      >
        {{ selectedProject ? '正在加载应用…' : '正在加载项目…' }}
      </p>
      <template v-else-if="!selectedProject">
        <div v-if="projects.length" class="selection-grid">
          <button
            v-for="project in projects"
            :key="project.id"
            v-frame
            class="selection-card tech-frame"
            type="button"
            @click="selectProject(project.id)"
          >
            <span class="card-symbol" aria-hidden="true">▱</span>
            <h2>{{ project.name }}</h2>
            <p>{{ project.description || '暂无项目说明' }}</p>
            <span class="card-action"
              >查看应用 <span aria-hidden="true">→</span></span
            >
          </button>
        </div>
        <div v-else-if="!managementError" class="selection-empty">
          <h2>还没有项目</h2>
          <p>先创建项目，再为项目添加应用。</p>
          <button class="primary" type="button" @click="showProjectForm = true">
            创建第一个项目
          </button>
        </div>
      </template>
      <template v-else>
        <p v-if="appsError" class="notice error" role="alert">
          应用加载失败。<button type="button" @click="loadApps">
            重新加载
          </button>
        </p>
        <div v-else-if="apps.length" class="selection-grid">
          <article
            v-for="appItem in apps"
            :key="appItem.id"
            v-frame
            class="selection-card tech-frame"
          >
            <button
              class="app-card__entry"
              type="button"
              :disabled="appKeyStatus(appItem) === 'loading'"
              @click="selectApp(appItem)"
            >
              <span class="card-symbol" aria-hidden="true">▣</span
              ><span class="platform-label">{{
                appItem.platform.toUpperCase()
              }}</span>
              <h2>{{ appItem.name }}</h2>
              <p class="app-identifier">{{ appItem.appId }}</p>
              <span class="card-action">
                {{ appCardAction(appItem) }} <span aria-hidden="true">→</span>
              </span>
            </button>
            <button
              v-if="appKeyStatus(appItem) === 'all-revoked'"
              class="history-button"
              type="button"
              @click="enterMonitoring(appItem)"
            >
              查看历史监控
            </button>
          </article>
        </div>
        <div v-else class="selection-empty">
          <h2>这个项目还没有应用</h2>
          <p>创建应用并接入数据后，即可查看性能监控。</p>
          <button class="primary" type="button" @click="showAppForm = true">
            创建第一个应用
          </button>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import App from './App.vue'
import {
  createConsoleAccountApi,
  type ConsoleUser,
} from './api/console-account.js'
import {
  createDashboardScopeApi,
  type DashboardApp,
  type DashboardProject,
} from './api/dashboard-scope.js'
import Loading from './components/Loading.vue'
import Login from './views/Login.vue'
import Logout from './components/Logout.vue'
import AppKeyManager from './components/AppKeyManager.vue'
import UsageGuide from './components/UsageGuide.vue'
import { createProjectAppKeyApi } from './api/project-app-keys.js'

const route = useRoute()
const router = useRouter()

const options = {
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
}
const account = createConsoleAccountApi(options)
const scope = createDashboardScopeApi(options)
const appKeys = createProjectAppKeyApi(options)
const user = ref<ConsoleUser | null>(null)
const loadingSession = ref(true)
const projects = ref<DashboardProject[]>([])
const apps = ref<DashboardApp[]>([])
const selectedProjectId = ref('')
const selectedApp = ref<DashboardApp | null>(null)
const keyManagerApp = ref<DashboardApp | null>(null)
const showAppForm = ref(false)
type AppKeyAvailability =
  'loading' | 'active' | 'never-created' | 'all-revoked' | 'unavailable'
const appKeyAvailability = ref<Record<string, AppKeyAvailability>>({})
const projectsLoading = ref(false)
const appsError = ref(false)
let appsRequestId = 0
const showProjectForm = ref(false)
const projectName = ref('')
const projectDescription = ref('')
const appName = ref('')
const managementError = ref('')
const projectSubmitting = ref(false)
const appSubmitting = ref(false)
const appsLoading = ref(false)
const selectedProject = computed(() =>
  projects.value.find((project) => project.id === selectedProjectId.value),
)
const userName = computed(() => {
  return user.value?.name ?? ''
})
const isGuideRoute = computed(() => route.name === 'guide')

async function handleAuthenticated(
  authenticatedUser: ConsoleUser,
): Promise<void> {
  user.value = authenticatedUser
  await loadProjects()
  await syncRoute()
}

function goProjects(): void {
  void router.push({ name: 'projects' })
}
function openGuide(): void {
  keyManagerApp.value = null
  void router.push({ name: 'guide' })
}
function goApps(): void {
  if (!selectedProjectId.value) return
  void router.push({
    name: 'applications',
    params: { projectId: selectedProjectId.value },
  })
}
async function loadApps(): Promise<void> {
  const projectId = selectedProjectId.value
  if (!projectId) return
  const requestId = ++appsRequestId
  appsLoading.value = true
  appsError.value = false
  apps.value = []
  try {
    const result = await scope.listApps(projectId)
    if (requestId === appsRequestId) {
      apps.value = result
      appKeyAvailability.value = Object.fromEntries(
        result.map((appItem) => [appItem.id, 'loading']),
      )
      void Promise.all(
        result.map(async (appItem) => {
          try {
            const keys = await appKeys.list(projectId, appItem.appId)

            if (requestId === appsRequestId) {
              appKeyAvailability.value = {
                ...appKeyAvailability.value,
                [appItem.id]: keys.some((key) => !key.revokedAt)
                  ? 'active'
                  : keys.length
                    ? 'all-revoked'
                    : 'never-created',
              }
            }
          } catch {
            if (requestId === appsRequestId) {
              appKeyAvailability.value = {
                ...appKeyAvailability.value,
                [appItem.id]: 'unavailable',
              }
            }
          }
        }),
      )
    }
  } catch {
    if (requestId === appsRequestId) appsError.value = true
  } finally {
    if (requestId === appsRequestId) appsLoading.value = false
  }
}
async function loadProjects(): Promise<void> {
  projectsLoading.value = true
  managementError.value = ''
  try {
    projects.value = await scope.listProjects()
  } catch {
    managementError.value = '项目加载失败，请重试。'
  } finally {
    projectsLoading.value = false
  }
}
async function loadSession(): Promise<void> {
  try {
    user.value = await account.currentUser()
  } catch {
    user.value = null
  }
  if (user.value) {
    await loadProjects()
    await syncRoute()
  }
  loadingSession.value = false
}
async function selectProject(projectId: string): Promise<void> {
  await router.push({ name: 'applications', params: { projectId } })
}
async function createProject(): Promise<void> {
  projectSubmitting.value = true
  managementError.value = ''
  try {
    const project = await scope.createProject({
      name: projectName.value,
      description: projectDescription.value,
    })
    projects.value.push(project)
    projectName.value = ''
    projectDescription.value = ''
    showProjectForm.value = false
    await router.push({
      name: 'applications',
      params: { projectId: project.id },
    })
  } catch {
    managementError.value = '项目创建失败，请检查名称后重试。'
  } finally {
    projectSubmitting.value = false
  }
}
async function createApp(): Promise<void> {
  if (!selectedProjectId.value) return
  appSubmitting.value = true
  managementError.value = ''
  const projectId = selectedProjectId.value
  try {
    const created = await scope.createApp(projectId, {
      name: appName.value,
      platform: 'web',
    })
    if (selectedProjectId.value === projectId) {
      apps.value.push(created)
      appKeyAvailability.value = {
        ...appKeyAvailability.value,
        [created.id]: 'never-created',
      }
      appName.value = ''
      showAppForm.value = false
    }
  } catch {
    managementError.value = '应用创建失败，请稍后重试。'
  } finally {
    appSubmitting.value = false
  }
}
function appKeyStatus(appItem: DashboardApp): AppKeyAvailability {
  return appKeyAvailability.value[appItem.id] ?? 'loading'
}
function appCardAction(appItem: DashboardApp): string {
  const status = appKeyStatus(appItem)
  if (status === 'active') return '查看监控'
  if (status === 'loading') return '检查 App Key…'
  if (status === 'never-created' || status === 'all-revoked') {
    return '配置 App Key'
  }
  return '检查密钥失败，点击重试'
}
function enterMonitoring(appItem: DashboardApp): void {
  void router.push({
    name: 'monitor',
    params: { projectId: appItem.projectId, appId: appItem.appId },
  })
}
function openKeyManager(appItem: DashboardApp): void {
  keyManagerApp.value = appItem
}
function selectApp(appItem: DashboardApp): void {
  if (appKeyStatus(appItem) === 'active') {
    enterMonitoring(appItem)
    return
  }
  openKeyManager(appItem)
}
function updateAppKeyAvailability(availability: {
  hasActiveKey: boolean
  hasAnyKey: boolean
}): void {
  const appItem = keyManagerApp.value
  if (!appItem) return
  appKeyAvailability.value = {
    ...appKeyAvailability.value,
    [appItem.id]: availability.hasActiveKey
      ? 'active'
      : availability.hasAnyKey
        ? 'all-revoked'
        : 'never-created',
  }
}
function closeKeyManager(): void {
  keyManagerApp.value = null
}
async function signOut(): Promise<void> {
  try {
    await account.logout()
    goProjects()
    user.value = null
    projects.value = []
  } catch {
    managementError.value = '退出失败，请重试。'
  }
}
async function syncRoute(): Promise<void> {
  if (user.value === null) return
  const projectId =
    typeof route.params.projectId === 'string' ? route.params.projectId : ''
  const appId = typeof route.params.appId === 'string' ? route.params.appId : ''

  if (!projectId) {
    appsRequestId++
    selectedProjectId.value = ''
    selectedApp.value = null
    apps.value = []
    appsLoading.value = false
    showAppForm.value = false
    keyManagerApp.value = null
    appKeyAvailability.value = {}
    showProjectForm.value = false
    managementError.value = ''
    appsError.value = false
    return
  }

  selectedProjectId.value = projectId
  selectedApp.value = null
  showAppForm.value = false
  appName.value = ''
  managementError.value = ''
  await loadApps()
  if (projectId !== selectedProjectId.value) return
  selectedApp.value = appId
    ? (apps.value.find((appItem) => appItem.appId === appId) ?? null)
    : null
}
watch(
  () => [route.params.projectId, route.params.appId],
  () => void syncRoute(),
)
onMounted(() => {
  void loadSession()
})
</script>

<style scoped>
:global(body) {
  min-width: 320px;
  background: #05090f;
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
.eyebrow {
  color: #48d8f3;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid #43d7ef;
  color: #5ce7fb;
  font-size: 18px;
  font-weight: 700;
  box-shadow: inset 0 0 16px #10cae31f;
  clip-path: polygon(
    8px 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%,
    0 8px
  );
}
.notice {
  padding: 11px 13px;
  border-left: 2px solid;
  font-size: 13px;
}
.notice.error,
.management-error {
  color: #ff98a4;
  background: #34131a;
  border-color: #ff5f72;
}
.notice.success {
  color: #78e9ad;
  background: #0c2b21;
  border-color: #46d897;
}
.primary {
  height: 49px;
  padding: 0 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid #55e2f5;
  border-radius: 3px;
  background: #53dbee;
  color: #041015;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 10px 30px #1dbdd324;
}
.primary:hover {
  background: #7ceafa;
  color: #041015;
  transform: translateY(-1px);
}
.primary:disabled {
  opacity: 0.55;
  cursor: wait;
}
.primary b {
  margin-left: auto;
}
.footnote {
  margin-top: 26px;
  text-align: center;
  color: #536274;
  font-size: 12px;
}
.workspace {
  min-height: 100vh;
  background: #080e16;
  color: #e7eff8;
  padding: 10px;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}
.breadcrumbs button {
  border: 0;
  background: none;
  padding: 8px 4px;
  color: #8fa6ba;
  font-size: 15px;
}
.breadcrumbs button:hover {
  color: #6ce2ee;
}
.breadcrumbs [aria-current='page'] {
  color: #e7eff8;
}
.breadcrumbs > span {
  color: #405366;
}
.selection-page {
  margin: 0 auto;
}
.selection-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  min-height: 132px;
  margin-bottom: 20px;
  padding: 24px 30px;
  --accent: #13ccf6;
  background: transparent;
}
.selection-heading :deep(.frame-surface) {
  fill: #061323;
  fill-opacity: 0.94;
}
.selection-heading :deep(.frame-outline) {
  stroke: #48a7ec;
}
.selection-heading :deep(.frame-trailing) {
  stroke: #8a89e9;
  opacity: 0.9;
}
.selection-heading h1 {
  margin: 8px 0;
  font-size: clamp(30px, 3.1vw, 42px);
  line-height: 1;
  letter-spacing: -0.02em;
}
.selection-heading p:last-child {
  color: #8c9fb1;
  line-height: 1.7;
}
.selection-heading__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.secondary {
  height: 44px;
  padding: 0 20px;
  color: #70ddea;
  border: 1px solid #2c7191;
  border-radius: 0;
  background: #082239;
  white-space: nowrap;
}
.selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 14px;
}
.selection-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  min-height: 244px;
  padding: 24px;
  --accent: #13ccf6;
  border: 0;
  border-radius: 0;
  background: transparent;
  transition:
    filter 0.15s,
    transform 0.15s;
}
.selection-card:hover {
  background: transparent;
  filter: drop-shadow(0 0 11px #00bedd38);
  transform: translateY(-2px);
}
.selection-card :deep(.frame-surface) {
  fill: #061321;
  transition: fill 0.15s;
}
.selection-card :deep(.frame-outline) {
  stroke: #08b9e7;
  transition:
    stroke 0.15s,
    opacity 0.15s;
}
.selection-card:hover :deep(.frame-surface) {
  fill: #092033;
}
.selection-card:hover :deep(.frame-outline) {
  stroke: #63eaff;
  opacity: 1;
}
.selection-card h2 {
  font-size: 23px;
  margin: 20px 0 9px;
  overflow-wrap: anywhere;
}
.app-card__entry {
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}
.app-card__entry:disabled {
  cursor: wait;
  opacity: 0.7;
}
.app-card__entry > .app-identifier {
  color: #8c9fb1;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.history-button {
  align-self: stretch;
  min-height: 38px;
  margin-top: 10px;
  border: 1px solid #315a73;
  background: #071a2a;
  color: #94dce6;
  font-size: 13px;
}
.history-button:hover {
  border-color: #62e0ee;
  color: #d5fbff;
}
.selection-card > p {
  color: #8c9fb1;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.card-symbol {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #70ddea;
  border: 1px solid #285366;
  background: #102c3a;
  border-radius: 0;
  font-size: 24px;
}
.card-action {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: auto;
  padding-top: 24px;
  color: #6cd7e5;
  font-size: 14px;
}
.platform-label {
  position: absolute;
  right: 26px;
  top: 32px;
  color: #7898b0;
  font-size: 11px;
  letter-spacing: 0.12em;
}
.app-identifier {
  font: 12px/1.6 monospace;
}
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  margin-bottom: 30px;
  border: 1px solid #315160;
  background: #0e1d28;
  border-radius: 0;
  width: 500px;
  position: fixed;
  z-index: 999;
  left: 50%;
  top: 50%;
  margin-top: -10%;
  margin-left: -250px;
  padding-top: 50px;
}
.entry-form__close {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 999;
  width: 38px;
  height: 38px;
  border-color: #315a73;
  font-size: 27px;
  line-height: 1;
}
.entry-form label {
  flex: 1;
  min-width: 200px;
  display: grid;
  gap: 9px;
  color: #afbfcc;
  font-size: 14px;
}
.entry-form input {
  height: 46px;
  padding: 0 13px;
  background: #08131d;
  border: 1px solid #345062;
  border-radius: 5px;
  color: #e7eff8;
  font: inherit;
}
.entry-form input:focus {
  outline: 2px solid #60d7e7;
  outline-offset: 2px;
}
.entry-form > p {
  align-self: center;
  color: #8a9fad;
}
.entry-form__btn-group {
  display: flex;
  gap: 26px;
  margin-top: 16px;
}
.entry-form__btn-group button {
  flex: 1;
}
.entry-form__btn-group button.default {
  height: 49px;
  padding: 0 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 10px 30px #1dbdd324;

  color: #70ddea;
  border: 1px solid #2c7191;
  background: #082239;
  white-space: nowrap;
}
.selection-empty {
  padding: 64px 20px;
  border: 1px dashed #2a4051;
  border-radius: 0;
  text-align: center;
  color: #8fa5b8;
  width: 17%;
}
.selection-empty h2 {
  color: #e0eaf4;
  margin-bottom: 12px;
}
.selection-empty .primary {
  margin: 24px auto 0;
}
.workspace-message {
  margin: 20px 36px;
}
.workspace :deep(.topbar) {
  height: auto;
  min-height: 90px;
  flex-wrap: wrap;
  gap: 20px;
}
.workspace :deep(.brand h1) {
  font-size: 28px;
}
.workspace :deep(.brand svg) {
  width: 38px;
  height: 38px;
}
.workspace :deep(.dashboard) {
  height: auto;
  min-height: 0;
}
.workspace :deep(.main-shell) {
  height: auto;
}
@media (max-width: 650px) {
  .breadcrumbs {
    order: 3;
    width: 100%;
    font-size: 14px;
  }
  .selection-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
    min-height: 0;
    padding: 22px 20px;
  }
  .selection-heading h1 {
    font-size: 30px;
  }
  .selection-grid {
    grid-template-columns: 1fr;
  }
}
@media (prefers-reduced-motion: reduce) {
  .selection-card {
    transition: none;
  }
}
</style>
