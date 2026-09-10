import { randomUUID } from 'node:crypto'

import type { MetricEventV2 } from '@performance-platform/protocol'

export const CLS_DEMO_SCENARIOS = [
    {
        name: 'early-load-shift',
        expectedRuleIds: ['cls.early-load-shift'],
        sampleCount: 10,
        loadState: 'dom-content-loaded',
        repeatedTarget: false,
    },
    {
        name: 'late-layout-shift',
        expectedRuleIds: ['cls.late-layout-shift'],
        sampleCount: 10,
        loadState: 'complete',
        repeatedTarget: false,
    },
    {
        name: 'repeated-shift-target',
        expectedRuleIds: [
            'cls.late-layout-shift',
            'cls.repeated-shift-target',
        ],
        sampleCount: 20,
        loadState: 'complete',
        repeatedTarget: true,
    },
] as const

export type ClsDemoScenario = (typeof CLS_DEMO_SCENARIOS)[number]

export interface ClsDemoCohort {
    scenario: ClsDemoScenario
    timestamp: number
    events: MetricEventV2[]
}

export function createClsDemoCohorts(now: number): ClsDemoCohort[] {
    return CLS_DEMO_SCENARIOS.map((scenario, scenarioIndex) => {
        const timestamp = now - (scenarioIndex + 10) * 60_000

        return {
            scenario,
            timestamp,
            events: Array.from(
                { length: scenario.sampleCount },
                (_, sampleIndex): MetricEventV2 => ({
                    schemaVersion: '2.0',
                    eventId: randomUUID(),
                    type: 'web.vital.cls',
                    timestamp,
                    sampleRate: 1,
                    metricVersion: 'cls-v1',
                    application: {
                        id: 'demo-web',
                        version: '0.2.0+diagnostic-demo',
                        environment: 'development',
                    },
                    runtime: {
                        platform: 'web',
                        sdk: {
                            name: '@performance-platform/browser',
                            version: '0.2.0',
                        },
                    },
                    session: {
                        sessionId: `cls-demo-${scenario.name}`,
                        viewId: `cls-demo-${scenarioIndex}-${sampleIndex}`,
                    },
                    payload: {
                        value: 0.18,
                        unit: 'score',
                        attribution: {
                            largestShiftTarget: scenario.repeatedTarget
                                ? '.promo-banner'
                                : `.demo-target-${scenarioIndex}-${sampleIndex}`,
                            largestShiftTime: 2_000 + sampleIndex,
                            largestShiftValue: 0.14,
                            loadState: scenario.loadState,
                            previousRect: {
                                x: 0,
                                y: 100,
                                width: 800,
                                height: 80,
                            },
                            currentRect: {
                                x: 0,
                                y: 180,
                                width: 800,
                                height: 80,
                            },
                        },
                    },
                }),
            ),
        }
    })
}
