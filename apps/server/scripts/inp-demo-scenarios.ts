import { randomUUID } from 'node:crypto'

import type { MetricEventV2 } from '@performance-platform/protocol'

export const INP_DEMO_SCENARIOS = [
    {
        name: 'high-input-delay',
        expectedRuleIds: ['inp.high-input-delay'],
        sampleCount: 10,
        attribution: [180, 40, 40],
        repeatedTarget: false,
    },
    {
        name: 'slow-event-handler',
        expectedRuleIds: ['inp.slow-event-handler'],
        sampleCount: 10,
        attribution: [40, 200, 60],
        repeatedTarget: false,
    },
    {
        name: 'high-presentation-delay',
        expectedRuleIds: ['inp.high-presentation-delay'],
        sampleCount: 10,
        attribution: [40, 40, 220],
        repeatedTarget: false,
    },
    {
        name: 'repeated-interaction-target',
        expectedRuleIds: [
            'inp.slow-event-handler',
            'inp.repeated-interaction-target',
        ],
        sampleCount: 20,
        attribution: [40, 200, 60],
        repeatedTarget: true,
    },
] as const

export type InpDemoScenario = (typeof INP_DEMO_SCENARIOS)[number]

export interface InpDemoCohort {
    scenario: InpDemoScenario
    timestamp: number
    events: MetricEventV2[]
}

export function createInpDemoCohorts(now: number): InpDemoCohort[] {
    return INP_DEMO_SCENARIOS.map((scenario, scenarioIndex) => {
        const timestamp = now - (scenarioIndex + 20) * 60_000
        const [inputDelay, processingDuration, presentationDelay] =
            scenario.attribution
        const value = inputDelay + processingDuration + presentationDelay

        return {
            scenario,
            timestamp,
            events: Array.from(
                { length: scenario.sampleCount },
                (_, sampleIndex): MetricEventV2 => ({
                    schemaVersion: '2.0',
                    eventId: randomUUID(),
                    type: 'web.vital.inp',
                    timestamp,
                    sampleRate: 1,
                    metricVersion: 'inp-v1',
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
                        sessionId: `inp-demo-${scenario.name}`,
                        viewId: `inp-demo-${scenarioIndex}-${sampleIndex}`,
                    },
                    payload: {
                        value,
                        unit: 'ms',
                        attribution: {
                            inputDelay,
                            processingDuration,
                            presentationDelay,
                            loadState: 'complete',
                            interactionType: 'pointer',
                            interactionTarget: scenario.repeatedTarget
                                ? '#inp-demo'
                                : `#inp-demo-${scenarioIndex}-${sampleIndex}`,
                            interactionTime: 2_000 + sampleIndex,
                        },
                    },
                }),
            ),
        }
    })
}
