// 环境
export type Environment = 
    | 'development'
    | 'test'
    | 'staging'
    | 'production'

// 上报类型
export type PaintMetric = 
    | 'web.paint.fp'
    | 'web.paint.fcp'

// 上报内容
export interface PaintEventV1 {
    schemaVersion: '1.0' // 事件协议版本
    eventId: string   // 上报事件ID，用于幂等；必须是标准 UUID
    type: PaintMetric // 上报类型
    timestamp: number // 指标实际发生时间，Unix epoch 毫秒整数

    application: {
        id: string // 被监控应用稳定标识，1–64 字符
        version: string // 业务发布版本，由构建/发布系统注入
        environment: Environment // 开发、测试、预发或生产环境
    }

    runtime: {
        platform: 'web' // v0.1.0 目前只接受 web
        sdk: {
            name: string
            version: string
        }
    }

    session: {
        sessionId: string // 标签页会话标识，1–128 字符
        viewId: string // 本次页面加载标识，1–128 字符
    }

    payload: {
        value: number // 相对导航起点的绘制耗时，有限、非负且小于 86,400,000 ms
        unit: 'ms'
    }
}

// 丢弃原因
export type DiscardReason = 
    | 'unsupported_schema_version'
    | 'invalid_event_id'
    | 'invalid_app_id'
    | 'invalid_app_version'
    | 'invalid_environment'
    | 'unsupported_event_type'
    | 'invalid_timestamp'
    | 'invalid_platform'
    | 'platform_event_mismatch'
    | 'invalid_session_id'
    | 'invalid_view_id'
    | 'invalid_sdk'
    | 'invalid_value'
    | 'invalid_unit'

// 上报内容校验结果
export type ValidationResult<T> = 
    | {
        ok: true,
        value: T
    }
    | {
        ok: false,
        reason: DiscardReason
    }

// 校验事件时由服务端提供的可信上下文
export interface PaintEventValidationContext {
    expectedAppId: string
    now: number
}

// 批量提交
export interface BatchRequestV1 {
    events: PaintEventV1[]
}

// 批量提交结果
export interface BatchResponse {
    accepted: number
    discarded: number
    reasons: Partial<Record<DiscardReason, number>>
}

// 批量提交错误码
export type BatchErrorCode = 
    | 'INVALID_BATCH' // 批次结构非法
    | 'BATCH_TOO_LARGE' // 超过20条

// 所有API错误的稳定、机器可读标识
export type ApiErrorCode = 
    | BatchErrorCode
    | 'INVALID_JSON' 
    | 'PAYLOAD_TOO_LARGE'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'INVALID_DATE' // 日期无法解析
    | 'INVALID_INTERVAL'
    | 'INVALID_TIME_RANGE' // from >= to
    | 'TIME_RANGE_TOO_LARGE'
    | 'INTERNAL_ERROR'
    | 'STORAGE_UNAVAILABLE' // PostgreSQL 不可用

// 统一的非成功响应
export interface ApiErrorResponse {
    error: {
        code: ApiErrorCode
        message: string
        requestId: string
        details?: Record<string, unknown>
    }
}

// 校验批量提交内容结果
export interface ValidatedPaintBatch {
    acceptedEvents: PaintEventV1[]
    discarded: number
    reasons: Partial<Record<DiscardReason, number>>
}

export type BatchValidationResult = 
    | {
        ok: true
        value: ValidatedPaintBatch
    }
    | {
        ok: false
        code: BatchErrorCode
    }

// 表示时间序列的聚合力度
export type MetricsInterval = 
    | 'minute' // 每分钟一个数据点
    | 'hour'   // 每小时一个数据点
    | 'day'    // 每天一个数据点

// 表示 URL 查询参数
// 比如： GET /api/v1/metrics/paint?from=2026-08-23T00:00:00.000Z&to=2026-08-24T00:00:00.000Z&interval=hour
export interface PaintMetricsQueryParams {
    from?: string // 时间
    to?: string   // 时间
    interval?: MetricsInterval
}

// 表示某项指标在一个统计范围内的聚合结果
export interface PaintStats {
    count: number // 有效样本数
    average: number | null // 算术平均耗时，单位 ms
    p50: number | null // 50% 样本不超过该值
    p75: number | null // 75% 样本不超过该值
    p90: number | null // 90% 样本不超过该值
}

// 时间序列中的一个时间桶
export interface PaintSeriesPoint {
    time: string // 当前时间桶的起始时间，ISO 8601 UTC 字符串。比如："2026-08-24T09:00:00.000Z",
    fp: PaintStats
    fcp: PaintStats
}

// 指标查询接口的完整成功响应
export interface PaintMetricsData {
    // 服务端最终采用的标准化查询范围 [from, to)
    range: {
        from: string
        to: string
        interval: MetricsInterval
    }

    // 整个查询范围的总体统计
    summary: {
        fp: PaintStats
        fcp: PaintStats
    }

    // 按 interval 分桶后的趋势数据
    series: PaintSeriesPoint[]
}

export type PaintScoreStatus = 
    | 'good'
    | 'needs-improvement'
    | 'poor'

export interface PaintScore {
    value: number
    status: PaintScoreStatus
    version: 'paint-v1',
    components: {
        fp: number
        fcp: number
    }
}

export interface PaintMetricsResponse extends PaintMetricsData {
    score: PaintScore | null
}