import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    resolveMonitorConfig,
} from './monitor-config'

describe('resolveMonitorConfig', () => {
    it('rejects a missing monitor endpoint', () => {
        expect(() => {
            resolveMonitorConfig({
                VITE_APP_ID: 'demo-web',
                VITE_APP_VERSION: '0.1.0+test',
                VITE_APP_ENVIRONMENT: 'test',
            })
        }).toThrowError(
            'Missing required environment variable: VITE_MONITOR_ENDPOINT',
        )
    })
    it('rejects a whitespace-only monitor endpoint', () => {
        expect(() => {
            resolveMonitorConfig({
                VITE_MONITOR_ENDPOINT: '   ',
                VITE_APP_ID: 'demo-web',
                VITE_APP_VERSION: '0.1.0+test',
                VITE_APP_ENVIRONMENT: 'test',
            })
        }).toThrowError(
            'Missing required environment variable: VITE_MONITOR_ENDPOINT',
        )
    })
    it.each([
        {
            variable: 'VITE_APP_ID',
            options: {
                VITE_MONITOR_ENDPOINT: 'http://localhost:5000/api/v1/events/batch',
                VITE_APP_VERSION: '0.1.0+test',
                VITE_APP_ENVIRONMENT: 'test',
            },
        },
        {
            variable: 'VITE_APP_VERSION',
            options: {
                VITE_MONITOR_ENDPOINT: 'http://localhost:5000/api/v1/events/batch',
                VITE_APP_ID: 'demo-web',
                VITE_APP_ENVIRONMENT: 'test',
            },
        },
    ])(
        'rejects a missing $variable',
        ({ variable, options }) => {
            expect(() => {
                resolveMonitorConfig(options)
            }).toThrowError(
                `Missing required environment variable: ${variable}`,
            )
        },
    )
    it('rejects a missing app environment', () => {
        expect(() => {
            resolveMonitorConfig({
                VITE_MONITOR_ENDPOINT:
                    'http://localhost:5000/api/v1/events/batch',
                VITE_APP_ID: 'demo-web',
                VITE_APP_VERSION: '0.1.0+test',
            })
        }).toThrowError(
            'Missing required environment variable: VITE_APP_ENVIRONMENT',
        )
    })
    it('rejects an unsupported app environment', () => {
        expect(() => {
            resolveMonitorConfig({
                VITE_MONITOR_ENDPOINT:
                    'http://localhost:5000/api/v1/events/batch',
                VITE_APP_ID: 'demo-web',
                VITE_APP_VERSION: '0.1.0+test',
                VITE_APP_ENVIRONMENT: 'prodution',
            })
        }).toThrowError(
            'Unsupported application environment: prodution',
        )
    })
    it('returns a normalized paint monitor config', () => {
        expect(
            resolveMonitorConfig({
                VITE_MONITOR_ENDPOINT:
                    '  http://localhost:5000/api/v1/events/batch  ',
                VITE_APP_ID: '  demo-web  ',
                VITE_APP_VERSION: '  0.1.0+test  ',
                VITE_APP_ENVIRONMENT: '  production  ',
            }),
        ).toEqual({
            endpoint:
                'http://localhost:5000/api/v1/events/batch',
            appId: 'demo-web',
            appVersion: '0.1.0+test',
            environment: 'production',
        })
    })
})