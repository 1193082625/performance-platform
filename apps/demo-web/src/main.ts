import './style.css'
import typescriptLogo from './assets/typescript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { setupCounter } from './counter.ts'
import { createPaintMonitor } from '@performance-platform/browser'
import { resolveMonitorConfig } from './monitor-config.ts'


const paintMonitor = createPaintMonitor(
  resolveMonitorConfig({
      VITE_MONITOR_ENDPOINT:
          import.meta.env.VITE_MONITOR_ENDPOINT,
      VITE_APP_ID:
          import.meta.env.VITE_APP_ID,
      VITE_APP_VERSION:
          import.meta.env.VITE_APP_VERSION,
      VITE_APP_ENVIRONMENT:
          import.meta.env.VITE_APP_ENVIRONMENT,
      VITE_MONITOR_SAMPLE_RATE:
          import.meta.env.VITE_MONITOR_SAMPLE_RATE,
  }),
)
paintMonitor.start()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="center">
  <aside id="layout-shift-demo" aria-label="CLS monitoring demonstration">
    Delayed content injected to exercise CLS monitoring
  </aside>
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src="${viteLogo}" class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/main.ts</code> and save to test <code>HMR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
  <button id="inp-demo" type="button" class="inp-demo">
    Simulate slow interaction
  </button>
</section>

<div class="ticks"></div>

<section id="next-steps">
  <div id="docs">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#documentation-icon"></use></svg>
    <h2>Documentation</h2>
    <p>Your questions, answered</p>
    <ul>
      <li>
        <a href="https://vite.dev/" target="_blank">
          <img class="logo" src="${viteLogo}" alt="" />
          Explore Vite
        </a>
      </li>
      <li>
        <a href="https://www.typescriptlang.org" target="_blank">
          <img class="button-icon" src="${typescriptLogo}" alt="">
          Learn more
        </a>
      </li>
    </ul>
  </div>
  <div id="social">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#social-icon"></use></svg>
    <h2>Connect with us</h2>
    <p>Join the Vite community</p>
    <ul>
      <li><a href="https://github.com/vitejs/vite" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#github-icon"></use></svg>GitHub</a></li>
      <li><a href="https://chat.vite.dev/" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#discord-icon"></use></svg>Discord</a></li>
      <li><a href="https://x.com/vite_js" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#x-icon"></use></svg>X.com</a></li>
      <li><a href="https://bsky.app/profile/vite.dev" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#bluesky-icon"></use></svg>Bluesky</a></li>
    </ul>
  </div>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

document
  .querySelector<HTMLButtonElement>('#inp-demo')!
  .addEventListener('click', (event) => {
    const endTime = performance.now() + 180

    while (performance.now() < endTime) {
      // Intentionally block the demo page's main thread.
    }

    const button = event.currentTarget as HTMLButtonElement
    button.textContent = 'Slow interaction completed'
  })

window.setTimeout(() => {
  document
    .querySelector('#layout-shift-demo')
    ?.classList.add('layout-shift-demo--visible')
}, 1_200)
