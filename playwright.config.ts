import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 2 : 0,

    reporter: [
        ['list'],
        [
            'html',
            {
                open: 'never'
            },
        ],
    ],

    use: {
        baseURL: process.env.DEMO_BASE_URL ?? 'http://localhost:5173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            }
        }
    ]
})