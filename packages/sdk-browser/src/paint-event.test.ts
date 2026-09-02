import {
    describe,
    it,
    expect,
} from 'vitest'
import type { PaintSample } from './types/paintCollector.type'
import type { PaintEventContext } from './types/paintMonitor.type'
import { createPaintEvent } from './paint-event'

const sample: PaintSample = {
    type: 'web.paint.fcp',
    valueMs: 260.4,
    occurredAt: 1_000_260
}

const context: PaintEventContext = {
    eventId: '075f9a46-f934-45e3-b355-e20490e90bb4',
    appId: 'demo-web',
    appVersion: '0.1.0+test',
    environment: 'test',
    sessionId: 'session-test-1',
    viewId: 'view-test-1',
    sampleRate: 0.5,
}


describe('createPaintEvent', () => {
    it('maps a paint sample and context to a versioned paint event', () => {
        const event = createPaintEvent(
            sample,
            context
        )
        expect(event).toEqual({
            schemaVersion: '2.0',
            eventId: context.eventId,
            type: 'web.paint.fcp',
            timestamp: 1_000_260,
            sampleRate: 0.5,
            metricVersion: 'paint-v1',
        
            application: {
                id: 'demo-web',
                version: '0.1.0+test',
                environment: 'test',
            },
        
            runtime: {
                platform: 'web',
                sdk: {
                    name: '@performance-platform/browser',
                    version: '0.1.0',
                },
            },
        
            session: {
                sessionId: 'session-test-1',
                viewId: 'view-test-1',
            },
        
            payload: {
                value: 260.4,
                unit: 'ms',
            },
        })
    })
})