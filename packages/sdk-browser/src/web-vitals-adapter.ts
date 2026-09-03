import { onLCP } from 'web-vitals/onLCP.js'
import { onCLS } from 'web-vitals/onCLS.js'

import type {
    ObserveLcp,
} from './types/lcpCollector.type'
import type {
    ObserveCls,
} from './types/clsCollector.type.js'

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
