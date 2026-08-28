/**
 * 作用：隔离业务逻辑与 PostgreSQL，这样以后即使更换数据库，业务代码也不必直接依赖SQL
 */
import type { MetricsInterval, PaintEventV1, PaintMetricsResponse } from "@performance-platform/protocol"

export interface PaintMetricsQuery {
    appId: string
    from: Date
    to: Date
    interval: MetricsInterval
}

export interface EventRepository {
    insertBatch(
        events: readonly PaintEventV1[],
    ): Promise<void>

    queryPaintMetrics(
        query: PaintMetricsQuery,
    ): Promise<PaintMetricsResponse>
}