import {
    describe,
    it,
    expect,
    vi,
} from 'vitest'
import { createPaintMonitor } from './index'

const ENDPOINT = '/api/v1/events/batch'

describe('browser SDK public API', () => {
    it('exports the paint monitor factory', () => {
        expect(createPaintMonitor).toBeTypeOf('function')
    })

    it('does not throw when PerformanceObserver is unavailable', () => {
        vi.stubGlobal('PerformanceObserver', undefined)

        try {
            const monitor = createPaintMonitor({
                appId: 'demo-web',
                appVersion: '0.1.0+test',
                environment: 'test',
                endpoint: ENDPOINT,
            })
            expect(() => {
                monitor.start()
            }).not.toThrow()
    
            expect(() => {
                monitor.destroy()
            }).not.toThrow()
        } finally {
            vi.unstubAllGlobals()
        }
    })
})