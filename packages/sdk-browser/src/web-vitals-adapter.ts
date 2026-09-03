import { onLCP } from 'web-vitals/onLCP.js'
import { onCLS } from 'web-vitals/onCLS.js'
import { onINP } from 'web-vitals/onINP.js'

import type {
    ObserveLcp,
} from './types/lcpCollector.type'
import type {
    ObserveCls,
} from './types/clsCollector.type.js'
import type {
    ObserveInp,
} from './types/inpCollector.type.js'

export const observeLcpWithWebVitals: ObserveLcp = (
    callback,
): void => {
    onLCP((metric) => {
        callback({
            value: metric.value,
        })
    })
}

export const observeClsWithWebVitals: ObserveCls = (
    callback,
): void => {
    onCLS((metric) => {
        callback({
            value: metric.value,
            lastEntryStartTime:
                metric.entries.at(-1)?.startTime ?? 0,
        })
    })
}

export const observeInpWithWebVitals: ObserveInp = (
    callback,
): void => {
    onINP((metric) => {
        callback({
            value: metric.value,
            interactionStartTime:
                metric.entries[0]?.startTime ?? 0,
        })
    })
}
