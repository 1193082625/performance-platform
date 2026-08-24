import type {
    BatchValidationResult,
    DiscardReason,
    Environment,
    PaintEventV1,
    PaintEventValidationContext,
    PaintMetric,
    ValidationResult,
} from './types'

const MAX_PAINT_VALUE_MS = 86_400_000
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

export function validatePaintEvent(
    input: unknown,
    context: PaintEventValidationContext,
): ValidationResult<PaintEventV1> {
    
    if (!isRecord(input)) {
        return invalid('unsupported_schema_version')
    }

    if(input.schemaVersion !== '1.0') {
        return invalid('unsupported_schema_version')
    }

    if (typeof input.eventId !== 'string' || !UUID_PATTERN.test(input.eventId)) {
        return invalid('invalid_event_id')
    }

    if (typeof input.type !== 'string' || !PAINT_METRICS.has(input.type as PaintMetric)) {
        return invalid('unsupported_event_type')
    }

    if(
        typeof input.timestamp !== 'number'
        || !Number.isFinite(input.timestamp) // .isFinite 排除 NaN、Infinity、-Infinity
        || !Number.isInteger(input.timestamp)
        || input.timestamp < context.now - MAX_PAST_AGE_MS
        || input.timestamp > context.now + MAX_FUTURE_OFFSET_MS
    ) {
        return invalid('invalid_timestamp')
    }

    if(!isRecord(input.application)) {
        return invalid('invalid_app_id')
    }

    if(
        !isBoundedString(input.application.id, 64)
        || input.application.id !== context.expectedAppId
    ) {
        return invalid('invalid_app_id')
    }

    if (
        !isBoundedString(input.application.version, 64)
        || input.application.version.toLowerCase() === 'latest'
    ) {
        return invalid('invalid_app_version')
    }

    if (
        typeof input.application.environment !== 'string'
        || !ENVIRONMENTS.has(
        input.application.environment as Environment,
        )
    ) {
        return invalid('invalid_environment')
    }

    if (!isRecord(input.runtime)) {
        return invalid('invalid_platform')
    }

    if (typeof input.runtime.platform !== 'string') {
        return invalid('invalid_platform')
    }

    if (input.runtime.platform !== 'web') {
        return invalid('platform_event_mismatch')
    }

    if (!isRecord(input.runtime.sdk)) {
        return invalid('invalid_sdk')
    }

    if (
        !isBoundedString(input.runtime.sdk.name, 128)
        || !isBoundedString(input.runtime.sdk.version, 64)
    ) {
        return invalid('invalid_sdk')
    }

    if (!isRecord(input.session)) {
        return invalid('invalid_session_id')
    }

    if (!isBoundedString(input.session.sessionId, 128)) {
        return invalid('invalid_session_id')
    }

    if (!isBoundedString(input.session.viewId, 128)) {
        return invalid('invalid_view_id')
    }

    if (!isRecord(input.payload)) {
        return invalid('invalid_value')
    }

    if (
        typeof input.payload.value !== 'number'
        || !Number.isFinite(input.payload.value)
        || input.payload.value < 0
        || input.payload.value >= MAX_PAINT_VALUE_MS
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