
type MetricMeasurement =
    | {
        type:
          | 'web.paint.fp'
          | 'web.paint.fcp'
        metricVersion: 'paint-v1'
        payload: {
          value: number
          unit: 'ms'
        }
      }
    | {
        type: 'web.vital.lcp'
        metricVersion: 'lcp-v1'
        payload: {
            value: number
            unit: 'ms'
        }
    }
    | {
        type: 'web.vital.inp'
        metricVersion: 'inp-v1'
        payload: {
            value: number
            unit: 'ms'
        }
    }
    | {
        type: 'web.vital.cls'
        metricVersion: 'cls-v1'
        payload: {
          value: number
          unit: 'score'
        }
      }
    | {
        type:
          | 'web.memory.used_heap'
          | 'web.memory.total_heap'
          | 'web.memory.heap_limit'
        metricVersion: 'memory-v1'
        payload: {
          value: number
          unit: 'byte'
        }
    }

interface BaseMetricSample {
    occurredAt: number,
}

export type MetricSample = BaseMetricSample & MetricMeasurement