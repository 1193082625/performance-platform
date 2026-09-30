import { createApp } from 'vue'
import './assets/styles/style.css'
import './assets/styles/refinements.css'
import './assets/styles/responsive.css'
import './assets/styles/details.css'
import App from './ConsoleShell.vue'
import { frame } from './directives/frame.ts'
import { i18n } from './i18n.js'
import { router } from './router.js'

createApp(App).use(i18n).use(router).directive('frame', frame).mount('#app')
