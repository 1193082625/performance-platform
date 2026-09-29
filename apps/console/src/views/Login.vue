<template>
  <main class="auth-shell">
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  createConsoleAccountApi,
  type ConsoleUser,
} from '../api/console-account'

const options = {
  baseUrl: window.location.origin,
  fetch: window.fetch.bind(window),
}
const account = createConsoleAccountApi(options)

const registerMode = ref(false)
const error = ref('')
const notice = ref('')
const name = ref('')
const phone = ref('')
const submitting = ref(false)
const password = ref('')
const user = ref<ConsoleUser | null>(null)

const emit = defineEmits(['load-projects'])

function setRegisterMode(value: boolean): void {
  registerMode.value = value
  error.value = ''
  notice.value = ''
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
      emit('load-projects')
    }
  } catch {
    error.value = registerMode.value
      ? '注册失败，请检查信息或更换手机号。'
      : '登录失败，请检查手机号和密码。'
  } finally {
    submitting.value = false
  }
}
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
.stack-form label {
  display: grid;
  gap: 8px;
}
.stack-form label > span {
  color: #97a7b9;
  font-size: 12px;
  letter-spacing: 0.08em;
}
.stack-form input {
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
.stack-form input:focus {
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
}
@media (prefers-reduced-motion: reduce) {
  .orbit i {
    animation: none;
  }
}
</style>
