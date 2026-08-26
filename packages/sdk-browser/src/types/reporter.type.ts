import type { PaintEventV1 } from "@performance-platform/protocol"

export type SendBeacon = (
    endpoint: string, // 要上报的api地址
    body: string
) => boolean

export interface FetchResponseLike {
    ok: boolean
}

export type FetchTransport = (
    endpoint: string,
    options: {
        method: 'POST'
        headers: {
            'content-type': 'application/json'
        }
        body: string
        keepalive: true
    },
) => Promise<FetchResponseLike>

// 创建 Reporter 时由外部提供的配置和传输能力
export interface ReporterOptions {
    endpoint: string // 上报API地址
    sendBeacon?: SendBeacon
    fetch?: FetchTransport
    // 可选，Reporter 内部发生异常时，不把异常抛给业务代码，但可以把诊断信息交给调用者
    // message 说明哪个阶段失败了
    // error 是原始异常，可能不存在
    debug?: (message: string, error?:unknown) => void
}

// 公开接口描述“使用者可以做什么”
export interface Reporter {
    // 将一条完整事件加入待发送队列
    enqueue(event: PaintEventV1): void
    // 尝试发送队列中的事件
    flush(): Promise<void>
}