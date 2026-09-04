import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import {
    createMemoryCollector,
} from './memory-collector.js'

function createSchedulerHarness() {
    const callbacks = new Map<number, () => void>()
    let nextTimerId = 1

    const scheduler = {
        setInterval: vi.fn(
            (
                callback: () => void,
                _intervalMs: number,
            ) => {
                const timerId = nextTimerId++
                callbacks.set(timerId, callback)
                return timerId
            },
        ),

        clearInterval: vi.fn((timerId: number) => {
            callbacks.delete(timerId)
        }),
    }

    return {
        scheduler,
        callbacks,
    }
}

function createHarness() {
    const readMemory = vi.fn(() => ({
        usedJSHeapSize: 100,
        totalJSHeapSize: 200,
        jsHeapSizeLimit: 1000,
    }))

    const now = vi.fn(() => 1_000_000)
    const onSamples = vi.fn()

    const collector = createMemoryCollector({
        readMemory,
        now,
        onSamples,
    })

    return {
        collector,
        readMemory,
        now,
        onSamples,
    }
}

describe('createMemoryCollector', () => {
    it('collects once when started without reporting immediately', () => {
        const {
            collector,
            readMemory,
            onSamples,
        } = createHarness()

        collector.start()
        collector.start()

        expect(readMemory).toHaveBeenCalledTimes(1)
        expect(onSamples).not.toHaveBeenCalled()
    })

    it('flushes one memory snapshot as three samples', () => {
        const {
            collector,
            onSamples,
        } = createHarness()
    
        collector.start()
        collector.flush()
    
        expect(onSamples).toHaveBeenCalledOnce()
    
        expect(onSamples).toHaveBeenCalledWith([
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

    it('reports a collected snapshot at most once', () => {
        const {
            collector,
            onSamples,
        } = createHarness()
    
        collector.start()
        collector.flush()
        collector.flush()
    
        expect(onSamples).toHaveBeenCalledTimes(1)
    })

    it('discards a pending snapshot when destroyed', () => {
        const {
            collector,
            onSamples,
        } = createHarness()
    
        collector.start()
        collector.destroy()
        collector.flush()
    
        expect(onSamples).not.toHaveBeenCalled()
    })

    it('does not throw when the memory API is unavailable', () => {
        const collector = createMemoryCollector({
            now: () => 1_000_000,
            onSamples: vi.fn(),
        })
    
        expect(() => collector.start()).not.toThrow()
        expect(() => collector.flush()).not.toThrow()
    })

    it('does not throw when reading memory fails', () => {
        const collector = createMemoryCollector({
            readMemory: () => {
                throw new Error('memory unavailable')
            },
            now: () => 1_000_000,
            onSamples: vi.fn(),
        })
    
        expect(() => collector.start()).not.toThrow()
    })

    // 注册两个默认周期
    it('registers collection and reporting intervals', () => {
        const { scheduler } = createSchedulerHarness()
    
        const collector = createMemoryCollector({
            readMemory: () => ({
                usedJSHeapSize: 100,
                totalJSHeapSize: 200,
                jsHeapSizeLimit: 1000,
            }),
            now: () => 1_000_000,
            onSamples: vi.fn(),
            scheduler,
        })
    
        collector.start()
        collector.start()
    
        expect(scheduler.setInterval).toHaveBeenCalledTimes(2)
        expect(scheduler.setInterval).toHaveBeenNthCalledWith(
            1,
            expect.any(Function),
            30_000,
        )
        expect(scheduler.setInterval).toHaveBeenNthCalledWith(
            2,
            expect.any(Function),
            300_000,
        )
    })

    // 定时采集覆盖旧快照
    it('reports the latest periodically collected snapshot', () => {
        const { scheduler } = createSchedulerHarness()
        const onSamples = vi.fn()
    
        let usedHeap = 100
    
        const collector = createMemoryCollector({
            readMemory: () => ({
                usedJSHeapSize: usedHeap,
                totalJSHeapSize: 200,
                jsHeapSizeLimit: 1000,
            }),
            now: () => 1_000_000,
            onSamples,
            scheduler,
        })
    
        collector.start()
    
        const collectCallback =
            scheduler.setInterval.mock.calls[0]?.[0]
    
        const reportCallback =
            scheduler.setInterval.mock.calls[1]?.[0]
    
        expect(collectCallback).toBeDefined()
        expect(reportCallback).toBeDefined()
    
        usedHeap = 150
        collectCallback?.()
        reportCallback?.()
    
        expect(onSamples).toHaveBeenCalledOnce()
        expect(onSamples.mock.calls[0]?.[0][0]).toEqual({
            type: 'web.memory.used_heap',
            occurredAt: 1_000_000,
            metricVersion: 'memory-v1',
            payload: {
                value: 150,
                unit: 'byte',
            },
        })
    })

    it('clears both intervals when destroyed', () => {
        const { scheduler } = createSchedulerHarness()
    
        const collector = createMemoryCollector({
            readMemory: () => ({
                usedJSHeapSize: 100,
                totalJSHeapSize: 200,
                jsHeapSizeLimit: 1000,
            }),
            now: () => 1_000_000,
            onSamples: vi.fn(),
            scheduler,
        })
    
        collector.start()
        collector.destroy()
        collector.destroy()
    
        expect(scheduler.clearInterval).toHaveBeenCalledTimes(2)
        expect(scheduler.clearInterval).toHaveBeenNthCalledWith(1, 1)
        expect(scheduler.clearInterval).toHaveBeenNthCalledWith(2, 2)
    })
})