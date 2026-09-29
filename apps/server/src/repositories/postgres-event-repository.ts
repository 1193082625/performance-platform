import type { Pool } from 'pg'

import type {
    EventRepository,
    MemoryHealthRepository,
    MetricQueryRepository,
    LcpDiagnosticRepository,
    ClsDiagnosticRepository,
    InpDiagnosticRepository,
    ProjectKeyRepository,
} from './event-repository.js'
import type {
    MetricSeriesPoint,
    MetricStats,
    MetricsInterval,
} from '@performance-platform/protocol'

interface SummaryRow {
    fp_count: string
    fp_average: number | null
    fp_p50: number | null
    fp_p75: number | null
    fp_p90: number | null

    fcp_count: string
    fcp_average: number | null
    fcp_p50: number | null
    fcp_p75: number | null
    fcp_p90: number | null
}

interface SeriesRow extends SummaryRow {
    bucket_time: Date
}

interface MetricSummaryRow {
    count: string
    average: number | null
    p50: number | null
    p75: number | null
    p90: number | null
}

interface MetricSeriesRow extends MetricSummaryRow {
    bucket_time: Date
}

interface MemorySnapshotRow {
    event_time: Date
    used_heap: number
    heap_limit: number
}

interface LcpDiagnosticRow {
    sample_count: string
    evidence_sample_count: string

    overall_average: number | null
    overall_p75: number | null

    ttfb_average: number | null
    ttfb_p75: number | null

    load_delay_average: number | null
    load_delay_p75: number | null

    load_duration_average: number | null
    load_duration_p75: number | null

    render_delay_average: number | null
    render_delay_p75: number | null
}

interface ClsDiagnosticRow {
    sample_count: string
    evidence_sample_count: string
    overall_average: number | null
    overall_p75: number | null
    largest_shift_average: number | null
    largest_shift_p75: number | null
    loading_count: string
    dom_interactive_count: string
    dom_content_loaded_count: string
    complete_count: string
    dominant_target: string | null
    dominant_target_count: string
}

interface InpDiagnosticRow {
    sample_count: string
    evidence_sample_count: string
    overall_average: number | null
    overall_p75: number | null
    input_delay_average: number | null
    input_delay_p75: number | null
    processing_average: number | null
    processing_p75: number | null
    presentation_average: number | null
    presentation_p75: number | null
    dominant_target: string | null
    dominant_target_count: string
}

function getIntervalDuration(interval: MetricsInterval): number {
    switch (interval) {
        case 'minute':
            return 60 * 1_000

        case 'hour':
            return 60 * 60 * 1_000

        case 'day':
            return 24 * 60 * 60 * 1_000

        default:
            throw new Error(`Unsupported metrics interval: ${String(interval)}`)
    }
}

function getIntervalSql(interval: MetricsInterval): string {
    switch (interval) {
        case 'minute':
            return "INTERVAL '1 minute'"
        case 'hour':
            return "INTERVAL '1 hour'"
        case 'day':
            return "INTERVAL '1 day'"

        default:
            throw new Error(`Unsupported metrics interval: ${String(interval)}`)
    }
}

function emptyStats(): MetricStats {
    return {
        count: 0,
        average: null,
        p50: null,
        p75: null,
        p90: null,
    }
}

export function createPostgresEventRepository(
    pool: Pool,
): EventRepository &
    ProjectKeyRepository &
    MetricQueryRepository &
    MemoryHealthRepository &
    LcpDiagnosticRepository &
    ClsDiagnosticRepository &
    InpDiagnosticRepository {
    return {
        async findActiveProjectByKeyHash(keyHash) {
            const result = await pool.query<{
                project_id: string
            }>(
                `
                SELECT project_id
                FROM project_keys
                WHERE key_hash = $1
                    AND revoked_at IS NULL
                LIMIT 1
                `,
                [keyHash],
            )

            const row = result.rows[0]
            if (row === undefined) {
                return undefined
            }
            return {
                projectId: row.project_id,
            }
        },
        async insertBatch(events, options) {
            if (events.length === 0) return

            const client = await pool.connect()

            try {
                await client.query('BEGIN')

                for (const event of events) {
                    const sampleRate =
                        event.schemaVersion === '2.0' ? event.sampleRate : 1

                    const metricVersion =
                        event.schemaVersion === '2.0'
                            ? event.metricVersion
                            : 'paint-v1'

                    const metricAttribution =
                        event.schemaVersion === '2.0' &&
                        (event.type === 'web.vital.lcp' ||
                            event.type === 'web.vital.cls' ||
                            event.type === 'web.vital.inp')
                            ? (event.payload.attribution ?? null)
                            : null

                    // 使用占位符存储，这样可以防止 SQL 注入
                    // ON CONFLICT (event_id) DO NOTHING 表示 重复 event_id 不报错、不插入第二行，实现幂等性
                    await client.query(
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
                                metric_version,
                                metric_attribution,
                                project_id
                            )
                            VALUES (
                                $1,
                                $2,
                                $3,
                                $4,
                                $5,
                                $6,
                                $7,
                                $8,
                                $9,
                                $10,
                                $11,
                                $12,
                                $13,
                                $14,
                                $15,
                                $16,
                                $17,
                                $18
                            )
                            ON CONFLICT (event_id)
                            DO NOTHING
                        `,
                        [
                            event.eventId,
                            event.schemaVersion,
                            event.application.id,
                            event.application.version,
                            event.application.environment,
                            event.runtime.platform,
                            event.type,
                            new Date(event.timestamp),
                            event.session.sessionId,
                            event.session.viewId,
                            event.runtime.sdk.name,
                            event.runtime.sdk.version,
                            event.payload.value,
                            event.payload.unit,
                            sampleRate,
                            metricVersion,
                            metricAttribution,
                            options.projectId,
                        ],
                    )
                }

                await client.query('COMMIT')
            } catch (error) {
                await client.query('ROLLBACK')
                throw error
            } finally {
                // 无论成功还是失败，都要把连接归还连接池。
                // 这里不能调用 client.end()，连接属于 Pool，不应该由 Repository 直接销毁
                client.release()
            }
        },

        // 从 PostgreSQL 查询某个应用在指定时间范围内的 FP/FCP 数据，并整理成 Console 可以直接使用的响应
        /**
         * queryPaintMetrics 做两件事：
         * 查询整个时间范围的统计 --> summary
         * 按小时分别统计 --> series
         *
         * SQL 计算有数据的桶，JS补齐没有数据的桶
         *
         * 输出：
         *  range 回显标准化查询条件
         *  summary 整个范围的总体统计
         *  series 按时间粒度分通
         */
        async queryPaintMetrics(query) {
            const result = await pool.query<SummaryRow>(
                `SELECT
                    count(*) FILTER (
                        WHERE event_type = 'web.paint.fp'
                    ) AS fp_count,

                    avg(metric_value) FILTER (
                        WHERE event_type = 'web.paint.fp'
                    ) AS fp_average,

                    percentile_cont(0.50)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fp'
                        ) AS fp_p50,

                    percentile_cont(0.75)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fp'
                        ) AS fp_p75,

                    percentile_cont(0.90)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fp'
                        ) AS fp_p90,

                    count(*) FILTER (
                        WHERE event_type = 'web.paint.fcp'
                    ) AS fcp_count,

                    avg(metric_value) FILTER (
                        WHERE event_type = 'web.paint.fcp'
                    ) AS fcp_average,

                    percentile_cont(0.50)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fcp'
                        ) AS fcp_p50,

                    percentile_cont(0.75)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fcp'
                        ) AS fcp_p75,

                    percentile_cont(0.90)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fcp'
                        ) AS fcp_p90
                FROM metric_events
                WHERE app_id = $1
                    AND event_time >= $2
                    AND event_time < $3`,
                [query.appId, query.from, query.to],
            )

            const row = result.rows[0]

            if (row === undefined) {
                throw new Error('Statistics query returned no row')
            }

            const summary = {
                fp: {
                    count: Number(row.fp_count),
                    average: row.fp_average,
                    p50: row.fp_p50,
                    p75: row.fp_p75,
                    p90: row.fp_p90,
                },
                fcp: {
                    count: Number(row.fcp_count),
                    average: row.fcp_average,
                    p50: row.fcp_p50,
                    p75: row.fcp_p75,
                    p90: row.fcp_p90,
                },
            }

            // 加入分桶查询
            // date_bin() 计算每条事件属于哪个桶
            const intervalSql = getIntervalSql(query.interval)
            const seriesResult = await pool.query<SeriesRow>(
                `SELECT
                    date_bin(
                        ${intervalSql},
                        event_time,
                        $2::timestamptz
                    ) AS bucket_time,

                    count(*) FILTER (
                        WHERE event_type = 'web.paint.fp'
                    ) AS fp_count,

                    avg(metric_value) FILTER (
                        WHERE event_type = 'web.paint.fp'
                    ) AS fp_average,

                    percentile_cont(0.50)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fp'
                        ) AS fp_p50,

                    percentile_cont(0.75)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fp'
                        ) AS fp_p75,

                    percentile_cont(0.90)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fp'
                        ) AS fp_p90,

                    count(*) FILTER (
                        WHERE event_type = 'web.paint.fcp'
                    ) AS fcp_count,

                    avg(metric_value) FILTER (
                        WHERE event_type = 'web.paint.fcp'
                    ) AS fcp_average,

                    percentile_cont(0.50)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fcp'
                        ) AS fcp_p50,

                    percentile_cont(0.75)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fcp'
                        ) AS fcp_p75,

                    percentile_cont(0.90)
                        WITHIN GROUP (ORDER BY metric_value)
                        FILTER (
                            WHERE event_type = 'web.paint.fcp'
                        ) AS fcp_p90

                FROM metric_events

                WHERE app_id = $1
                    AND event_time >= $2
                    AND event_time < $3

                GROUP BY bucket_time
                ORDER BY bucket_time`,
                [query.appId, query.from, query.to],
            )

            // 把数据库结果做成索引
            const rowsByTime = new Map(
                seriesResult.rows.map((seriesRow) => [
                    seriesRow.bucket_time.toISOString(),
                    seriesRow,
                ]),
            )

            const intervalDuration = getIntervalDuration(query.interval)

            const series = []

            // 补齐空桶
            for (
                let time = query.from.getTime();
                time < query.to.getTime();
                time += intervalDuration
            ) {
                const bucketTime = new Date(time).toISOString()
                const bucketRow = rowsByTime.get(bucketTime)
                series.push({
                    time: bucketTime,
                    fp:
                        bucketRow === undefined
                            ? emptyStats()
                            : {
                                  count: Number(bucketRow.fp_count),
                                  average: bucketRow.fp_average,
                                  p50: bucketRow.fp_p50,
                                  p75: bucketRow.fp_p75,
                                  p90: bucketRow.fp_p90,
                              },

                    fcp:
                        bucketRow === undefined
                            ? emptyStats()
                            : {
                                  count: Number(bucketRow.fcp_count),
                                  average: bucketRow.fcp_average,
                                  p50: bucketRow.fcp_p50,
                                  p75: bucketRow.fcp_p75,
                                  p90: bucketRow.fcp_p90,
                              },
                })
            }

            return {
                range: {
                    from: query.from.toISOString(),
                    to: query.to.toISOString(),
                    interval: query.interval,
                },
                summary,
                series,
            }
        },
        async queryMetric(query) {
            const values = [
                query.appId,
                query.from,
                query.to,
                query.metric.type,
                query.metric.unit,
                query.metric.metricVersion,
            ]

            const summaryResult = await pool.query<MetricSummaryRow>(
                `SELECT
                        count(*) AS count,
                        avg(metric_value) AS average,

                        percentile_cont(0.50)
                            WITHIN GROUP (
                                ORDER BY metric_value
                            ) AS p50,

                        percentile_cont(0.75)
                            WITHIN GROUP (
                                ORDER BY metric_value
                            ) AS p75,

                        percentile_cont(0.90)
                            WITHIN GROUP (
                                ORDER BY metric_value
                            ) AS p90
                    FROM metric_events
                    WHERE app_id = $1
                        AND event_time >= $2
                        AND event_time < $3
                        AND event_type = $4
                        AND metric_unit = $5
                        AND metric_version = $6`,
                values,
            )

            const summaryRow = summaryResult.rows[0]

            if (summaryRow === undefined) {
                throw new Error('Metric statistics query returned no row')
            }

            const summary: MetricStats = {
                count: Number(summaryRow.count),
                average: summaryRow.average,
                p50: summaryRow.p50,
                p75: summaryRow.p75,
                p90: summaryRow.p90,
            }

            const intervalSql = getIntervalSql(query.interval)

            const seriesResult = await pool.query<MetricSeriesRow>(
                `SELECT
                        date_bin(
                            ${intervalSql},
                            event_time,
                            $2::timestamptz
                        ) AS bucket_time,

                        count(*) AS count,
                        avg(metric_value) AS average,

                        percentile_cont(0.50)
                            WITHIN GROUP (
                                ORDER BY metric_value
                            ) AS p50,

                        percentile_cont(0.75)
                            WITHIN GROUP (
                                ORDER BY metric_value
                            ) AS p75,

                        percentile_cont(0.90)
                            WITHIN GROUP (
                                ORDER BY metric_value
                            ) AS p90

                    FROM metric_events
                    WHERE app_id = $1
                        AND event_time >= $2
                        AND event_time < $3
                        AND event_type = $4
                        AND metric_unit = $5
                        AND metric_version = $6

                    GROUP BY bucket_time
                    ORDER BY bucket_time`,
                values,
            )

            const rowsByTime = new Map(
                seriesResult.rows.map((row) => [
                    row.bucket_time.toISOString(),
                    row,
                ]),
            )

            const intervalDuration = getIntervalDuration(query.interval)

            const series: MetricSeriesPoint[] = []

            for (
                let time = query.from.getTime();
                time < query.to.getTime();
                time += intervalDuration
            ) {
                const bucketTime = new Date(time).toISOString()

                const row = rowsByTime.get(bucketTime)

                series.push({
                    time: bucketTime,

                    stats:
                        row === undefined
                            ? emptyStats()
                            : {
                                  count: Number(row.count),
                                  average: row.average,
                                  p50: row.p50,
                                  p75: row.p75,
                                  p90: row.p90,
                              },
                })
            }

            return {
                metric: query.metric,

                range: {
                    from: query.from.toISOString(),
                    to: query.to.toISOString(),
                    interval: query.interval,
                },

                summary,
                series,
            }
        },
        async queryLatestViewMemorySnapshots(query) {
            const result = await pool.query<MemorySnapshotRow>(
                `WITH latest_view AS (
                    SELECT session_id, view_id
                    FROM metric_events
                    WHERE app_id = $1
                        AND event_time >= $2
                        AND event_time < $3
                        AND event_type = 'web.memory.used_heap'
                    ORDER BY event_time DESC
                    LIMIT 1
                )
                SELECT
                    event_time,
                    max(metric_value) FILTER (
                        WHERE event_type = 'web.memory.used_heap'
                    ) AS used_heap,
                    max(metric_value) FILTER (
                        WHERE event_type = 'web.memory.heap_limit'
                    ) AS heap_limit
                FROM metric_events
                JOIN latest_view USING (session_id, view_id)
                WHERE app_id = $1
                    AND event_time >= $2
                    AND event_time < $3
                    AND event_type IN (
                        'web.memory.used_heap',
                        'web.memory.heap_limit'
                    )
                GROUP BY event_time
                HAVING count(*) FILTER (
                    WHERE event_type = 'web.memory.used_heap'
                ) > 0
                AND count(*) FILTER (
                    WHERE event_type = 'web.memory.heap_limit'
                ) > 0
                ORDER BY event_time`,
                [query.appId, query.from, query.to],
            )

            return result.rows.map((row) => ({
                observedAt: row.event_time.getTime(),
                usedHeap: row.used_heap,
                heapLimit: row.heap_limit,
            }))
        },
        async queryLcpDiagnostics(input) {
            const result = await pool.query<LcpDiagnosticRow>(
                `
                SELECT
                    COUNT(*) AS sample_count,
                    COUNT(metric_attribution)
                        AS evidence_sample_count,

                    AVG(metric_value)
                        AS overall_average,

                    PERCENTILE_CONT(0.75)
                    WITHIN GROUP (
                        ORDER BY metric_value
                    ) AS overall_p75,

                    AVG(
                        (metric_attribution
                            ->> 'timeToFirstByte')
                            ::DOUBLE PRECISION
                    ) AS ttfb_average,

                    PERCENTILE_CONT(0.75)
                    WITHIN GROUP (
                        ORDER BY (
                            metric_attribution
                                ->> 'timeToFirstByte'
                        )::DOUBLE PRECISION
                    ) AS ttfb_p75,

                    AVG(
                        (metric_attribution
                            ->> 'resourceLoadDelay')
                            ::DOUBLE PRECISION
                    ) AS load_delay_average,

                    PERCENTILE_CONT(0.75)
                    WITHIN GROUP (
                        ORDER BY (
                            metric_attribution
                                ->> 'resourceLoadDelay'
                        )::DOUBLE PRECISION
                    ) AS load_delay_p75,

                    AVG(
                        (metric_attribution
                            ->> 'resourceLoadDuration')
                            ::DOUBLE PRECISION
                    ) AS load_duration_average,

                    PERCENTILE_CONT(0.75)
                    WITHIN GROUP (
                        ORDER BY (
                            metric_attribution
                                ->> 'resourceLoadDuration'
                        )::DOUBLE PRECISION
                    ) AS load_duration_p75,

                    AVG(
                        (metric_attribution
                            ->> 'elementRenderDelay')
                            ::DOUBLE PRECISION
                    ) AS render_delay_average,

                    PERCENTILE_CONT(0.75)
                    WITHIN GROUP (
                        ORDER BY (
                            metric_attribution
                                ->> 'elementRenderDelay'
                        )::DOUBLE PRECISION
                    ) AS render_delay_p75

                FROM metric_events
                WHERE app_id = $1
                    AND event_time >= $2
                    AND event_time < $3
                    AND event_type = 'web.vital.lcp'
                `,
                [input.appId, input.from, input.to],
            )

            const row = result.rows[0]

            if (row === undefined) {
                throw new Error('LCP diagnostic query returned no row')
            }

            return {
                metric: {
                    type: 'web.vital.lcp',
                    unit: 'ms',
                    metricVersion: 'lcp-v1',
                },
                range: {
                    from: input.from.toISOString(),
                    to: input.to.toISOString(),
                },
                sampleCount: Number(row.sample_count),
                evidenceSampleCount: Number(row.evidence_sample_count),
                overall: {
                    average: row.overall_average,
                    p75: row.overall_p75,
                },
                phases: {
                    timeToFirstByte: {
                        average: row.ttfb_average,
                        p75: row.ttfb_p75,
                    },
                    resourceLoadDelay: {
                        average: row.load_delay_average,
                        p75: row.load_delay_p75,
                    },
                    resourceLoadDuration: {
                        average: row.load_duration_average,
                        p75: row.load_duration_p75,
                    },
                    elementRenderDelay: {
                        average: row.render_delay_average,
                        p75: row.render_delay_p75,
                    },
                },
            }
        },
        async queryClsDiagnostics(input) {
            const result = await pool.query<ClsDiagnosticRow>(
                `
                WITH cls_events AS (
                    SELECT metric_value, metric_attribution
                    FROM metric_events
                    WHERE app_id = $1
                        AND event_time >= $2
                        AND event_time < $3
                        AND event_type = 'web.vital.cls'
                ),
                target_counts AS (
                    SELECT
                        metric_attribution ->> 'largestShiftTarget' AS target,
                        COUNT(*) AS target_count
                    FROM cls_events
                    WHERE metric_attribution ->> 'largestShiftTarget' IS NOT NULL
                    GROUP BY target
                    ORDER BY target_count DESC, target ASC
                    LIMIT 1
                )
                SELECT
                    COUNT(*) AS sample_count,
                    COUNT(metric_attribution) AS evidence_sample_count,
                    AVG(metric_value) AS overall_average,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (
                        ORDER BY metric_value
                    ) AS overall_p75,
                    AVG((metric_attribution ->> 'largestShiftValue')::DOUBLE PRECISION)
                        AS largest_shift_average,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (
                        ORDER BY (metric_attribution ->> 'largestShiftValue')::DOUBLE PRECISION
                    ) AS largest_shift_p75,
                    COUNT(*) FILTER (
                        WHERE metric_attribution ->> 'loadState' = 'loading'
                    ) AS loading_count,
                    COUNT(*) FILTER (
                        WHERE metric_attribution ->> 'loadState' = 'dom-interactive'
                    ) AS dom_interactive_count,
                    COUNT(*) FILTER (
                        WHERE metric_attribution ->> 'loadState' = 'dom-content-loaded'
                    ) AS dom_content_loaded_count,
                    COUNT(*) FILTER (
                        WHERE metric_attribution ->> 'loadState' = 'complete'
                    ) AS complete_count,
                    (SELECT target FROM target_counts) AS dominant_target,
                    COALESCE(
                        (SELECT target_count FROM target_counts),
                        0
                    ) AS dominant_target_count
                FROM cls_events
                `,
                [input.appId, input.from, input.to],
            )

            const row = result.rows[0]
            if (row === undefined) {
                throw new Error('CLS diagnostic query returned no row')
            }

            const evidenceSampleCount = Number(row.evidence_sample_count)
            const dominantTargetCount = Number(row.dominant_target_count)

            return {
                metric: {
                    type: 'web.vital.cls',
                    unit: 'score',
                    metricVersion: 'cls-v1',
                },
                range: {
                    from: input.from.toISOString(),
                    to: input.to.toISOString(),
                },
                sampleCount: Number(row.sample_count),
                evidenceSampleCount,
                overall: {
                    average: row.overall_average,
                    p75: row.overall_p75,
                },
                largestShift: {
                    average: row.largest_shift_average,
                    p75: row.largest_shift_p75,
                },
                loadStates: {
                    loading: Number(row.loading_count),
                    domInteractive: Number(row.dom_interactive_count),
                    domContentLoaded: Number(row.dom_content_loaded_count),
                    complete: Number(row.complete_count),
                },
                dominantTarget:
                    row.dominant_target === null || evidenceSampleCount === 0
                        ? null
                        : {
                              selector: row.dominant_target,
                              count: dominantTargetCount,
                              share: dominantTargetCount / evidenceSampleCount,
                          },
            }
        },
        async queryInpDiagnostics(input) {
            const result = await pool.query<InpDiagnosticRow>(
                `
                WITH inp_events AS (
                    SELECT metric_value, metric_attribution
                    FROM metric_events
                    WHERE app_id = $1
                        AND event_time >= $2
                        AND event_time < $3
                        AND event_type = 'web.vital.inp'
                ),
                target_counts AS (
                    SELECT
                        metric_attribution ->> 'interactionTarget' AS target,
                        COUNT(*) AS target_count
                    FROM inp_events
                    WHERE metric_attribution ->> 'interactionTarget' IS NOT NULL
                    GROUP BY target
                    ORDER BY target_count DESC, target ASC
                    LIMIT 1
                )
                SELECT
                    COUNT(*) AS sample_count,
                    COUNT(metric_attribution) AS evidence_sample_count,
                    AVG(metric_value) AS overall_average,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (
                        ORDER BY metric_value
                    ) AS overall_p75,
                    AVG((metric_attribution ->> 'inputDelay')::DOUBLE PRECISION)
                        AS input_delay_average,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (
                        ORDER BY (metric_attribution ->> 'inputDelay')::DOUBLE PRECISION
                    ) AS input_delay_p75,
                    AVG((metric_attribution ->> 'processingDuration')::DOUBLE PRECISION)
                        AS processing_average,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (
                        ORDER BY (metric_attribution ->> 'processingDuration')::DOUBLE PRECISION
                    ) AS processing_p75,
                    AVG((metric_attribution ->> 'presentationDelay')::DOUBLE PRECISION)
                        AS presentation_average,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (
                        ORDER BY (metric_attribution ->> 'presentationDelay')::DOUBLE PRECISION
                    ) AS presentation_p75,
                    (SELECT target FROM target_counts) AS dominant_target,
                    COALESCE(
                        (SELECT target_count FROM target_counts),
                        0
                    ) AS dominant_target_count
                FROM inp_events
                `,
                [input.appId, input.from, input.to],
            )

            const row = result.rows[0]
            if (row === undefined) {
                throw new Error('INP diagnostic query returned no row')
            }

            const evidenceSampleCount = Number(row.evidence_sample_count)
            const targetCount = Number(row.dominant_target_count)

            return {
                metric: {
                    type: 'web.vital.inp',
                    unit: 'ms',
                    metricVersion: 'inp-v1',
                },
                range: {
                    from: input.from.toISOString(),
                    to: input.to.toISOString(),
                },
                sampleCount: Number(row.sample_count),
                evidenceSampleCount,
                overall: {
                    average: row.overall_average,
                    p75: row.overall_p75,
                },
                phases: {
                    inputDelay: {
                        average: row.input_delay_average,
                        p75: row.input_delay_p75,
                    },
                    processingDuration: {
                        average: row.processing_average,
                        p75: row.processing_p75,
                    },
                    presentationDelay: {
                        average: row.presentation_average,
                        p75: row.presentation_p75,
                    },
                },
                dominantTarget:
                    row.dominant_target === null || evidenceSampleCount === 0
                        ? null
                        : {
                              selector: row.dominant_target,
                              count: targetCount,
                              share: targetCount / evidenceSampleCount,
                          },
            }
        },
    }
}
