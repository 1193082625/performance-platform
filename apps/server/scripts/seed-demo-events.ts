import {
    randomUUID,
} from 'node:crypto'

import type {
    MetricEventV2,
    PaintEventV1,
} from '@performance-platform/protocol'

import { createLcpDemoCohorts } from './lcp-demo-scenarios.js'
import { createClsDemoCohorts } from './cls-demo-scenarios.js'
import { createInpDemoCohorts } from './inp-demo-scenarios.js'

const endpoint =
    process.env.EVENTS_ENDPOINT
    ?? 'http://localhost:3000/api/v2/events/batch'

const HOUR_MS = 60 * 60 * 1_000
const now = Date.now()

const paintEvents: PaintEventV1[] = []
const memoryEvents: MetricEventV2[] = []

function createEvent(
    type: PaintEventV1['type'],
    timestamp: number,
    value: number,
): PaintEventV1 {
    return {
        schemaVersion: '1.0',
        eventId: randomUUID(),
        type,
        timestamp,

        application: {
            id: 'demo-web',
            version: '0.1.0+demo',
            environment: 'development',
        },

        runtime: {
            platform: 'web',

            sdk: {
                name: '@performance-platform/browser',
                version: '0.1.0',
            },
        },

        session: {
            sessionId: 'session-demo',
            viewId: randomUUID(),
        },

        payload: {
            value: Math.round(value),
            unit: 'ms',
        },
    }
}

for (
    let hourIndex = 0;
    hourIndex < 24;
    hourIndex += 1
) {
    const hourStart = now - (24 - hourIndex) * HOUR_MS

    for (
        let sampleIndex = 0;
        sampleIndex < 5;
        sampleIndex += 1
    ) {
        const timestamp = hourStart + (sampleIndex + 1) * 10 * 60_000
        const fp =
            650
            + hourIndex * 12
            + sampleIndex * 18
            + Math.sin(hourIndex / 3) * 80

        const fcp =
            1_100
            + hourIndex * 20
            + sampleIndex * 35
            + Math.cos(hourIndex / 4) * 140

        paintEvents.push(
            createEvent(
                'web.paint.fp',
                timestamp,
                fp,
            ),
        )

        paintEvents.push(
            createEvent(
                'web.paint.fcp',
                timestamp,
                fcp,
            ),
        )
    }
}

for (let sampleIndex = 0; sampleIndex < 24; sampleIndex += 1) {
    const timestamp = now - (23 - sampleIndex) * 5 * 60_000
    const viewId = 'memory-demo-view'
    const heapLimit = 4 * 1024 * 1024 * 1024
    const usedHeap = (320 + sampleIndex * 3) * 1024 * 1024
    const totalHeap = usedHeap + 96 * 1024 * 1024

    for (const [type, value] of [
        ['web.memory.used_heap', usedHeap],
        ['web.memory.total_heap', totalHeap],
        ['web.memory.heap_limit', heapLimit],
    ] as const) {
        memoryEvents.push({
            schemaVersion: '2.0',
            eventId: randomUUID(),
            type,
            timestamp,
            sampleRate: 1,
            metricVersion: 'memory-v1',
            application: {
                id: 'demo-web',
                version: '0.2.0+memory-demo',
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
                sessionId: 'memory-demo',
                viewId,
            },
            payload: { value, unit: 'byte' },
        })
    }
}

const v2PaintEvents: MetricEventV2[] = paintEvents.map((event) => ({
    ...event,
    schemaVersion: '2.0',
    sampleRate: 1,
    metricVersion: 'paint-v1',
}))

const lcpEvents = createLcpDemoCohorts(now).flatMap(
    (cohort) => cohort.events,
)
const clsEvents = createClsDemoCohorts(now).flatMap(
    (cohort) => cohort.events,
)
const inpEvents = createInpDemoCohorts(now).flatMap(
    (cohort) => cohort.events,
)
const events = [
    ...v2PaintEvents,
    ...memoryEvents,
    ...lcpEvents,
    ...clsEvents,
    ...inpEvents,
]

for (
    let index = 0;
    index < events.length;
    index += 20
) {
    const batch =
        events.slice(index, index + 20)

    const response = await fetch(
        endpoint,
        {
            method: 'POST',

            headers: {
                'content-type':
                    'application/json',
            },

            body: JSON.stringify({
                events: batch,
            }),
        },
    )

    if (!response.ok) {
        throw new Error(
            `Seed request failed: ${response.status} ${await response.text()}`,
        )
    }
}

console.log(
    `Seeded ${v2PaintEvents.length} paint events, ${memoryEvents.length} memory events, ${lcpEvents.length} LCP diagnostic events, ${clsEvents.length} CLS diagnostic events, and ${inpEvents.length} INP diagnostic events`,
)
