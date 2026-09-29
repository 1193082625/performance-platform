/**
 * 作用：隔离业务逻辑与 PostgreSQL，这样以后即使更换数据库，业务代码也不必直接依赖SQL
 */
import type {
    MetricEventV2,
    MetricsInterval,
    PaintEventV1,
    PaintMetricsData,
    MetricDefinition,
    MetricQueryResponse,
    MemoryHealthSnapshot,
    LcpDiagnosticResponse,
    ClsDiagnosticResponse,
    InpDiagnosticResponse,
} from '@performance-platform/protocol'

export interface PaintMetricsQuery {
    appId: string
    from: Date
    to: Date
    interval: MetricsInterval
}

export interface LcpDiagnosticRepository {
    queryLcpDiagnostics(input: {
        appId: string
        from: Date
        to: Date
    }): Promise<LcpDiagnosticResponse>
}

export interface ClsDiagnosticRepository {
    queryClsDiagnostics(input: {
        appId: string
        from: Date
        to: Date
    }): Promise<ClsDiagnosticResponse>
}

export interface InpDiagnosticRepository {
    queryInpDiagnostics(input: {
        appId: string
        from: Date
        to: Date
    }): Promise<InpDiagnosticResponse>
}

export type StorableMetricEvent = PaintEventV1 | MetricEventV2

export interface InsertBatchOptions {
    projectId: string
}

export interface EventRepository {
    insertBatch(
        events: readonly StorableMetricEvent[],
        options: InsertBatchOptions,
    ): Promise<void>

    queryPaintMetrics(query: PaintMetricsQuery): Promise<PaintMetricsData>
}

export interface ActiveProjectKey {
    projectId: string
}

export interface ProjectKeyRepository {
    findActiveProjectByKeyHash(
        keyHash: string,
    ): Promise<ActiveProjectKey | undefined>
}

export interface MetricQuery {
    appId: string
    metric: MetricDefinition
    from: Date
    to: Date
    interval: MetricsInterval
}

export interface MetricQueryRepository {
    queryMetric(query: MetricQuery): Promise<MetricQueryResponse>
}

export interface MemoryHealthRepository {
    queryLatestViewMemorySnapshots(input: {
        appId: string
        from: Date
        to: Date
    }): Promise<MemoryHealthSnapshot[]>
}
