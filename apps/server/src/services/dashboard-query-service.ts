import type {
    MemoryHealthRepository,
    MetricQueryRepository,
    LcpDiagnosticRepository,
    ClsDiagnosticRepository,
    InpDiagnosticRepository,
} from '../repositories/event-repository.js'
import type { EventRepository } from '../repositories/event-repository.js'
import {
    createPaintMetricsService,
    type PaintMetricsService,
} from './paint-metrics-service.js'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'
import type { ProjectRepository } from '../repositories/project-repository.js'
import {
    createMemoryHealthService,
    type MemoryHealthQueryResult,
} from './memory-health-service.js'
import {
    createMetricQueryService,
    type MetricQueryResult,
} from './metric-query-service.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'
import {
    createLcpDiagnosticService,
    type LcpDiagnosticService,
} from './lcp-diagnostic-service.js'
import {
    createClsDiagnosticService,
    type ClsDiagnosticService,
} from './cls-diagnostic-service.js'
import {
    createInpDiagnosticService,
    type InpDiagnosticService,
} from './inp-diagnostic-service.js'
import {
    createAlertEvaluationService,
    type AlertEvaluationService,
} from './alert-evaluation-service.js'

export type DashboardAccessFailure = {
    ok: false
    reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'PROJECT_APP_NOT_FOUND'
}

type DashboardScopeResult = { ok: true } | DashboardAccessFailure

export type DashboardMetricQueryResult =
    DashboardAccessFailure | MetricQueryResult
export type DashboardPaintQueryResult =
    | DashboardAccessFailure
    | Awaited<ReturnType<PaintMetricsService['query']>>

export type DashboardMemoryHealthQueryResult =
    DashboardAccessFailure | MemoryHealthQueryResult

export type DashboardLcpDiagnosticResult =
    | DashboardAccessFailure
    | Awaited<ReturnType<LcpDiagnosticService['query']>>
export type DashboardClsDiagnosticResult =
    | DashboardAccessFailure
    | Awaited<ReturnType<ClsDiagnosticService['query']>>
export type DashboardInpDiagnosticResult =
    | DashboardAccessFailure
    | Awaited<ReturnType<InpDiagnosticService['query']>>
export type DashboardAlertEvaluationResult =
    | DashboardAccessFailure
    | Awaited<ReturnType<AlertEvaluationService['evaluate']>>

export interface DashboardQueryService {
    queryMetric(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardMetricQueryResult>
    queryPaint(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardPaintQueryResult>
    queryMemoryHealth(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardMemoryHealthQueryResult>
    queryLcpDiagnostic(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardLcpDiagnosticResult>
    queryClsDiagnostic(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardClsDiagnosticResult>
    queryInpDiagnostic(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardInpDiagnosticResult>
    evaluateAlerts(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardAlertEvaluationResult>
}

export function createDashboardQueryService(options: {
    sessions: SessionAuthenticationService
    projects: Pick<ProjectRepository, 'findProjectOwnedByUser'>
    apps: Pick<ProjectAppRepository, 'findProjectApp'>
    metricRepository: MetricQueryRepository
    eventRepository: EventRepository
    memoryHealthRepository: MemoryHealthRepository
    lcpDiagnosticRepository: LcpDiagnosticRepository
    clsDiagnosticRepository: ClsDiagnosticRepository
    inpDiagnosticRepository: InpDiagnosticRepository
    now(): number
}): DashboardQueryService {
    async function authorize(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
    ): Promise<DashboardScopeResult> {
        const authentication = await options.sessions.authenticate(sessionToken)

        if (!authentication.ok) {
            return { ok: false, reason: 'UNAUTHENTICATED' }
        }

        const project = await options.projects.findProjectOwnedByUser(
            projectId,
            authentication.userId,
        )

        if (project === undefined) {
            return { ok: false, reason: 'PROJECT_NOT_FOUND' }
        }

        const app = await options.apps.findProjectApp(projectId, appId)

        if (app === undefined) {
            return { ok: false, reason: 'PROJECT_APP_NOT_FOUND' }
        }

        return { ok: true }
    }

    return {
        async queryMetric(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)

            if (!access.ok) {
                return access
            }

            return createMetricQueryService({
                repository: options.metricRepository,
                projectId,
                appId,
                now: options.now,
            }).query(input)
        },
        async queryPaint(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)
            if (!access.ok) return access
            return createPaintMetricsService({
                repository: options.eventRepository,
                projectId,
                appId,
                now: options.now,
            }).query(input)
        },
        async queryMemoryHealth(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)

            if (!access.ok) {
                return access
            }

            return createMemoryHealthService({
                repository: options.memoryHealthRepository,
                projectId,
                appId,
                now: options.now,
            }).query(input)
        },
        async queryLcpDiagnostic(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)
            if (!access.ok) return access
            return createLcpDiagnosticService({
                repository: options.lcpDiagnosticRepository,
                projectId,
                appId,
                now: options.now,
            }).query(input)
        },
        async queryClsDiagnostic(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)
            if (!access.ok) return access
            return createClsDiagnosticService({
                repository: options.clsDiagnosticRepository,
                projectId,
                appId,
                now: options.now,
            }).query(input)
        },
        async queryInpDiagnostic(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)
            if (!access.ok) return access
            return createInpDiagnosticService({
                repository: options.inpDiagnosticRepository,
                projectId,
                appId,
                now: options.now,
            }).query(input)
        },
        async evaluateAlerts(sessionToken, projectId, appId, input) {
            const access = await authorize(sessionToken, projectId, appId)
            if (!access.ok) return access
            return createAlertEvaluationService({
                metricRepository: options.metricRepository,
                lcpDiagnosticRepository: options.lcpDiagnosticRepository,
                clsDiagnosticRepository: options.clsDiagnosticRepository,
                inpDiagnosticRepository: options.inpDiagnosticRepository,
                projectId,
                appId,
                now: options.now,
            }).evaluate(input)
        },
    }
}
