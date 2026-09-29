import { describe, expect, it } from 'vitest'

import { loadConfig } from './config.js'

const VALID_ENV = {
    PORT: '5000',

    DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/performance_platform',

    APP_ID: 'demo-web',

    CORS_ORIGINS: 'http://localhost:5173,http://localhost:5174',

    LOG_LEVEL: 'info',
}

describe('loadConfig', () => {
    it('parses comma-separated CORS origins', () => {
        const config = loadConfig({
            ...VALID_ENV,

            CORS_ORIGINS: 'http://localhost:5173, http://localhost:5174',
        })

        expect(config.corsOrigins).toEqual([
            'http://localhost:5173',
            'http://localhost:5174',
        ])
    })
    it('parses the server port as a number', () => {
        const config = loadConfig({
            ...VALID_ENV,
            PORT: '5000',
        })

        expect(config.port).toBe(5000)
    })
    it('rejects an invalid server port', () => {
        expect(() => {
            loadConfig({
                ...VALID_ENV,
                PORT: 'not-a-number',
            })
        }).toThrow('PORT must be an integer between 1 and 65535')
    })
    it('reads the database URL', () => {
        const databaseUrl =
            'postgresql://postgres:postgres@localhost:5432/performance_platform'

        const config = loadConfig({
            ...VALID_ENV,
            DATABASE_URL: databaseUrl,
        })

        expect(config.databaseUrl).toBe(databaseUrl)
    })
    it('rejects a missing database URL', () => {
        expect(() => {
            loadConfig({
                ...VALID_ENV,
                DATABASE_URL: undefined,
            })
        }).toThrow('DATABASE_URL is required')
    })
    it('reads the application ID', () => {
        const config = loadConfig({
            ...VALID_ENV,
            APP_ID: 'demo-web',
        })

        expect(config.appId).toBe('demo-web')
    })

    it('rejects a missing application ID', () => {
        expect(() => {
            loadConfig({
                ...VALID_ENV,
                APP_ID: undefined,
            })
        }).toThrow('APP_ID is required')
    })
    it('uses info as the default log level', () => {
        const config = loadConfig({
            ...VALID_ENV,
            LOG_LEVEL: undefined,
        })

        expect(config.logLevel).toBe('info')
    })
    it('rejects an unsupported log level', () => {
        expect(() => {
            loadConfig({
                ...VALID_ENV,
                LOG_LEVEL: 'verbose',
            })
        }).toThrow(
            'LOG_LEVEL must be one of trace, debug, info, warn, error, fatal, or silent',
        )
    })
    it('defaults COOKIE_SECURE to false for local HTTP', () => {
        const config = loadConfig({
            ...VALID_ENV,
            COOKIE_SECURE: undefined,
        })

        expect(config.cookieSecure).toBe(false)
    })

    it('parses COOKIE_SECURE=true for HTTPS deployment', () => {
        const config = loadConfig({
            ...VALID_ENV,
            COOKIE_SECURE: 'true',
        })

        expect(config.cookieSecure).toBe(true)
    })

    it.each(['', 'TRUE', 'yes', '1'])(
        'rejects invalid COOKIE_SECURE value: %j',
        (value) => {
            expect(() => {
                loadConfig({
                    ...VALID_ENV,
                    COOKIE_SECURE: value,
                })
            }).toThrow('COOKIE_SECURE must be true or false')
        },
    )
})
