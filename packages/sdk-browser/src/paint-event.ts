/**
 * 职责： 将 PaintSample 和本次事件的上下文信息组合成 PaintEventV1
 * 
 * 为了保持函数纯粹，不让它自己生成ID，而是由调用者把具体 ID 传进来
 */

import type { MetricEventV2 } from "@performance-platform/protocol";
import type { PaintSample } from "./types/paintCollector.type";
import type { PaintEventContext } from "./types/paintMonitor.type";

export function createPaintEvent(
    sample: PaintSample,
    context: PaintEventContext
): MetricEventV2 {

    return {
        schemaVersion: '2.0',
        eventId: context.eventId,
        type: sample.type,
        timestamp: sample.occurredAt,
    
        sampleRate: context.sampleRate,
        metricVersion: 'paint-v1',

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
            },
        },
    
        session: {
            sessionId: context.sessionId,
            viewId: context.viewId,
        },
    
        payload: {
            value: sample.valueMs,
            unit: 'ms',
        },
    }
}