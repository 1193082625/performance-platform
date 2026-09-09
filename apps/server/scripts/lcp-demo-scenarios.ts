import { randomUUID } from 'node:crypto'

import type { MetricEventV2 } from '@performance-platform/protocol'

export const LCP_DEMO_SCENARIOS = [
    {
        ruleId: 'lcp.slow-server-response',
        phase: 'timeToFirstByte',
        sampleCount: 10,
        attribution: [2_800, 200, 800, 200],
    },
    {
        ruleId: 'lcp.late-resource-discovery',
        phase: 'resourceLoadDelay',
        sampleCount: 10,
        attribution: [800, 2_000, 1_000, 200],
    },
    {
        ruleId: 'lcp.slow-resource-load',
        phase: 'resourceLoadDuration',
        sampleCount: 10,
        attribution: [800, 200, 2_800, 200],
    },
    {
        ruleId: 'lcp.slow-element-render',
        phase: 'elementRenderDelay',
        // Give the render scenario extra weight so the combined 24h demo has
        // one deterministic primary recommendation.
        sampleCount: 20,
        attribution: [800, 200, 800, 2_200],
    },
] as const

export type LcpDemoScenario = (typeof LCP_DEMO_SCENARIOS)[number]

export interface LcpDemoCohort {
    scenario: LcpDemoScenario
    timestamp: number
    events: MetricEventV2[]
}

export function createLcpDemoCohorts(now: number): LcpDemoCohort[] {
    return LCP_DEMO_SCENARIOS.map((scenario, scenarioIndex) => {
        const timestamp = now - (scenarioIndex + 1) * 60_000
        const [
            timeToFirstByte,
            resourceLoadDelay,
            resourceLoadDuration,
            elementRenderDelay,
        ] = scenario.attribution
        const value = scenario.attribution.reduce(
            (total, duration) => total + duration,
            0,
        )

        return {
            scenario,
            timestamp,
            events: Array.from(
                { length: scenario.sampleCount },
                (_, sampleIndex): MetricEventV2 => ({
                    schemaVersion: '2.0',
                    eventId: randomUUID(),
                    type: 'web.vital.lcp',
                    timestamp,
                    sampleRate: 1,
                    metricVersion: 'lcp-v1',
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
                        sessionId: `lcp-demo-${scenario.phase}`,
                        viewId: `lcp-demo-${scenarioIndex}-${sampleIndex}`,
                    },
                    payload: {
                        value,
                        unit: 'ms',
                        attribution: {
                            timeToFirstByte,
                            resourceLoadDelay,
                            resourceLoadDuration,
                            elementRenderDelay,
                            element: '.hero-image',
                            url: 'https://example.com/hero.webp',
                        },
                    },
                }),
            ),
        }
    })
}
