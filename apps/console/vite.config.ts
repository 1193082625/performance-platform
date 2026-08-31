import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    strictPort: true, // 表示端口被占用时直接失败
    proxy: {
      '/api': {
        target: "http://localhost:5001",
        changeOrigin: true,
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: true
  }
})
