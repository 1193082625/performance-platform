/**
 * 负责 HTTP：request、reply、status
 */
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify'
import { createEventIngestionService } from './services/event-ingestion-service.js'
import { createApiErrorResponse } from './http/api-error.js'

import { registerEventRoutes } from './routes/events.js'
import { createPaintMetricsService } from './services/paint-metrics-service.js'
import { registerMetricsRoutes } from './routes/metrics.js'
import { registerHealthRoutes } from './routes/health.js'
import cors from '@fastify/cors'
import {
    createMetricEventIngestionService,
} from './services/metric-event-ingestion-service.js'
import type {
    EventRepository,
    MetricQueryRepository,
} from './repositories/event-repository.js'

import {
    createMetricQueryService,
} from './services/metric-query-service.js'

import {
    registerMetricQueryRoutes,
} from './routes/metric-query.js'

interface BuildAppOptions {
    eventRepository: EventRepository
    metricQueryRepository: MetricQueryRepository
    appId: string
    now: () => number
    corsOrigins?: string[]
    logLevel?: string
}

export function buildApp(
    options: BuildAppOptions,
): FastifyInstance {
    const app = Fastify({
        bodyLimit: 32 * 1024,
        logger: options.logLevel ? {
            level: options.logLevel
        } : false
    })

    // <FastifyError> 是在告诉 ts ，这个错误处理器处理的是 Fastify 框架错误
    app.setErrorHandler<FastifyError>(
        (error, request, reply) => {
            switch(error.code) {
                case 'FST_ERR_CTP_BODY_TOO_LARGE':
                    return reply.status(413).send(
                        createApiErrorResponse(
                            'PAYLOAD_TOO_LARGE',
                            'request body must not exceed 32 KiB',
                            request.id,
                        )
                    )
                case 'FST_ERR_CTP_INVALID_JSON_BODY':
                    return reply.status(400).send(
                        createApiErrorResponse(
                            'INVALID_JSON',
                            'request body must contain valid JSON',
                            request.id,
                        )
                    )
                case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
                    return reply.status(415).send(
                        createApiErrorResponse(
                            'UNSUPPORTED_MEDIA_TYPE',
                            'content-type must be application/json',
                            request.id,
                        )
                    )
                default:
                    return reply.send(error)
            }
        }
    )

    const ingestionService = createEventIngestionService({
        repository: options.eventRepository,
        appId: options.appId,
        now: options.now,
    })

    const metricIngestionService = createMetricEventIngestionService({
        repository: options.eventRepository,
        appId: options.appId,
        now: options.now,
    })

    const metricsService = createPaintMetricsService({
        repository: options.eventRepository,
        appId: options.appId,
        now: options.now,
    })

    const metricQueryService = createMetricQueryService({
        repository: options.metricQueryRepository,
        appId: options.appId,
        now: options.now,
    })

    app.register(registerHealthRoutes)

    app.register(
        cors,
        {
            origin: options.corsOrigins || [],
        }
    )

    app.register(
        registerEventRoutes,
        {
            ingestionService,
            metricIngestionService,
        }
    )

    app.register(
        registerMetricsRoutes,
        {
            metricsService,
        },
    )

    app.register(
        registerMetricQueryRoutes,
        {
            metricQueryService,
        }
    )

    return app
}