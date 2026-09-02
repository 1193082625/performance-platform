import type {
    BatchValidationResult,
    DiscardReason,
    Environment,
    MetricBatchValidationResult,
    MetricEventV2,
    MetricEventValidationContext,
    PaintEventV1,
    PaintEventValidationContext,
    PaintMetric,
    ValidationResult,
} from './types.js'

const MAX_DURATION_MS = 86_400_000
// 允许最早： NOW - 30 天
const MAX_PAST_AGE_MS = 30 * 24 * 60 * 60 * 1000
// 允许最晚： NOW + 5 分钟
const MAX_FUTURE_OFFSET_MS = 5 * 60 * 1000
const MAX_BATCH_SIZE = 20

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ReadonlySet<Environment> 约束集合中可以存放 Environment，且只读
const ENVIRONMENTS: ReadonlySet<Environment> = new Set([
    'development',
    'test',
    'staging',
    'production',
])

const PAINT_METRICS: ReadonlySet<PaintMetric> = new Set([
    'web.paint.fp',
    'web.paint.fcp',
])

const METRIC_UNITS = {
    'web.paint.fp': 'ms',
    'web.paint.fcp': 'ms',
    'web.vital.lcp': 'ms',
    'web.vital.inp': 'ms',
    'web.vital.cls': 'score',
    'web.memory.used_heap': 'byte',
    'web.memory.total_heap': 'byte',
    'web.memory.heap_limit': 'byte',
} as const

const METRIC_VERSIONS = {
    'web.paint.fp': 'paint-v1',
    'web.paint.fcp': 'paint-v1',
    'web.vital.lcp': 'lcp-v1',
    'web.vital.inp': 'inp-v1',
    'web.vital.cls': 'cls-v1',
    'web.memory.used_heap': 'memory-v1',
    'web.memory.total_heap': 'memory-v1',
    'web.memory.heap_limit': 'memory-v1',
} as const satisfies Record<SupportedMetric, string>

type SupportedMetric = keyof typeof METRIC_UNITS

function isSupportedMetric(value: unknown): value is SupportedMetric {
    return typeof value === 'string' && Object.hasOwn(METRIC_UNITS, value)
}

// 先把输入缩小为可安全读取属性的对象
function isRecord(value: unknown): value is Record<string, unknown> {
    // 必须是对象，不为空，不是数组
    return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
    )
}

// : value is string ，这叫做类型谓词 或 用户定义类型守卫
// 表示告诉 ts：函数返回true 时，参数 value 在当前分支中可以被视为 string
function isBoundedString(
    value: unknown,
    maximumLength: number,
): value is string {
    return (
        typeof value === 'string' && value.trim().length > 0 && value.length <= maximumLength
    )
}

function invalid<T>(
    reason: DiscardReason
): ValidationResult<T> {
    return {
        ok: false,
        reason,
    }
}

function isValidEventTimestamp(
    value: unknown,
    now: number,
): value is number {
    return (
        typeof value === 'number'
        && Number.isFinite(value)
        && Number.isInteger(value)
        && value >= now - MAX_PAST_AGE_MS
        && value <= now + MAX_FUTURE_OFFSET_MS
    )
}

function isValidEventId(
    value: unknown,
): value is string {
    return (
        typeof value === 'string'
        && UUID_PATTERN.test(value)
    )
}

function getApplicationDiscardReason(
    value: unknown,
    expectedAppId: string,
): DiscardReason | undefined {
    if (!isRecord(value)) {
        return 'invalid_app_id'
    }

    if (
        !isBoundedString(value.id, 64)
        || value.id !== expectedAppId
    ) {
        return 'invalid_app_id'
    }

    if (
        !isBoundedString(value.version, 64)
        || value.version.toLowerCase() === 'latest'
    ) {
        return 'invalid_app_version'
    }

    if (
        typeof value.environment !== 'string'
        || !ENVIRONMENTS.has(value.environment as Environment)
    ) {
        return 'invalid_environment'
    }

    return undefined
}

function getRuntimeDiscardReason(
    value: unknown,
): DiscardReason | undefined {
    if (!isRecord(value)) {
        return 'invalid_platform'
    }

    if (typeof value.platform !== 'string') {
        return 'invalid_platform'
    }

    if (value.platform !== 'web') {
        return 'platform_event_mismatch'
    }

    if (!isRecord(value.sdk)) {
        return 'invalid_sdk'
    }

    if (
        !isBoundedString(value.sdk.name, 128)
        || !isBoundedString(value.sdk.version, 64)
    ) {
        return 'invalid_sdk'
    }

    return undefined
}

function getSessionDiscardReason(
    value: unknown,
): DiscardReason | undefined {
    if (!isRecord(value)) {
        return 'invalid_session_id'
    }

    if (!isBoundedString(value.sessionId, 128)) {
        return 'invalid_session_id'
    }

    if (!isBoundedString(value.viewId, 128)) {
        return 'invalid_view_id'
    }

    return undefined
}

export function validatePaintEvent(
    input: unknown,
    context: PaintEventValidationContext,
): ValidationResult<PaintEventV1> {

    if (!isRecord(input)) {
        return invalid('unsupported_schema_version')
    }

    if (input.schemaVersion !== '1.0') {
        return invalid('unsupported_schema_version')
    }

    if (!isValidEventId(input.eventId)) {
        return invalid('invalid_event_id')
    }

    if (typeof input.type !== 'string' || !PAINT_METRICS.has(input.type as PaintMetric)) {
        return invalid('unsupported_event_type')
    }

    if (
        !isValidEventTimestamp(input.timestamp, context.now)
    ) {
        return invalid('invalid_timestamp')
    }

    const applicationReason = getApplicationDiscardReason(
        input.application,
        context.expectedAppId,
    )

    if (applicationReason !== undefined) {
        return invalid(applicationReason)
    }

    const runtimeReason = getRuntimeDiscardReason(
        input.runtime,
    )

    if (runtimeReason !== undefined) {
        return invalid(runtimeReason)
    }

    const sessionReason = getSessionDiscardReason(
        input.session,
    )

    if (sessionReason !== undefined) {
        return invalid(sessionReason)
    }

    if (!isRecord(input.payload)) {
        return invalid('invalid_value')
    }

    if (
        typeof input.payload.value !== 'number'
        || !Number.isFinite(input.payload.value)
        || input.payload.value < 0
        || input.payload.value >= MAX_DURATION_MS
    ) {
        return invalid('invalid_value')
    }

    if (input.payload.unit !== 'ms') {
        return invalid('invalid_unit')
    }

    return {
        ok: true,
        value: input as unknown as PaintEventV1, // ts 无法根据大量逐字段检查自动推导出完整的嵌套接口
    }
}
export function validatePaintBatch(
    input: unknown,
    context: PaintEventValidationContext,
  ): BatchValidationResult {
    if (
      !isRecord(input)
      || !Array.isArray(input.events)
      || input.events.length === 0
    ) {
      return {
        ok: false,
        code: 'INVALID_BATCH',
      }
    }
  
    if (input.events.length > MAX_BATCH_SIZE) {
      return {
        ok: false,
        code: 'BATCH_TOO_LARGE',
      }
    }
  
    const acceptedEvents: PaintEventV1[] = []
    const reasons: Partial<Record<DiscardReason, number>> = {}
  
    let discarded = 0
  
    for (const event of input.events) {
      const result = validatePaintEvent(event, context)
  
      if (result.ok) {
        acceptedEvents.push(result.value)
        continue
      }
  
      discarded += 1
  
      const previousCount = reasons[result.reason] ?? 0
      reasons[result.reason] = previousCount + 1
    }
  
    return {
      ok: true,
      value: {
        acceptedEvents,
        discarded,
        reasons,
      },
    }
}

export function validateMetricEvent(
    input: unknown,
    context: MetricEventValidationContext,
): ValidationResult<MetricEventV2> {
    if (!isRecord(input)) {
        return invalid('unsupported_schema_version')
    }

    if (input.schemaVersion !== '2.0') {
        return invalid('unsupported_schema_version')
    }

    if (!isValidEventId(input.eventId)) {
        return invalid('invalid_event_id')
    }

    if (!isSupportedMetric(input.type)) {
        return invalid('unsupported_event_type')
    }

    if (
        !isValidEventTimestamp(input.timestamp, context.now)
    ) {
        return invalid('invalid_timestamp')
    }

    if(
        typeof input.sampleRate !== 'number'
        || !Number.isFinite(input.sampleRate)
        || input.sampleRate <= 0
        || input.sampleRate > 1
    ) {
        return invalid('invalid_sample_rate')
    }

    if (!isBoundedString(input.metricVersion, 64)) {
        return invalid('invalid_metric_version')
    }

    const expectedMetricVersion = METRIC_VERSIONS[input.type]

    if (input.metricVersion !== expectedMetricVersion) {
        return invalid('invalid_metric_version')
    }

    const applicationReason = getApplicationDiscardReason(
        input.application,
        context.expectedAppId,
    )

    if (applicationReason !== undefined) {
        return invalid(applicationReason)
    }

    const runtimeReason = getRuntimeDiscardReason(
        input.runtime,
    )

    if (runtimeReason !== undefined) {
        return invalid(runtimeReason)
    }

    const sessionReason = getSessionDiscardReason(
        input.session,
    )

    if (sessionReason !== undefined) {
        return invalid(sessionReason)
    }

    if (!isRecord(input.payload)) {
        return invalid('invalid_value')
    }

    const metricValue = input.payload.value

    if (
        typeof metricValue !== 'number'
        || !Number.isFinite(metricValue)
        || metricValue < 0
    ) {
        return invalid('invalid_value')
    }

    const expectedUnit = METRIC_UNITS[input.type]

    if (input.payload.unit !== expectedUnit) {
        return invalid('invalid_unit')
    }

    if (expectedUnit === 'ms' && metricValue >= MAX_DURATION_MS) {
        return invalid('invalid_value')
    }

    if (expectedUnit === 'byte' && !Number.isSafeInteger(metricValue)) {
        return invalid('invalid_value')
    }

    return {
        ok: true,
        value: input as unknown as MetricEventV2,
    }
}

export function validateMetricBatch(
    input: unknown,
    context: MetricEventValidationContext,
): MetricBatchValidationResult {
    const acceptedEvents: MetricEventV2[] = []
    const reasons: Partial<Record<DiscardReason, number>> = {}
    let discarded = 0

    if (
        !isRecord(input)
        || !Array.isArray(input.events)
        || input.events.length === 0
    ) {
        return {
            ok: false,
            code: 'INVALID_BATCH',
        }
    }

    if (input.events.length > MAX_BATCH_SIZE) {
        return {
            ok: false,
            code: 'BATCH_TOO_LARGE',
        }
    }

    for (const event of input.events) {
        const result = validateMetricEvent(event, context)
        if (result.ok) {
            acceptedEvents.push(result.value)
            continue
        }

        discarded += 1

        const previousCount = reasons[result.reason] ?? 0
        reasons[result.reason] = previousCount + 1
    }

    return {
        ok: true,
        value: {
            acceptedEvents,
            discarded,
            reasons,
        },
    }
}