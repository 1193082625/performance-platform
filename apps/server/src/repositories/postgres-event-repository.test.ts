import {
    describe,
    it,
    expect,
    afterAll,
    beforeEach,
} from 'vitest'

import type {
    PaintEventV1
} from '@performance-platform/protocol'

import {
    createDatabasePool
} from '../db/pool.js'

import {
    createPostgresEventRepository,
} from './postgres-event-repository.js'

const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

const EVENT_TIMESTAMP = Date.UTC(2026, 7, 28, 3, 0, 0)

const QUERY_FROM = new Date('2026-08-28T03:00:00.000Z')

const QUERY_TO = new Date('2026-08-28T04:00:00.000Z')

const EMPTY_STATS = {
    count: 0,
    average: null,
    p50: null,
    p75: null,
    p90: null,
}

const EVENT: PaintEventV1 = {
    schemaVersion: '1.0',
    eventId:
        '7ae498ca-1dc3-4cf7-be84-67e3c8cd2e1a',
    type: 'web.paint.fcp',
    timestamp: EVENT_TIMESTAMP,

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
}

describe('PostgresEventRepository', () => {
    const pool = createDatabasePool(
        TEST_DATABASE_URL,
    )

    const repository =
        createPostgresEventRepository(pool)

    beforeEach(async () => {
        // TRUNCATE 会在每个测试前清空表，确保测试互不影响
        // RESTART IDENTITY 会把自增id重置
        await pool.query(
            'TRUNCATE TABLE paint_events RESTART IDENTITY',
        )
    })

    afterAll(async () => {
        await pool.end()
    })

    it('inserts a paint event', async () => {
        await repository.insertBatch([
            EVENT,
        ])

        const result = await pool.query<{
            event_id: string
            schema_version: string
            app_id: string
            event_type: string
            event_time: Date
            value_ms: number
        }>(`
            SELECT
                event_id,
                schema_version,
                app_id,
                event_type,
                event_time,
                value_ms
            FROM paint_events
        `)

        expect(result.rows).toEqual([
            {
                event_id: EVENT.eventId,
                schema_version:
                    EVENT.schemaVersion,
                app_id: EVENT.application.id,
                event_type: EVENT.type,
                event_time: new Date(
                    EVENT.timestamp,
                ),
                value_ms: EVENT.payload.value,
            }
        ])
    })

    it('treats duplicate event IDs as idempotent', async () => {
        await repository.insertBatch([EVENT])

        await expect(
            repository.insertBatch([EVENT])
        ).resolves.toBeUndefined()

        const result = await pool.query<{
            count: string
        }>(`
            SELECT count(*) AS count
            FROM paint_events
            WHERE event_id = $1
        `, [
            EVENT.eventId
        ])

        expect(result.rows).toEqual([
            {
                count: '1'
            }
        ])
    })

    it('stores FP and FCP events independently', async () => {
        const fpEvent: PaintEventV1 = {
            ...EVENT,
            eventId: '2bbdf3d6-1794-4ef1-93ad-329fc6296207',
            type: 'web.paint.fp',
            payload: {
                value: 120.5,
                unit: 'ms',
            },
        }
        const fcpEvent: PaintEventV1 = {
            ...EVENT,
            eventId: 'efc82d05-dfa4-41cc-b179-1924315156db',
            type: 'web.paint.fcp',
            payload: {
                value: 260.4,
                unit: 'ms',
            },
        }

        await repository.insertBatch([
            fpEvent, fcpEvent
        ])
        const result = await pool.query<{
            event_type: string
            value_ms: number
        }>(`
            SELECT event_type, value_ms
            FROM paint_events
            ORDER BY event_type    
        `)

        expect(result.rows).toEqual([
            {
                event_type: 'web.paint.fcp',
                value_ms: 260.4,
            },
            {
                event_type: 'web.paint.fp',
                value_ms: 120.5,
            },
        ])
    })

    it('queries events within the from-inclusive and to-exclusive range', async () => {
        const makeEvent = (
            eventId: string,
            timestamp: number,
        ): PaintEventV1 => ({
            ...EVENT,
            eventId,
            timestamp,
        })
    
        await repository.insertBatch([
            makeEvent(
                '97f10bd9-150f-4d73-88e5-b84450e59787',
                QUERY_FROM.getTime() - 1,
            ),
            makeEvent(
                '35969e8c-785b-44cb-b8d4-20ec8e3fb74e',
                QUERY_FROM.getTime(),
            ),
            makeEvent(
                '752ff96d-104f-43cd-82cd-8df808d17e67',
                QUERY_TO.getTime() - 1,
            ),
            makeEvent(
                '834c4693-252c-4ca2-9a81-c31665ac7579',
                QUERY_TO.getTime(),
            ),
        ])
    
        const result =
            await repository.queryPaintMetrics({
                appId: 'demo-web',
                from: QUERY_FROM,
                to: QUERY_TO,
                interval: 'hour',
            })
    
        expect(result.summary.fcp.count).toBe(2)
    })

    it('rolls back the whole batch when one event fails', async () => {
        const invalidEvent: PaintEventV1 = {
            ...EVENT,
    
            eventId:
                '178714a8-1cd5-4900-baf4-4d8761451806',
    
            payload: {
                ...EVENT.payload,
                value: -1,
            },
        }
    
        await expect(
            repository.insertBatch([
                EVENT,
                invalidEvent,
            ]),
        ).rejects.toThrow()
    
        const result = await pool.query<{
            count: string
        }>(`
            SELECT count(*) AS count
            FROM paint_events
        `)
    
        expect(result.rows).toEqual([
            {
                count: '0',
            },
        ])
    })

    it('returns empty statistics and fills empty time buckets', async () => {
        const result =
            await repository.queryPaintMetrics({
                appId: 'demo-web',
                from: QUERY_FROM,
                to: QUERY_TO,
                interval: 'hour',
            })
    
        expect(result).toEqual({
            range: {
                from: QUERY_FROM.toISOString(),
                to: QUERY_TO.toISOString(),
                interval: 'hour',
            },
    
            summary: {
                fp: EMPTY_STATS,
                fcp: EMPTY_STATS,
            },
    
            series: [
                {
                    time:
                        QUERY_FROM.toISOString(),
                    fp: EMPTY_STATS,
                    fcp: EMPTY_STATS,
                },
            ],
        })
    })

    it('aggregates an event into its time bucket', async () => {
        await repository.insertBatch([
            EVENT,
        ])
    
        const result =
            await repository.queryPaintMetrics({
                appId: 'demo-web',
                from: QUERY_FROM,
                to: QUERY_TO,
                interval: 'hour',
            })
    
        expect(result.series).toEqual([
            {
                time: QUERY_FROM.toISOString(),
                fp: EMPTY_STATS,
                fcp: {
                    count: 1,
                    average: 260.4,
                    p50: 260.4,
                    p75: 260.4,
                    p90: 260.4,
                },
            },
        ])
    })

    it('calculates statistics for a known dataset', async () => {
        const values = [
            100,
            200,
            300,
            400,
        ]
    
        const events: PaintEventV1[] =
            values.map((value, index) => ({
                ...EVENT,
    
                eventId:
                    `00000000-0000-4000-8000-${String(index + 1)
                        .padStart(12, '0')}`,
    
                timestamp:
                    QUERY_FROM.getTime() + 1_000,
    
                payload: {
                    value,
                    unit: 'ms',
                },
            }))
    
        await repository.insertBatch(events)
    
        const result =
            await repository.queryPaintMetrics({
                appId: 'demo-web',
                from: QUERY_FROM,
                to: QUERY_TO,
                interval: 'hour',
            })
    
        expect(result.summary.fcp).toEqual({
            count: 4,
            average: 250,
            p50: 250,
            p75: 325,
            p90: 370,
        })
    })
})