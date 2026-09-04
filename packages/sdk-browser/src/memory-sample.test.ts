import {
    describe,
    expect,
    it,
} from 'vitest'

import type {
    MemorySample,
    MemorySnapshot,
} from './types/memoryCollector.type.js'
import { createMemorySamples } from './memory-sample.js'

describe('memory monitoring type contract', () => {
    it('accepts a memory snapshot', () => {
        const snapshot: MemorySnapshot = {
            observedAt: 1_000_000,
            usedHeap: 100,
            totalHeap: 200,
            heapLimit: 1000,
        }

        expect(snapshot.usedHeap).toBe(100)
    })

    it('accepts memory samples', () => {
        const samples: MemorySample[] = [
            {
                type: 'web.memory.used_heap',
                occurredAt: 1_000_000,
                metricVersion: 'memory-v1',
                payload: {
                    value: 100,
                    unit: 'byte',
                },
            },
            {
                type: 'web.memory.total_heap',
                occurredAt: 1_000_000,
                metricVersion: 'memory-v1',
                payload: {
                    value: 200,
                    unit: 'byte',
                },
            },
            {
                type: 'web.memory.heap_limit',
                occurredAt: 1_000_000,
                metricVersion: 'memory-v1',
                payload: {
                    value: 1000,
                    unit: 'byte',
                },
            },
        ]

        expect(samples).toHaveLength(3)
    })

    it('rejects milliseconds as the memory unit', () => {
        const sample: MemorySample = {
            type: 'web.memory.used_heap',
            occurredAt: 1_000_000,
            metricVersion: 'memory-v1',
            payload: {
                value: 100,

                // @ts-expect-error memory must use bytes
                unit: 'ms',
            },
        }

        expect(sample.payload.value).toBe(100)
    })

    it('converts one snapshot into three memory samples', () => {
        const samples = createMemorySamples({
            observedAt: 1_000_000,
            usedHeap: 100,
            totalHeap: 200,
            heapLimit: 1000,
        })
    
        expect(samples).toEqual([
            {
                type: 'web.memory.used_heap',
                occurredAt: 1_000_000,
                metricVersion: 'memory-v1',
                payload: {
                    value: 100,
                    unit: 'byte',
                },
            },
            {
                type: 'web.memory.total_heap',
                occurredAt: 1_000_000,
                metricVersion: 'memory-v1',
                payload: {
                    value: 200,
                    unit: 'byte',
                },
            },
            {
                type: 'web.memory.heap_limit',
                occurredAt: 1_000_000,
                metricVersion: 'memory-v1',
                payload: {
                    value: 1000,
                    unit: 'byte',
                },
            },
        ])
    })

    it.each([
        {
            observedAt: 1_000_000,
            usedHeap: 201,
            totalHeap: 200,
            heapLimit: 1000,
        },
        {
            observedAt: 1_000_000,
            usedHeap: 100,
            totalHeap: 1001,
            heapLimit: 1000,
        },
    ])(
        'rejects an inconsistent snapshot %#',
        (snapshot) => {
            expect(
                createMemorySamples(snapshot),
            ).toEqual([])
        },
    )

    it.each([
        {
            observedAt: 1_000_000,
            usedHeap: Number.NaN,
            totalHeap: 200,
            heapLimit: 1000,
        },
        {
            observedAt: 1_000_000,
            usedHeap: 100.5,
            totalHeap: 200,
            heapLimit: 1000,
        },
        {
            observedAt: 1_000_000,
            usedHeap: -1,
            totalHeap: 200,
            heapLimit: 1000,
        },
    ])(
        'rejects an invalid memory value %#',
        (snapshot) => {
            expect(
                createMemorySamples(snapshot),
            ).toEqual([])
        },
    )
})