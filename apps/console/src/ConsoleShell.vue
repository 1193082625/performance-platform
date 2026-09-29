<template>
  <main v-if="loadingSession" class="session-loader" aria-live="polite">
    <div class="loader-mark"><span></span><span></span><span></span></div>
    <p>正在建立安全会话</p>
  </main>

  <main v-else-if="user === null" class="auth-shell">
    <section class="auth-story" aria-labelledby="platform-title">
      <div class="wordmark">
        <span class="brand-mark">P</span><span>PERFORMANCE / PLATFORM</span>
      </div>
      <div class="story-copy">
        <p class="eyebrow">REAL-TIME WEB OBSERVABILITY</p>
        <h1 id="platform-title">
          把每一次性能波动，<br /><em>变成可行动的证据。</em>
        </h1>
        <p>
          从 Core Web Vitals 到内存健康，在同一个控制台里定位问题、验证优化。
        </p>
      </div>
      <dl class="signal-grid">
        <div>
          <dt>5</dt>
          <dd>核心性能指标</dd>
        </div>
        <div>
          <dt>LIVE</dt>
          <dd>实时事件采集</dd>
        </div>
        <div>
          <dt>24H</dt>
          <dd>趋势诊断视图</dd>
        </div>
      </dl>
      <div class="orbit" aria-hidden="true"><i></i><i></i></div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <header>
          <span class="status-dot"></span>
          <p>CONSOLE ACCESS</p>
          <small>SECURE SESSION</small>
        </header>
        <div class="auth-heading">
          <p class="eyebrow">
            {{ registerMode ? 'CREATE ACCOUNT' : 'WELCOME BACK' }}
          </p>
          <h2>{{ registerMode ? '创建你的监控空间' : '登录监控控制台' }}</h2>
          <p>
            {{
              registerMode
                ? '注册后即可创建项目和 Web 应用。'
                : '继续查看项目性能与诊断数据。'
            }}
          </p>
        </div>
        <div class="mode-tabs" role="tablist" aria-label="账号操作">
          <button
            :class="{ active: !registerMode }"
            type="button"
            role="tab"
            :aria-selected="!registerMode"
            @click="setRegisterMode(false)"
          >
            登录
          </button>
          <button
            :class="{ active: registerMode }"
            type="button"
            role="tab"
            :aria-selected="registerMode"
            @click="setRegisterMode(true)"
          >
            注册
          </button>
        </div>
        <form class="stack-form" @submit.prevent="submit">
          <label v-if="registerMode"
            ><span>姓名</span
            ><input
              v-model.trim="name"
              required
              maxlength="50"
              autocomplete="name"
              placeholder="你的姓名"
          /></label>
          <label
            ><span>手机号</span
            ><input
              v-model.trim="phone"
              required
              inputmode="numeric"
              autocomplete="tel"
              placeholder="请输入手机号"
          /></label>
          <label
            ><span>密码</span
            ><input
              v-model="password"
              required
              type="password"
              minlength="6"
              :autocomplete="registerMode ? 'new-password' : 'current-password'"
              placeholder="至少 6 位字符"
          /></label>
          <p v-if="notice" class="notice success" role="status">{{ notice }}</p>
          <p v-if="error" class="notice error" role="alert">{{ error }}</p>
          <button class="primary" :disabled="submitting">
            <span>{{
              submitting ? '处理中…' : registerMode ? '创建账号' : '进入控制台'
            }}</span
            ><b>↗</b>
          </button>
        </form>
        <p class="footnote">登录即表示你正在访问受保护的项目数据。</p>
      </div>
    </section>
  </main>

  <main v-else class="workspace">
    <header class="workspace-bar">
      <button class="workspace-brand" type="button" @click="goProjects">
        <span class="brand-mark">P</span
        ><strong>PERFORMANCE <small>CONSOLE</small></strong>
      </button>
      <nav class="breadcrumbs" aria-label="当前位置">
        <button
          type="button"
          :aria-current="!selectedProject ? 'page' : undefined"
          @click="goProjects"
        >
          项目
        </button>
        <template v-if="selectedProject"
          ><span>/</span
          ><button
            type="button"
            :aria-current="!selectedApp ? 'page' : undefined"
            @click="goApps"
          >
            {{ selectedProject.name }}
          </button></template
        >
        <template v-if="selectedApp"
          ><span>/</span
          ><strong aria-current="page">{{ selectedApp.name }}</strong></template
        >
      </nav>
      <div class="workspace-account">
        <span>{{ user.name }}</span
        ><button type="button" @click="signOut">退出登录</button>
      </div>
    </header>
    <p
      v-if="managementError"
      class="workspace-message notice error"
      role="alert"
    >
      {{ managementError }}
      <button v-if="!selectedProject" @click="loadProjects">重试</button>
    </p>
    <template v-if="selectedProject && selectedApp">
      <App
        :key="selectedProject.id + '/' + selectedApp.appId"
        :scope="{ projectId: selectedProject.id, appId: selectedApp.appId }"
        :selectedApp="selectedApp"
        @go-apps="goApps"
      />
    </template>
    <section v-else class="selection-page">
      <header class="selection-heading">
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
                ? '选择一个应用，进入它的性能监控。'
                : '选择项目，再选择需要查看的应用。'
            }}
          </p>
        </div>
        <button
          class="secondary"
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
      </header>
      <form
        v-if="!selectedProject && showProjectForm"
        class="entry-form"
        @submit.prevent="createProject"
      >
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
        <button class="primary" :disabled="projectSubmitting">
          {{ projectSubmitting ? '创建中…' : '创建项目' }}
        </button>
      </form>
      <form
        v-if="selectedProject && showAppForm"
        class="entry-form"
        @submit.prevent="createApp"
      >
        <label
          >应用名称<input
            v-model.trim="appName"
            required
            maxlength="100"
            placeholder="例如：官网 Web"
        /></label>
        <p>创建到项目：{{ selectedProject.name }} · Web 应用</p>
        <button class="primary" :disabled="appSubmitting">
          {{ appSubmitting ? '创建中…' : '创建应用' }}
        </button>
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
            class="selection-card"
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
          <button
            v-for="appItem in apps"
            :key="appItem.id"
            class="selection-card"
            type="button"
            @click="selectedApp = appItem"
          >
            <span class="card-symbol" aria-hidden="true">▣</span
            ><span class="platform-label">{{
              appItem.platform.toUpperCase()
            }}</span>
            <h2>{{ appItem.name }}</h2>
            <p class="app-identifier">{{ appItem.appId }}</p>
            <span class="card-action"
              >查看监控 <span aria-hidden="true">→</span></span
            >
          </button>
        </div>
        <div v-else class="selection-empty">
          <h2>这个项目还没有应用</h2>
          <p>创建 Web 应用并接入数据后，即可查看性能监控。</p>
          <button class="primary" type="button" @click="showAppForm = true">
            创建第一个应用
          </button>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

const options = {
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
}
const account = createConsoleAccountApi(options)
const scope = createDashboardScopeApi(options)
const user = ref<ConsoleUser | null>(null)
const loadingSession = ref(true)
const projects = ref<DashboardProject[]>([])
const apps = ref<DashboardApp[]>([])
const selectedProjectId = ref('')
const selectedApp = ref<DashboardApp | null>(null)
const showAppForm = ref(false)
const projectsLoading = ref(false)
const appsError = ref(false)
let appsRequestId = 0
const registerMode = ref(false)
const showProjectForm = ref(false)
const name = ref('')
const phone = ref('')
const password = ref('')
const projectName = ref('')
const projectDescription = ref('')
const appName = ref('')
const error = ref('')
const notice = ref('')
const managementError = ref('')
const submitting = ref(false)
const projectSubmitting = ref(false)
const appSubmitting = ref(false)
const appsLoading = ref(false)
const selectedProject = computed(() =>
  projects.value.find((project) => project.id === selectedProjectId.value),
)

function setRegisterMode(value: boolean): void {
  registerMode.value = value
  error.value = ''
  notice.value = ''
}
function goProjects(): void {
  appsRequestId++
  selectedProjectId.value = ''
  selectedApp.value = null
  apps.value = []
  appsLoading.value = false
  showAppForm.value = false
  showProjectForm.value = false
  managementError.value = ''
  appsError.value = false
}
function goApps(): void {
  selectedApp.value = null
  managementError.value = ''
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
    if (requestId === appsRequestId) apps.value = result
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
  if (user.value) await loadProjects()
  loadingSession.value = false
}
async function submit(): Promise<void> {
  submitting.value = true
  error.value = ''
  notice.value = ''
  try {
    if (registerMode.value) {
      await account.register({
        name: name.value,
        phone: phone.value,
        password: password.value,
      })
      registerMode.value = false
      password.value = ''
      notice.value = '账号创建成功，请使用新账号登录。'
    } else {
      user.value = await account.login({
        phone: phone.value,
        password: password.value,
      })
      await loadProjects()
    }
  } catch {
    error.value = registerMode.value
      ? '注册失败，请检查信息或更换手机号。'
      : '登录失败，请检查手机号和密码。'
  } finally {
    submitting.value = false
  }
}
async function selectProject(projectId: string): Promise<void> {
  selectedProjectId.value = projectId
  selectedApp.value = null
  showAppForm.value = false
  appName.value = ''
  managementError.value = ''
  try {
    await loadApps()
  } catch {
    managementError.value = '应用列表加载失败，请稍后重试。'
  }
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
    selectedProjectId.value = project.id
    selectedApp.value = null
    apps.value = []
    appsError.value = false
    projectName.value = ''
    projectDescription.value = ''
    showProjectForm.value = false
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
      appName.value = ''
      showAppForm.value = false
    }
  } catch {
    managementError.value = '应用创建失败，请稍后重试。'
  } finally {
    appSubmitting.value = false
  }
}
async function signOut(): Promise<void> {
  try {
    await account.logout()
    goProjects()
    user.value = null
    projects.value = []
    password.value = ''
  } catch {
    managementError.value = '退出失败，请重试。'
  }
}
onMounted(() => {
  void loadSession()
})
</script>

<style scoped>
:global(body) {
  min-width: 320px;
  background: #05090f;
}
.eyebrow {
  color: #48d8f3;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
}
.session-loader {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 18px;
  text-align: center;
  background: #05090f;
  color: #92a1b7;
}
.loader-mark {
  display: flex;
  gap: 7px;
  justify-content: center;
}
.loader-mark span {
  width: 7px;
  height: 24px;
  background: #35d8f1;
  animation: signal 1s ease-in-out infinite;
}
.loader-mark span:nth-child(2) {
  animation-delay: 0.15s;
}
.loader-mark span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes signal {
  0%,
  100% {
    transform: scaleY(0.35);
    opacity: 0.35;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(420px, 0.85fr);
  overflow: hidden;
  background: #070b12;
  color: #edf5ff;
}
.auth-story {
  position: relative;
  min-height: 100vh;
  padding: 46px clamp(42px, 6vw, 100px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  background:
    radial-gradient(circle at 73% 43%, #0cc5e61f 0 1px, transparent 2px),
    radial-gradient(
      circle at 73% 43%,
      transparent 0 150px,
      #17cce914 151px 152px,
      transparent 153px 220px,
      #17cce90d 221px 222px,
      transparent 223px
    ),
    linear-gradient(145deg, #07131d, #05080e 68%);
  background-size:
    18px 18px,
    auto,
    auto;
}
.auth-story:before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 49.8%, #65e7ff0a 50%, transparent 50.2%),
    linear-gradient(transparent 49.8%, #65e7ff0a 50%, transparent 50.2%);
  background-size: 84px 84px;
}
.wordmark,
.story-copy,
.signal-grid {
  position: relative;
  z-index: 1;
}
.wordmark {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #bbcad8;
  font-size: 12px;
  letter-spacing: 0.16em;
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
.story-copy {
  max-width: 760px;
}
.story-copy h1 {
  margin: 20px 0 24px;
  font-size: clamp(48px, 5.6vw, 84px);
  font-weight: 500;
  line-height: 1.06;
  letter-spacing: -0.045em;
}
.story-copy h1 em {
  color: #63def1;
  font-style: normal;
}
.story-copy > p:last-child {
  max-width: 580px;
  color: #93a4b8;
  font-size: 18px;
  line-height: 1.8;
}
.signal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 620px;
  border-top: 1px solid #253441;
}
.signal-grid > div {
  padding: 22px 24px 0 0;
}
.signal-grid dt {
  color: #e9f8ff;
  font-size: 25px;
  font-weight: 700;
}
.signal-grid dd {
  margin-top: 4px;
  color: #718398;
  font-size: 13px;
  letter-spacing: 0.08em;
}
.orbit {
  position: absolute;
  right: -150px;
  top: 50%;
  width: 530px;
  height: 530px;
  transform: translateY(-50%);
  border: 1px solid #4de2f216;
  border-radius: 50%;
}
.orbit i {
  position: absolute;
  inset: 68px;
  border: 1px solid #4de2f219;
  border-radius: 50%;
}
.orbit i:last-child {
  inset: 142px;
  border-style: dashed;
  animation: orbit 30s linear infinite;
}
@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}
.auth-panel {
  display: grid;
  place-items: center;
  padding: 48px;
  background: linear-gradient(135deg, #0b1018, #05070b);
  border-left: 1px solid #192530;
}
.auth-card {
  width: min(440px, 100%);
}
.auth-card > header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 18px;
  border-bottom: 1px solid #27313c;
  color: #74869a;
  font-size: 11px;
  letter-spacing: 0.15em;
}
.auth-card > header small {
  margin-left: auto;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #54e7a5;
  box-shadow: 0 0 10px #54e7a5;
}
.auth-heading {
  padding: 42px 0 28px;
}
.auth-heading h2 {
  margin: 12px 0 10px;
  font-size: 34px;
  color: #f4f8fc;
}
.auth-heading > p:last-child {
  color: #8796a7;
  font-size: 15px;
}
.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 24px;
  border-bottom: 1px solid #26313d;
}
.mode-tabs button {
  padding: 13px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #718094;
}
.mode-tabs button.active {
  color: #eaf9ff;
  border-bottom: 2px solid #4cdbf1;
}
.stack-form {
  display: grid;
  gap: 18px;
}
.stack-form label,
.create-panel label,
.app-create label {
  display: grid;
  gap: 8px;
}
.stack-form label > span,
.create-panel label > span,
.app-create label > span {
  color: #97a7b9;
  font-size: 12px;
  letter-spacing: 0.08em;
}
.stack-form input,
.create-panel input,
.app-create input {
  width: 100%;
  height: 49px;
  padding: 0 15px;
  border: 1px solid #2b3947;
  border-radius: 3px;
  background: #0a1119;
  color: #f1f8fd;
  font:
    500 16px 'Rajdhani',
    sans-serif;
}
.stack-form input:focus,
.create-panel input:focus,
.app-create input:focus {
  outline: 0;
  border-color: #48d8f3;
  box-shadow: 0 0 0 3px #48d8f313;
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
}
.workspace-bar {
  min-height: 78px;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 16px 36px;
  border-bottom: 1px solid #23323e;
  background: #0a121c;
}
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
.selection-page {
  max-width: 1280px;
  margin: auto;
  padding: 56px 40px 80px;
}
.selection-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 36px;
}
.selection-heading h1 {
  margin: 12px 0;
  font-size: 36px;
  letter-spacing: -0.02em;
}
.selection-heading p:last-child {
  color: #8c9fb1;
  line-height: 1.7;
}
.secondary {
  height: 42px;
  padding: 0 18px;
  color: #70ddea;
  border: 1px solid #315667;
  background: #102330;
  border-radius: 6px;
  white-space: nowrap;
}
.selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 22px;
}
.selection-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 26px;
  border: 1px solid #253847;
  background: #0e1924;
  border-radius: 10px;
  min-height: 230px;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s;
}
.selection-card:hover {
  background: #132531;
  border-color: #4da1b1;
  transform: translateY(-2px);
}
.selection-card h2 {
  font-size: 23px;
  margin: 20px 0 9px;
  overflow-wrap: anywhere;
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
  border-radius: 8px;
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
  align-items: end;
  flex-wrap: wrap;
  gap: 18px;
  padding: 24px;
  margin-bottom: 30px;
  border: 1px solid #315160;
  background: #0e1d28;
  border-radius: 8px;
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
.selection-empty {
  padding: 64px 20px;
  border: 1px dashed #2a4051;
  border-radius: 10px;
  text-align: center;
  color: #8fa5b8;
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
@media (max-width: 1050px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }
  .auth-story {
    min-height: 420px;
  }
  .story-copy h1 {
    font-size: 50px;
  }
  .auth-panel {
    padding: 60px 30px;
  }
  .workspace-bar {
    gap: 20px;
    padding: 16px 24px;
  }
  .workspace-brand strong {
    display: none;
  }
}
@media (max-width: 650px) {
  .auth-story {
    min-height: 370px;
    padding: 30px 24px;
  }
  .story-copy h1 {
    font-size: 38px;
  }
  .story-copy > p:last-child {
    font-size: 15px;
  }
  .signal-grid > div {
    padding-right: 10px;
  }
  .auth-panel {
    padding: 42px 20px;
  }
  .workspace-bar {
    padding: 14px 18px;
    gap: 14px;
    flex-wrap: wrap;
  }
  .breadcrumbs {
    order: 3;
    width: 100%;
    font-size: 14px;
  }
  .workspace-account {
    gap: 12px;
  }
  .selection-page {
    padding: 32px 20px;
  }
  .selection-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 20px;
  }
  .selection-heading h1 {
    font-size: 30px;
  }
  .selection-grid {
    grid-template-columns: 1fr;
  }
  .monitor-context {
    padding: 20px;
  }
  .monitor-context h2 {
    font-size: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .orbit i,
  .loader-mark span {
    animation: none;
  }
  .selection-card {
    transition: none;
  }
}
</style>
