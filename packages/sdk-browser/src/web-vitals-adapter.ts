import { onLCP } from 'web-vitals/onLCP.js'

import type {
    ObserveLcp,
} from './types/lcpCollector.type'

export const observeLcpWithWebVitals: ObserveLcp = (
    callback,
): void => {
    onLCP((metric) => {
        callback({
            value: metric.value,
        })
    })
}