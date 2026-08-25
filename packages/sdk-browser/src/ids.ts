/**
 * 负责三种ID 的生命周期
 * 
 * 三种ID的关系：
 * session-A
    └── view-A
        ├── event-1：FP
        └── event-2：FCP

 * 用户刷新页面后（刷新页面属于新的页面加载）：
    session-A
    ├── view-A
    │   ├── event-1：刷新前 FP
    │   └── event-2：刷新前 FCP
    └── view-B
        ├── event-3：刷新后 FP
        └── event-4：刷新后 FCP
 */
import type {
    MonitorIdDependencies,
    MonitorIds,
} from "./types/ids.type";

export const SESSION_ID_STORAGE_KEY = '@performance-platform/session-id'

function isUsableStoredId(
    value: unknown
): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= 128
}

// monitor -- 监控
export function createMonitorIds(
    dependencies: MonitorIdDependencies,
): MonitorIds {
    // 创建时立即保存 View ID，防止重复入库
    const viewId = dependencies.randomUUID()
    let sessionId: string | undefined

    // Event ID 不缓存，每次调用都会执行生成器
    const createEventId = (): string => {
        return dependencies.randomUUID()
    }

    const getViewId = (): string => {
        return viewId
    }

    const getSessionId = (): string => {
        // 后续调用首先命中
        if (sessionId !== undefined) {
            return sessionId
        }
        // 检查内存
        try {
            const storedSessionId = dependencies.sessionStorage?.getItem(SESSION_ID_STORAGE_KEY)
            if (isUsableStoredId(storedSessionId)) {
                sessionId = storedSessionId
                return sessionId
            }
        } catch {
            // Storage 不可用时继续使用内存 Session ID
        }

        // 必要时生成
        sessionId = dependencies.randomUUID()

        // 尝试写入
        try {
            dependencies.sessionStorage?.setItem(
                SESSION_ID_STORAGE_KEY,
                sessionId
            )
        } catch {
            // 写入失败不影响当前页面继续使用内存中的 Session ID
        }
        return sessionId
    }


    return {
        createEventId,
        getViewId,
        getSessionId
    }
}