import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    loadConfig,
} from './config.js'

const VALID_ENV = {
    PORT: '5000',

    DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/performance_platform',

    APP_ID: 'demo-web',

    CORS_ORIGINS:
        'http://localhost:5173,http://localhost:5174',

    LOG_LEVEL: 'info',
}

describe('loadConfig', () => {
    it('parses comma-separated CORS origins', () => {
        const config = loadConfig({
            ...VALID_ENV,

            CORS_ORIGINS:
                'http://localhost:5173, http://localhost:5174',
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
        }).toThrow(
            'PORT must be an integer between 1 and 65535',
        )
    })
    it('reads the database URL', () => {
        const databaseUrl =
            'postgresql://postgres:postgres@localhost:5432/performance_platform'
    
        const config = loadConfig({
            ...VALID_ENV,
            DATABASE_URL: databaseUrl,
        })
    
        expect(config.databaseUrl).toBe(
            databaseUrl,
        )
    })
    it('rejects a missing database URL', () => {
        expect(() => {
            loadConfig({
                ...VALID_ENV,
                DATABASE_URL: undefined,
            })
        }).toThrow(
            'DATABASE_URL is required',
        )
    })
    it('reads the application ID', () => {
        const config = loadConfig({
            ...VALID_ENV,
            APP_ID: 'demo-web',
        })
    
        expect(config.appId).toBe(
            'demo-web',
        )
    })

    it('rejects a missing application ID', () => {
        expect(() => {
            loadConfig({
                ...VALID_ENV,
                APP_ID: undefined,
            })
        }).toThrow(
            'APP_ID is required',
        )
    })
    it('uses info as the default log level', () => {
        const config = loadConfig({
            ...VALID_ENV,
            LOG_LEVEL: undefined,
        })
    
        expect(config.logLevel).toBe(
            'info',
        )
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
})