export interface SessionStorageLike {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
}

export interface MonitorIdDependencies {
    randomUUID(): string
    sessionStorage?: SessionStorageLike
}

export interface MonitorIds {
    getSessionId(): string // 当前标签页会话，刷新页面后保持不变
    getViewId(): string // 当前页面加载，刷新页面后重新生成
    createEventId(): string
}