/**
 * Monitor 本身不重新实现采集、ID或上报，而是把已有模块连接起来
 * 
 * createMonitorIds()
        ↓
    提供三个 ID

    createPaintCollector()
            ↓ onSample
    createPaintEvent()
            ↓
    reporter.enqueue()


    浏览器全局对象                    内部依赖
────────────────────────────────────────
performance.timeOrigin      →    timeOrigin
crypto.randomUUID()         →    randomUUID
PerformanceObserver         →    createObserver
navigator.sendBeacon        →    sendBeacon
window.fetch                →    fetch
sessionStorage              →    sessionStorage
document                    →    pageLifecycle
 */
import { createMonitorIds } from "./ids";
import { createPaintCollector } from "./paint-collector";
import { createPaintEvent } from "./paint-event";
import { createReporter } from "./reporter";
import type { PaintMonitor, PaintMonitorConfig, PaintMonitorDependencies } from "./types/paintMonitor.type";

function getBrowserSessionStorage(): PaintMonitorDependencies['sessionStorage'] {
    try {
        return globalThis.sessionStorage
    } catch {
        return undefined
    }
}

function getBrowserPageLifecycle():
    PaintMonitorDependencies['pageLifecycle'] {
    try {
        return globalThis.document
    } catch {
        return undefined
    }
}

export function createPaintMonitor(config: PaintMonitorConfig): PaintMonitor {
    const browserSessionStorage = getBrowserSessionStorage()
    const browserPageLifecycle = getBrowserPageLifecycle()
    /**
     * performance 和 crypto 都是现代浏览器提供的全局对象。浏览器运行js时，会自动提供
     */
    return createPaintMonitorWithDependencies(
        config,
        {
            timeOrigin: performance.timeOrigin,
            randomUUID: () => crypto.randomUUID(),
            ...(browserSessionStorage === undefined
                ? {}
                : {
                    sessionStorage:
                        browserSessionStorage,
                }),
            // 等同于 nvaigator.sendBeacon.bind(navigator)
            sendBeacon: (endpoint, body) => {
                return navigator.sendBeacon(endpoint, body)
            },
            fetch,
            ...(browserPageLifecycle === undefined
                ? {}
                : {
                    pageLifecycle:
                        browserPageLifecycle,
                }),
            // 内部模块不想直接依赖浏览器的 PerformanceObserver，公开入口负责把真实浏览器API转换成内部需要的形状
            createObserver: (callback) => {
                return new PerformanceObserver(
                    (entryList) => {
                        callback(entryList)
                    }
                )
            }
        }
    )
}

export function createPaintMonitorWithDependencies(
    config: PaintMonitorConfig,
    dependencies: PaintMonitorDependencies
): PaintMonitor {
    // 页面监听器当前是否已经安装
    let visibilityListenerInstalled = false
    // 整个 Monitor 是否已经永久销毁
    let destroyed = false

    const ids = createMonitorIds({
        randomUUID: dependencies.randomUUID,

        // 这里使用条件展开，是因为开启了 exactOptionalPropertyTypes
        // 可选属性不存在时应完全不传，而不是显示传 sessionStorage: undefined
        ...(dependencies.sessionStorage === undefined
            ? {}
            : {
                sessionStorage: dependencies.sessionStorage
            }
        )
    })

    const reporter = createReporter({
        endpoint: config.endpoint,

        ...(dependencies.sendBeacon === undefined
            ? {}
            : {
                sendBeacon: dependencies.sendBeacon,
            }),
    
        ...(dependencies.fetch === undefined
            ? {}
            : {
                fetch: dependencies.fetch,
            }),
    
        ...(config.debug === undefined
            ? {}
            : {
                debug: config.debug,
            }),
    })

    const collector = createPaintCollector({
        timeOrigin: dependencies.timeOrigin,

        ...(dependencies.createObserver === undefined
            ? {}
            : {
                createObserver:
                    dependencies.createObserver,
            }),

        onSample: (sample) => {
            const event = createPaintEvent(
                sample,
                {
                    eventId: ids.createEventId(),
                    appId: config.appId,
                    appVersion: config.appVersion,
                    environment: config.environment,
                    sessionId: ids.getSessionId(),
                    viewId: ids.getViewId(),
                },
            )

            reporter.enqueue(event)
        },
        onEntriesComplete: () => {
            void reporter.flush()
        }
    })

    const handleVisibilityChange = (): void => {
        if (
            dependencies.pageLifecycle?.visibilityState === 'hidden'
        ) {
            // 启动 flush，但当前函数不等待它完成，也不使用它返回的 Promise
            // js 的 void 会先执行后面的表达式，然后把整个表达式的结果变成 undefined
            // 显式使用 void 也可以告诉检查工具这是有意行为
            void reporter.flush()
        }
    }

    const start = (): void => {
        if (destroyed) return

        collector.start()

        if (visibilityListenerInstalled || dependencies.pageLifecycle === undefined) {
            return
        }

        dependencies.pageLifecycle.addEventListener(
            'visibilitychange',
            handleVisibilityChange,
        )

        visibilityListenerInstalled = true
    }

    const destroy = (): void => {
        if (destroyed) return

        destroyed = true

        collector.destroy()

        if (visibilityListenerInstalled && dependencies.pageLifecycle !== undefined) {
            visibilityListenerInstalled = false
            
            try {
                dependencies.pageLifecycle.removeEventListener(
                    'visibilitychange',
                    handleVisibilityChange
                )
            } catch {
                // 移除监听时报错不影响业务页面
            }
        }
    }

    return {
        start,
        flush: () => {
            return reporter.flush()
        },
        destroy,
    }
}