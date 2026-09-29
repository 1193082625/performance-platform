/**
 * 负责 HTTP：request、reply、status
 */
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify'
import { createApiErrorResponse } from './http/api-error.js'

import { registerEventRoutes } from './routes/events.js'
import { createPaintMetricsService } from './services/paint-metrics-service.js'
import { registerMetricsRoutes } from './routes/metrics.js'
import { registerHealthRoutes } from './routes/health.js'
import cors from '@fastify/cors'
import type {
    EventRepository,
    MetricQueryRepository,
    MemoryHealthRepository,
    LcpDiagnosticRepository,
    ClsDiagnosticRepository,
    InpDiagnosticRepository,
} from './repositories/event-repository.js'

import { createMetricQueryService } from './services/metric-query-service.js'

import { registerMetricQueryRoutes } from './routes/metric-query.js'
import { createMemoryHealthService } from './services/memory-health-service.js'
import { registerMemoryHealthRoutes } from './routes/memory-health.js'

import { createLcpDiagnosticService } from './services/lcp-diagnostic-service.js'

import { registerLcpDiagnosticRoutes } from './routes/lcp-diagnostic.js'
import { createClsDiagnosticService } from './services/cls-diagnostic-service.js'
import { registerClsDiagnosticRoutes } from './routes/cls-diagnostic.js'
import { createInpDiagnosticService } from './services/inp-diagnostic-service.js'
import { registerInpDiagnosticRoutes } from './routes/inp-diagnostic.js'
import { createAlertEvaluationService } from './services/alert-evaluation-service.js'
import { registerAlertEvaluationRoutes } from './routes/alert-evaluation.js'
import { createProjectMetricEventIngestionService } from './services/project-metric-event-ingestion-service.js'
import type { UserRepository } from './repositories/user-repository.js'
import { createRegisterService } from './services/register-service.js'
import { registerRegistrationRoutes } from './routes/register.js'

import cookie from '@fastify/cookie'
import type { SessionRepository } from './repositories/session-repository.js'
import { createLoginService } from './services/login-service.js'
import { registerLoginRoutes } from './routes/login.js'
import { createSessionAuthenticationService } from './services/session-authentication-service.js'
import { createCurrentUserService } from './services/current-user-service.js'
import { registerCurrentUserRoutes } from './routes/current-user.js'
import { createLogoutService } from './services/logout-service.js'
import { registerLogoutRoutes } from './routes/logout.js'
import type { ProjectAppRepository } from './repositories/project-app-repository.js'
import type { ProjectAppKeyRepository } from './repositories/project-app-key-repository.js'
import { createProjectAppKeyAuthenticationService } from './services/project-app-key-authentication-service.js'
import type { ProjectRepository } from './repositories/project-repository.js'
import { createProjectService } from './services/project-service.js'
import { registerProjectRoutes } from './routes/projects.js'
import { createProjectAppService } from './services/project-app-service.js'
import { registerProjectAppRoutes } from './routes/project-apps.js'
import { createProjectAppKeyService } from './services/project-app-key-service.js'
import { registerProjectAppKeyRoutes } from './routes/project-app-keys.js'
import { createDashboardQueryService } from './services/dashboard-query-service.js'
import { registerDashboardQueryRoutes } from './routes/dashboard-query.js'

interface BuildAppOptions {
    eventRepository: EventRepository
    metricQueryRepository: MetricQueryRepository
    memoryHealthRepository?: MemoryHealthRepository
    lcpDiagnosticRepository?: LcpDiagnosticRepository
    clsDiagnosticRepository?: ClsDiagnosticRepository
    inpDiagnosticRepository?: InpDiagnosticRepository
    appId: string
    now: () => number
    corsOrigins?: string[]
    logLevel?: string
    projectRepository?: ProjectRepository
    projectAppRepository?: ProjectAppRepository
    projectAppKeyRepository?: ProjectAppKeyRepository
    userRepository?: UserRepository
    sessionRepository?: SessionRepository
    cookieSecure?: boolean
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
    const app = Fastify({
        bodyLimit: 32 * 1024,
        logger: options.logLevel
            ? {
                  level: options.logLevel,
              }
            : false,
    })

    // <FastifyError> 是在告诉 ts ，这个错误处理器处理的是 Fastify 框架错误
    app.setErrorHandler<FastifyError>((error, request, reply) => {
        switch (error.code) {
            case 'FST_ERR_CTP_BODY_TOO_LARGE':
                return reply
                    .status(413)
                    .send(
                        createApiErrorResponse(
                            'PAYLOAD_TOO_LARGE',
                            'request body must not exceed 32 KiB',
                            request.id,
                        ),
                    )
            case 'FST_ERR_CTP_INVALID_JSON_BODY':
                return reply
                    .status(400)
                    .send(
                        createApiErrorResponse(
                            'INVALID_JSON',
                            'request body must contain valid JSON',
                            request.id,
                        ),
                    )
            case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
                return reply
                    .status(415)
                    .send(
                        createApiErrorResponse(
                            'UNSUPPORTED_MEDIA_TYPE',
                            'content-type must be application/json',
                            request.id,
                        ),
                    )
            default:
                return reply.send(error)
        }
    })

    const projectAppKeyAuthenticationService =
        options.projectAppKeyRepository === undefined
            ? undefined
            : createProjectAppKeyAuthenticationService(
                  options.projectAppKeyRepository,
              )

    const projectMetricIngestionService =
        options.projectAppRepository === undefined
            ? undefined
            : createProjectMetricEventIngestionService({
                  repository: options.eventRepository,
                  projectAppRepository: options.projectAppRepository,
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

    app.register(cookie)
    app.register(registerHealthRoutes)

    app.register(cors, {
        origin: options.corsOrigins || [],
    })

    app.register(registerEventRoutes, {
        ...(projectAppKeyAuthenticationService === undefined ||
        projectMetricIngestionService === undefined
            ? {}
            : {
                  projectAppKeyAuthenticationService,
                  projectMetricIngestionService,
              }),
    })

    app.register(registerMetricsRoutes, {
        metricsService,
    })

    app.register(registerMetricQueryRoutes, {
        metricQueryService,
    })

    if (options.lcpDiagnosticRepository !== undefined) {
        const lcpDiagnosticService = createLcpDiagnosticService({
            repository: options.lcpDiagnosticRepository,
            appId: options.appId,
            now: options.now,
        })

        app.register(registerLcpDiagnosticRoutes, {
            lcpDiagnosticService,
        })
    }

    if (options.clsDiagnosticRepository !== undefined) {
        const clsDiagnosticService = createClsDiagnosticService({
            repository: options.clsDiagnosticRepository,
            appId: options.appId,
            now: options.now,
        })

        app.register(registerClsDiagnosticRoutes, {
            clsDiagnosticService,
        })
    }

    if (options.inpDiagnosticRepository !== undefined) {
        const inpDiagnosticService = createInpDiagnosticService({
            repository: options.inpDiagnosticRepository,
            appId: options.appId,
            now: options.now,
        })

        app.register(registerInpDiagnosticRoutes, {
            inpDiagnosticService,
        })
    }

    if (
        options.lcpDiagnosticRepository !== undefined &&
        options.clsDiagnosticRepository !== undefined &&
        options.inpDiagnosticRepository !== undefined
    ) {
        const alertEvaluationService = createAlertEvaluationService({
            metricRepository: options.metricQueryRepository,
            lcpDiagnosticRepository: options.lcpDiagnosticRepository,
            clsDiagnosticRepository: options.clsDiagnosticRepository,
            inpDiagnosticRepository: options.inpDiagnosticRepository,
            appId: options.appId,
            now: options.now,
        })
        app.register(registerAlertEvaluationRoutes, { alertEvaluationService })
    }

    if (options.memoryHealthRepository !== undefined) {
        const memoryHealthService = createMemoryHealthService({
            repository: options.memoryHealthRepository,
            appId: options.appId,
            now: options.now,
        })

        app.register(registerMemoryHealthRoutes, {
            memoryHealthService,
        })
    }

    if (options.userRepository !== undefined) {
        const registerService = createRegisterService(options.userRepository)
        app.register(registerRegistrationRoutes, {
            registerService,
        })
    }

    if (
        options.userRepository !== undefined &&
        options.sessionRepository !== undefined &&
        options.cookieSecure !== undefined
    ) {
        const currentTime = () => new Date(options.now())

        const loginService = createLoginService(
            options.userRepository,
            options.sessionRepository,
            currentTime,
        )

        app.register(registerLoginRoutes, {
            loginService,
            cookieSecure: options.cookieSecure,
        })

        const sessionAuthenticationService = createSessionAuthenticationService(
            options.sessionRepository,
            currentTime,
        )

        const currentUserService = createCurrentUserService(
            sessionAuthenticationService,
            options.userRepository,
        )

        app.register(registerCurrentUserRoutes, {
            currentUserService,
        })

        if (options.projectRepository !== undefined) {
            const projectService = createProjectService(
                sessionAuthenticationService,
                options.projectRepository,
            )

            app.register(registerProjectRoutes, {
                projectService,
            })

            if (options.projectAppRepository !== undefined) {
                const projectAppService = createProjectAppService(
                    sessionAuthenticationService,
                    options.projectRepository,
                    options.projectAppRepository,
                )

                app.register(registerProjectAppRoutes, {
                    projectAppService,
                })

                if (options.memoryHealthRepository !== undefined) {
                    const dashboardQueryService = createDashboardQueryService({
                        sessions: sessionAuthenticationService,
                        projects: options.projectRepository,
                        apps: options.projectAppRepository,
                        metricRepository: options.metricQueryRepository,
                        memoryHealthRepository: options.memoryHealthRepository,
                        now: options.now,
                    })

                    app.register(registerDashboardQueryRoutes, {
                        dashboardQueryService,
                    })
                }

                if (options.projectAppKeyRepository !== undefined) {
                    const projectAppKeyService = createProjectAppKeyService(
                        sessionAuthenticationService,
                        options.projectRepository,
                        options.projectAppRepository,
                        options.projectAppKeyRepository,
                    )

                    app.register(registerProjectAppKeyRoutes, {
                        projectAppKeyService,
                    })
                }
            }
        }

        const logoutService = createLogoutService(
            options.sessionRepository,
            currentTime,
        )

        app.register(registerLogoutRoutes, {
            logoutService,
            cookieSecure: options.cookieSecure,
        })
    }

    return app
}
