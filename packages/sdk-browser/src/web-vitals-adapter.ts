import { onLCP } from 'web-vitals/attribution/onLCP.js'
import { onCLS } from 'web-vitals/attribution/onCLS.js'
import { onINP } from 'web-vitals/onINP.js'

import type { ObserveLcp } from './types/lcpCollector.type'
import type { ObserveCls } from './types/clsCollector.type.js'
import type { ObserveInp } from './types/inpCollector.type.js'

export const observeLcpWithWebVitals: ObserveLcp = (callback): void => {
    onLCP((metric) => {
        const attribution = metric.attribution

        callback({
            value: metric.value,
            attribution: {
                timeToFirstByte: attribution.timeToFirstByte,
                resourceLoadDelay: attribution.resourceLoadDelay,
                resourceLoadDuration: attribution.resourceLoadDuration,
                elementRenderDelay: attribution.elementRenderDelay,
                ...(attribution.target === undefined
                    ? {}
                    : {
                          element: attribution.target,
                      }),
                ...(attribution.url === undefined
                    ? {}
                    : {
                          url: attribution.url,
                      }),
            },
        })
    })
}

export const observeClsWithWebVitals: ObserveCls = (callback): void => {
    onCLS((metric) => {
        const attribution = metric.attribution
        const source = attribution.largestShiftSource
        const hasAttribution =
            attribution.largestShiftTime !== undefined &&
            attribution.largestShiftValue !== undefined &&
            attribution.loadState !== undefined

        callback({
            value: metric.value,
            lastEntryStartTime: metric.entries.at(-1)?.startTime ?? 0,
            ...(hasAttribution
                ? {
                      attribution: {
                          largestShiftTime: attribution.largestShiftTime!,
                          largestShiftValue: attribution.largestShiftValue!,
                          loadState: attribution.loadState!,
                          ...(attribution.largestShiftTarget === undefined
                              ? {}
                              : {
                                    largestShiftTarget:
                                        attribution.largestShiftTarget,
                                }),
                          ...(source === undefined
                              ? {}
                              : {
                                    previousRect: {
                                        x: source.previousRect.x,
                                        y: source.previousRect.y,
                                        width: source.previousRect.width,
                                        height: source.previousRect.height,
                                    },
                                    currentRect: {
                                        x: source.currentRect.x,
                                        y: source.currentRect.y,
                                        width: source.currentRect.width,
                                        height: source.currentRect.height,
                                    },
                                }),
                      },
                  }
                : {}),
        })
    })
}

export const observeInpWithWebVitals: ObserveInp = (callback): void => {
    onINP((metric) => {
        callback({
            value: metric.value,
            interactionStartTime: metric.entries[0]?.startTime ?? 0,
        })
    })
}
