<template>
  <section class="usage-guide">
    <header v-frame class="usage-guide__hero tech-frame">
      <div>
        <p class="eyebrow">GET STARTED / RUM INTEGRATION</p>
        <h1>使用指南</h1>
        <p>从创建应用到看到真实用户性能数据，只需完成以下五步。</p>
      </div>
      <button class="secondary" type="button" @click="emit('go-projects')">
        返回项目列表
      </button>
    </header>

    <aside class="usage-guide__notice">
      <strong>安全提示</strong>
      <p>
        App Key
        用于浏览器上报，最终会随前端构建产物发送到浏览器，不能视为服务器密钥。请勿提交到公开仓库；发现泄露或需要轮换时，创建新
        Key 后停用旧 Key。
      </p>
    </aside>
    <ol v-frame class="usage-guide__steps tech-frame">
      <li class="guide-card">
        <span>01</span>
        <div>
          <h2>创建项目与应用</h2>
          <p>
            在项目列表创建项目，再创建一个 Web 应用。应用标识
            <code>appId</code> 会用于 SDK 配置。
          </p>
        </div>
      </li>
      <li class="guide-card">
        <span>02</span>
        <div>
          <h2>创建并复制 App Key</h2>
          <p>
            在应用卡片点击“配置 App Key”。完整 Key
            仅展示一次，请立即保存到部署环境变量。
          </p>
        </div>
      </li>
      <li class="guide-card guide-card--code">
        <span>03</span>
        <div>
          <h2>配置真实项目</h2>
          <p>安装浏览器 SDK，并在项目的 <code>.env</code> 中配置以下变量。</p>
          <pre><code>pnpm add @performance-platform/browser

VITE_MONITOR_ENDPOINT=https://&lt;监控服务域名&gt;/ingest/v2/events/batch
VITE_MONITOR_APP_KEY=&lt;刚创建的 App Key&gt;
VITE_APP_ID=&lt;应用标识&gt;
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production</code></pre>
        </div>
      </li>
      <li class="guide-card guide-card--code">
        <span>04</span>
        <div>
          <h2>启动性能采集</h2>
          <p>
            在 Web 应用入口创建监控实例，并在初始化后调用 <code>start()</code>。
          </p>
          <pre><code>import { createPaintMonitor } from '@performance-platform/browser'

createPaintMonitor({
  endpoint: import.meta.env.VITE_MONITOR_ENDPOINT,
  appKey: import.meta.env.VITE_MONITOR_APP_KEY,
  appId: import.meta.env.VITE_APP_ID,
  appVersion: import.meta.env.VITE_APP_VERSION,
  environment: import.meta.env.VITE_APP_ENVIRONMENT,
}).start()</code></pre>
        </div>
      </li>
      <li class="guide-card">
        <span>05</span>
        <div>
          <h2>验证并查看监控</h2>
          <p>
            部署真实项目后访问页面并完成一次交互，等待上报。回到控制台打开该应用，即可查看
            FP、FCP、LCP、CLS、INP 与内存数据。
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits<{ 'go-projects': [] }>()
</script>

<style scoped>
.usage-guide__hero {
  --accent: #19d1ef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 30px;
  background: transparent;
}
.usage-guide__hero :deep(.frame-surface),
.guide-card :deep(.frame-surface) {
  fill: #061321;
}
.usage-guide__hero h1 {
  margin: 8px 0;
  font-size: clamp(34px, 4vw, 42px);
}
.usage-guide__hero p:last-child {
  color: #8fa7ba;
}
.eyebrow {
  color: #52ddeb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.usage-guide__steps {
  margin: 22px 0;
  padding: 0;
  list-style: none;
}
.guide-card {
  --accent: #22cae8;
  display: flex;
  gap: 18px;
  padding: 24px;
  background: transparent;
  width: 100%;
}
.guide-card > div {
  width: 100%;
}
.guide-card > span {
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  border: 1px solid #315c73;
  color: #71e6f3;
  font:
    700 14px ui-monospace,
    monospace;
}
.guide-card h2 {
  margin: 0 0 9px;
  font-size: 19px;
}
.guide-card p {
  margin: 0;
  color: #a0b4c4;
  line-height: 1.65;
}
.guide-card--code {
  grid-column: span 2;
}
pre {
  overflow: auto;
  margin: 15px 0 0;
  padding: 15px;
  border: 1px solid #1c3d51;
  background: #020a12;
  color: #98f0fb;
  font:
    12px/1.65 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
}
code {
  color: #84e5f1;
}
.usage-guide__notice {
  padding: 18px 20px;
  border-left: 2px solid #e6b55c;
  background: #2a2314;
  color: #efdcae;
  margin-top: 22px;
}
.usage-guide__notice p {
  margin: 8px 0 0;
  color: #d3c69f;
  line-height: 1.65;
}
@media (max-width: 720px) {
  .usage-guide {
    padding-inline: 12px;
  }
  .usage-guide__hero {
    align-items: flex-start;
    flex-direction: column;
  }
  .usage-guide__steps {
    grid-template-columns: 1fr;
  }
  .guide-card--code {
    grid-column: span 1;
  }
  .guide-card {
    padding: 20px;
  }
}
</style>
