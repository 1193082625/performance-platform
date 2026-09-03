import {
    describe,
    it,
    expect,
    afterEach,
    vi,
} from 'vitest'

import type {
    EventRepository
} from '../repositories/event-repository.js'

import { buildApp } from '../app.js'

describe('GET /health', () => {
    const apps: Array<{
        close(): Promise<void>
    }> = []

    afterEach(async () => {
        await Promise.all(
            apps.map((app) => app.close())
        )
        apps.length = 0
    })

    function createTestApp(corsOrigins?: string[]) {
        const repository: EventRepository = {
            insertBatch:
                vi.fn<
                    EventRepository['insertBatch']
                >(),

            queryPaintMetrics:
                vi.fn<
                    EventRepository['queryPaintMetrics']
                >(),
        }
        let app

        const metricQueryRepository = {
            queryMetric: vi.fn(),
        }

        if (corsOrigins) {
            app = buildApp({
                eventRepository: repository,
                metricQueryRepository,
                appId: 'demo-web',
                now: () => Date.now(),
                corsOrigins 
            })
        } else {
            app = buildApp({
                eventRepository: repository,
                metricQueryRepository,
                appId: 'demo-web',
                now: () => Date.now(),
            })
        }

        apps.push(app)

        return { app }
    }

    it('reports that the server is healthy', async () => {
        const { app } = createTestApp()
        const response = await app.inject({
            method: 'GET',
            url: '/health',
        })

        expect(response.statusCode).toBe(200)

        expect(response.json()).toEqual({
            status: 'ok',
        })
    })

    it('allows requests from the configured origin', async () => {
        const { app } = createTestApp([
            'http://localhost:5173',
        ])
        
        const response = await app.inject({
            method: 'GET',
            url: '/health',
            headers: {
                origin: 'http://localhost:5173'
            }
        })

        expect(response.statusCode).toBe(200)

        expect(
            response.headers[
                'access-control-allow-origin'
            ],
        ).toBe('http://localhost:5173')
    })
    it('does not allow requests from an unconfigured origin', async () => {
        const { app } = createTestApp([
            'http://localhost:5173',
        ])
    
        const response = await app.inject({
            method: 'GET',
            url: '/health',
            headers: {
                origin: 'https://untrusted.example.com',
            },
        })
    
        expect(response.statusCode).toBe(200)
    
        expect(
            response.headers[
                'access-control-allow-origin'
            ],
        ).toBeUndefined()
    })
})