import {
    describe,
    it,
    afterAll,
    beforeEach,
    expect
} from 'vitest'

import {
    createDatabasePool
} from './pool.js'

const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

interface MetricInput {
    eventId: string
    type: string
    value: number
    unit: string
    sampleRate: number
    metricVersion: string
}

describe('metric_events schema', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)

    beforeEach(async () => {
        await pool.query('TRUNCATE TABLE metric_events RESTART IDENTITY')
    })

    afterAll(async () => {
        await pool.end()
    })

    function insertMetric(input: MetricInput) {
        return pool.query(
            `
            INSERT INTO metric_events (
                event_id,
                schema_version,
                app_id,
                app_version,
                environment,
                platform,
                event_type,
                event_time,
                session_id,
                view_id,
                sdk_name,
                sdk_version,
                metric_value,
                metric_unit,
                sample_rate,
                metric_version
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            )
            `,
            [
                input.eventId,
                '2.0',
                'demo-web',
                '0.2.0',
                'test',
                'web',
                input.type,
                new Date(),
                'session-1',
                'view-1',
                '@performance-platform/browser',
                '0.2.0',
                input.value,
                input.unit,
                input.sampleRate,
                input.metricVersion,
            ]
        )
    }

    it('accepts a valid LCP metric', async () => {
        await insertMetric({
            eventId:
                '10000000-0000-4000-8000-000000000001',
            type: 'web.vital.lcp',
            value: 2500,
            unit: 'ms',
            sampleRate: 0.5,
            metricVersion: 'lcp-v1',
        })
    })

    it('rejects sample rate zero', async () => {
        await expect(
            insertMetric({
                eventId:
                    '10000000-0000-4000-8000-000000000002',
                type: 'web.vital.lcp',
                value: 2500,
                unit: 'ms',
                sampleRate: 0,
                metricVersion: 'lcp-v1',
            })
        ).rejects.toThrow(/metric_events_sample_rate_check/)
    })

    it('rejects LCP with score unit', async () => {
        await expect(
            insertMetric({
                eventId:
                    '10000000-0000-4000-8000-000000000003',
                type: 'web.vital.lcp',
                value: 2500,
                unit: 'score',
                sampleRate: 1,
                metricVersion: 'lcp-v1',
            }),
        ).rejects.toThrow(
            /metric_events_metric_definition_check/,
        )
    })
    
    it('rejects LCP with CLS algorithm version', async () => {
        await expect(
            insertMetric({
                eventId:
                    '10000000-0000-4000-8000-000000000004',
                type: 'web.vital.lcp',
                value: 2500,
                unit: 'ms',
                sampleRate: 1,
                metricVersion: 'cls-v1',
            }),
        ).rejects.toThrow(
            /metric_events_metric_definition_check/,
        )
    })

    it('accepts a safe integer memory value', async () => {
        await insertMetric({
            eventId:
                '10000000-0000-4000-8000-000000000005',
            type: 'web.memory.used_heap',
            value: Number.MAX_SAFE_INTEGER,
            unit: 'byte',
            sampleRate: 1,
            metricVersion: 'memory-v1',
        })
    })
    
    it('rejects a fractional memory value', async () => {
        await expect(
            insertMetric({
                eventId:
                    '10000000-0000-4000-8000-000000000006',
                type: 'web.memory.used_heap',
                value: 1024.5,
                unit: 'byte',
                sampleRate: 1,
                metricVersion: 'memory-v1',
            }),
        ).rejects.toThrow(
            /metric_events_metric_value_check/,
        )
    })
})