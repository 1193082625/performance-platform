import { fileURLToPath, URL } from "node:url"
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        lib: {
            entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
            name: "PerformancePlatformBrowser",
            formats: [
                'es', // ESM 产物，用于现代工程话项目
                'iife' // 用于传统网页直接通过 <script> 引入，上面的 name 决定浏览器全局变量名称
            ],
            fileName: (format) => format === 'es' ? 'index.js' : 'index.global.js',
        },
        sourcemap: true,
    }
})