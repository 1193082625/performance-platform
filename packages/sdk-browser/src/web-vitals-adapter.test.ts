import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.hoisted() 的原因是 vi.mock() 会被 Vitest 提升到文件顶部执行， vi.hoisted() 保证这些 Mock 在 vi.mock() 使用前已经创建
const webVitalsMocks = vi.hoisted(() => ({
    plainOnLcp: vi.fn(),
    attributedOnLcp: vi.fn(),
    attributedOnCls: vi.fn(),
    attributedOnInp: vi.fn(),
}))

// 创建两个 Mock 函数，模拟两个不同的模块入口
// Mock 必须在导入适配器之前声明
vi.mock('web-vitals/onLCP.js', () => ({
    onLCP: webVitalsMocks.plainOnLcp,
}))

vi.mock('web-vitals/attribution/onLCP.js', () => ({
    onLCP: webVitalsMocks.attributedOnLcp,
}))

vi.mock('web-vitals/attribution/onCLS.js', () => ({
    onCLS: webVitalsMocks.attributedOnCls,
}))

vi.mock('web-vitals/attribution/onINP.js', () => ({
    onINP: webVitalsMocks.attributedOnInp,
}))

import {
    observeClsWithWebVitals,
    observeLcpWithWebVitals,
    observeInpWithWebVitals,
} from './web-vitals-adapter'

describe('observeLcpWithWebVitals', () => {
    beforeEach(() => {
        // 清除 调用次数、调用参数、上一次测试留下的状态
        vi.clearAllMocks()
    })

    it('maps attributed web-vitals LCP data', () => {
        // 模拟 web-vitals 主动回调
        webVitalsMocks.attributedOnLcp.mockImplementationOnce((callback) => {
            callback({
                value: 2_300,
                attribution: {
                    timeToFirstByte: 800,
                    resourceLoadDelay: 300,
                    resourceLoadDuration: 900,
                    elementRenderDelay: 300,
                    target: '.hero-image',
                    url: 'https://example.com/hero.webp',
                },
            })
        })

        const callback = vi.fn()

        observeLcpWithWebVitals(callback)

        expect(webVitalsMocks.attributedOnLcp).toHaveBeenCalledOnce()
        expect(webVitalsMocks.plainOnLcp).not.toHaveBeenCalled()

        expect(callback).toHaveBeenCalledWith({
            value: 2_300,
            attribution: {
                timeToFirstByte: 800,
                resourceLoadDelay: 300,
                resourceLoadDuration: 900,
                elementRenderDelay: 300,
                element: '.hero-image',
                url: 'https://example.com/hero.webp',
            },
        })
    })
})

describe('observeInpWithWebVitals', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('maps attributed web-vitals INP data', () => {
        webVitalsMocks.attributedOnInp.mockImplementationOnce((callback) => {
            callback({
                value: 320,
                entries: [{ startTime: 2_400 }],
                attribution: {
                    inputDelay: 80,
                    processingDuration: 180,
                    presentationDelay: 60,
                    loadState: 'complete',
                    interactionType: 'pointer',
                    interactionTarget: '#checkout',
                    interactionTime: 2_400,
                    totalScriptDuration: 150,
                    totalStyleAndLayoutDuration: 20,
                    totalPaintDuration: 30,
                },
            })
        })

        const callback = vi.fn()

        observeInpWithWebVitals(callback)

        expect(callback).toHaveBeenCalledWith({
            value: 320,
            interactionStartTime: 2_400,
            attribution: {
                inputDelay: 80,
                processingDuration: 180,
                presentationDelay: 60,
                loadState: 'complete',
                interactionType: 'pointer',
                interactionTarget: '#checkout',
                interactionTime: 2_400,
                totalScriptDuration: 150,
                totalStyleAndLayoutDuration: 20,
                totalPaintDuration: 30,
            },
        })
    })
})

describe('observeClsWithWebVitals', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('maps attributed web-vitals CLS data', () => {
        webVitalsMocks.attributedOnCls.mockImplementationOnce((callback) => {
            callback({
                value: 0.18,
                entries: [{ startTime: 2_400 }],
                attribution: {
                    largestShiftTarget: '.promo-banner',
                    largestShiftTime: 2_200,
                    largestShiftValue: 0.14,
                    loadState: 'complete',
                    largestShiftSource: {
                        previousRect: { x: 0, y: 100, width: 800, height: 80 },
                        currentRect: { x: 0, y: 180, width: 800, height: 80 },
                    },
                },
            })
        })

        const callback = vi.fn()

        observeClsWithWebVitals(callback)

        expect(callback).toHaveBeenCalledWith({
            value: 0.18,
            lastEntryStartTime: 2_400,
            attribution: {
                largestShiftTarget: '.promo-banner',
                largestShiftTime: 2_200,
                largestShiftValue: 0.14,
                loadState: 'complete',
                previousRect: { x: 0, y: 100, width: 800, height: 80 },
                currentRect: { x: 0, y: 180, width: 800, height: 80 },
            },
        })
    })
})
