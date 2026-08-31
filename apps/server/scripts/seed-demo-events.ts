import {
    randomUUID,
} from 'node:crypto'

import type {
    PaintEventV1,
} from '@performance-platform/protocol'

const endpoint =
    process.env.EVENTS_ENDPOINT
    ?? 'http://localhost:5001/api/v1/events/batch'

const HOUR_MS = 60 * 60 * 1_000
const now = Date.now()

const events: PaintEventV1[] = []

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
    const timestamp =
        now - (23 - hourIndex) * HOUR_MS

    for (
        let sampleIndex = 0;
        sampleIndex < 5;
        sampleIndex += 1
    ) {
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

        events.push(
            createEvent(
                'web.paint.fp',
                timestamp,
                fp,
            ),
        )

        events.push(
            createEvent(
                'web.paint.fcp',
                timestamp,
                fcp,
            ),
        )
    }
}

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
    `Seeded ${events.length} paint events`,
)