import { createApp } from 'vue'
import './assets/styles/style.css'
import './assets/styles/refinements.css'
import './assets/styles/responsive.css'
import './assets/styles/details.css'
import App from './App.vue'
import { frame } from './directives/frame.ts'

createApp(App).directive('frame', frame).mount('#app')
