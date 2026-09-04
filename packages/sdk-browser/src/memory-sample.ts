import type { MemorySample, MemorySnapshot } from "./types/memoryCollector.type.js";

function isValidByteValue(
    value: number
): boolean {
    return (
        Number.isSafeInteger(value) && value >= 0
    )
}

function isValidSnapshot(
    snapshot: MemorySnapshot
): boolean {
    // 内存单位是字节，应满足：有限数字、非负、整数、不超过 js 安全整数范围
    // Number.isSafeInteger() 一次覆盖： !NaN、 !Infinity、!小数、!超过安全整数范围
    return (
        Number.isSafeInteger(snapshot.observedAt)
        && snapshot.observedAt >= 0
        && isValidByteValue(snapshot.usedHeap)
        && isValidByteValue(snapshot.totalHeap)
        && isValidByteValue(snapshot.heapLimit)
        && snapshot.usedHeap <= snapshot.totalHeap
        && snapshot.totalHeap <= snapshot.heapLimit
    )
}

export function createMemorySamples(
    snapshot: MemorySnapshot
): MemorySample[] {
    if (!isValidSnapshot(snapshot)) {
        return []
    }

    return [
        {
            type: 'web.memory.used_heap',
            occurredAt: snapshot.observedAt,
            metricVersion: 'memory-v1',
            payload: {
                value: snapshot.usedHeap,
                unit: 'byte'
            }
        },
        {
            type: 'web.memory.total_heap',
            occurredAt: snapshot.observedAt,
            metricVersion: 'memory-v1',
            payload: {
                value: snapshot.totalHeap,
                unit: 'byte',
            },
        },
        {
            type: 'web.memory.heap_limit',
            occurredAt: snapshot.observedAt,
            metricVersion: 'memory-v1',
            payload: {
                value: snapshot.heapLimit,
                unit: 'byte',
            },
        },
    ]
}