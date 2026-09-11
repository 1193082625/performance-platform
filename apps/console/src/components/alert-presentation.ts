import {
    rateWebVital,
    type WebVitalAlertEvent,
} from '@performance-platform/protocol'

export function alertMetricName(event: WebVitalAlertEvent): 'LCP' | 'CLS' | 'INP' {
    return event.metric.type.slice(-3).toUpperCase() as 'LCP' | 'CLS' | 'INP'
}

export function alertSeverity(event: WebVitalAlertEvent): 'NEEDS_IMPROVEMENT' | 'POOR' {
    return rateWebVital(event.metric.type, event.metric.value) === 'poor'
        ? 'POOR'
        : 'NEEDS_IMPROVEMENT'
}

export function formatAlertValue(event: WebVitalAlertEvent): string {
    return event.metric.unit === 'score'
        ? event.metric.value.toFixed(3)
        : `${Math.round(event.metric.value).toLocaleString()} ms`
}

export function formatAlertThreshold(event: WebVitalAlertEvent): string {
    return event.metric.unit === 'score'
        ? event.metric.threshold.toFixed(3)
        : `${Math.round(event.metric.threshold).toLocaleString()} ms`
}

export function alertFindingMessageKey(ruleId: string): string {
    return {
        'lcp.slow-server-response': 'alerts.findingLcpSlowServerResponse',
        'lcp.late-resource-discovery': 'alerts.findingLcpLateResourceDiscovery',
        'lcp.slow-resource-load': 'alerts.findingLcpSlowResourceLoad',
        'lcp.slow-element-render': 'alerts.findingLcpSlowElementRender',
        'cls.early-load-shift': 'alerts.findingClsEarlyLoadShift',
        'cls.late-layout-shift': 'alerts.findingClsLateLayoutShift',
        'cls.repeated-shift-target': 'alerts.findingClsRepeatedShiftTarget',
        'inp.high-input-delay': 'alerts.findingInpHighInputDelay',
        'inp.slow-event-handler': 'alerts.findingInpSlowEventHandler',
        'inp.high-presentation-delay': 'alerts.findingInpHighPresentationDelay',
        'inp.repeated-interaction-target': 'alerts.findingInpRepeatedTarget',
    }[ruleId] ?? 'alerts.noDiagnosis'
}
