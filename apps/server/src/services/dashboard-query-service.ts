import type {
    MemoryHealthRepository,
    MetricQueryRepository,
} from '../repositories/event-repository.js'
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

export type DashboardAccessFailure = {
    ok: false
    reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'PROJECT_APP_NOT_FOUND'
}

type DashboardScopeResult = { ok: true } | DashboardAccessFailure

export type DashboardMetricQueryResult =
    DashboardAccessFailure | MetricQueryResult

export type DashboardMemoryHealthQueryResult =
    DashboardAccessFailure | MemoryHealthQueryResult

export interface DashboardQueryService {
    queryMetric(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardMetricQueryResult>
    queryMemoryHealth(
        sessionToken: string | undefined,
        projectId: string,
        appId: string,
        input: unknown,
    ): Promise<DashboardMemoryHealthQueryResult>
}

export function createDashboardQueryService(options: {
    sessions: SessionAuthenticationService
    projects: Pick<ProjectRepository, 'findProjectOwnedByUser'>
    apps: Pick<ProjectAppRepository, 'findProjectApp'>
    metricRepository: MetricQueryRepository
    memoryHealthRepository: MemoryHealthRepository
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
    }
}
