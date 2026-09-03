/**
 * 可以创建所有 V2 指标事件
 */
import type { MetricEventV2 } from "@performance-platform/protocol";
import type { MetricSample } from "./types/metricSample.type.js";
import type { MetricEventContext } from "./types/paintMonitor.type";

export function createMetricEvent(
    sample: MetricSample,
    context: MetricEventContext
): MetricEventV2 {
    const {
        occurredAt,
        ...measurement
    } = sample

    return {
        schemaVersion: '2.0',
        eventId: context.eventId,
        timestamp: occurredAt,
        sampleRate: context.sampleRate,

        application: {
            id: context.appId,
            version: context.appVersion,
            environment: context.environment,
        },

        runtime: {
            platform: 'web',
            sdk: {
                name: '@performance-platform/browser',
                version: '0.1.0',
            }
        },
        session: {
            sessionId: context.sessionId,
            viewId: context.viewId,
        },
        ...measurement,
    }
}