import { expect, test, vi } from 'vitest'
import type { MetricQueryResponse } from '@performance-platform/protocol'
import type {
    MemoryHealthRepository,
    MetricQueryRepository,
    LcpDiagnosticRepository,
    ClsDiagnosticRepository,
    InpDiagnosticRepository,
    EventRepository,
} from '../repositories/event-repository.js'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'
import type { ProjectRepository } from '../repositories/project-repository.js'
import type { SessionAuthenticationService } from './session-authentication-service.js'
import { createDashboardQueryService } from './dashboard-query-service.js'

const TOKEN = 'session-token'
const USER_ID = '42'
const PROJECT_ID = '101'
const APP_ID = 'app_test'
const NOW = Date.parse('2030-01-02T00:00:00.000Z')

function setup() {
    const authenticate = vi
        .fn<SessionAuthenticationService['authenticate']>()
        .mockResolvedValue({ ok: true, userId: USER_ID })
    const findProjectOwnedByUser = vi
        .fn<ProjectRepository['findProjectOwnedByUser']>()
        .mockResolvedValue({
            id: PROJECT_ID,
            name: '测试项目',
            description: '',
        })
    const findProjectApp = vi
        .fn<ProjectAppRepository['findProjectApp']>()
        .mockResolvedValue({
            id: '201',
            projectId: PROJECT_ID,
            appId: APP_ID,
            name: '测试应用',
            platform: 'web',
        })
    const queryMetric = vi
        .fn<MetricQueryRepository['queryMetric']>()
        .mockResolvedValue({} as MetricQueryResponse)
    const queryLatestViewMemorySnapshots = vi
        .fn<MemoryHealthRepository['queryLatestViewMemorySnapshots']>()
        .mockResolvedValue([])
    const queryLcpDiagnostics = vi
        .fn<LcpDiagnosticRepository['queryLcpDiagnostics']>()
        .mockResolvedValue({} as never)
    const queryClsDiagnostics = vi
        .fn<ClsDiagnosticRepository['queryClsDiagnostics']>()
        .mockResolvedValue({} as never)
    const queryInpDiagnostics = vi
        .fn<InpDiagnosticRepository['queryInpDiagnostics']>()
        .mockResolvedValue({} as never)
    const queryPaintMetrics = vi
        .fn<EventRepository['queryPaintMetrics']>()
        .mockResolvedValue({} as never)

    const service = createDashboardQueryService({
        sessions: { authenticate },
        projects: { findProjectOwnedByUser },
        apps: { findProjectApp },
        eventRepository: { queryPaintMetrics, insertBatch: vi.fn() },
        metricRepository: { queryMetric },
        memoryHealthRepository: { queryLatestViewMemorySnapshots },
        lcpDiagnosticRepository: { queryLcpDiagnostics },
        clsDiagnosticRepository: { queryClsDiagnostics },
        inpDiagnosticRepository: { queryInpDiagnostics },
        now: () => NOW,
    })

    return {
        service,
        authenticate,
        findProjectOwnedByUser,
        findProjectApp,
        queryMetric,
    }
}

const metricInput = {
    type: 'web.paint.fcp',
    from: '2030-01-01T00:00:00.000Z',
    to: '2030-01-02T00:00:00.000Z',
}

test('passes the owned project and app scope to the metric repository', async () => {
    const { service, queryMetric } = setup()

    await expect(
        service.queryMetric(TOKEN, PROJECT_ID, APP_ID, metricInput),
    ).resolves.toEqual({ ok: true, value: {} })

    expect(queryMetric).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ projectId: PROJECT_ID, appId: APP_ID }),
    )
})

test('rejects an unauthenticated dashboard query before reading project data', async () => {
    const {
        service,
        authenticate,
        findProjectOwnedByUser,
        findProjectApp,
        queryMetric,
    } = setup()
    authenticate.mockResolvedValue({ ok: false })

    await expect(
        service.queryMetric(TOKEN, PROJECT_ID, APP_ID, metricInput),
    ).resolves.toEqual({ ok: false, reason: 'UNAUTHENTICATED' })

    expect(findProjectOwnedByUser).not.toHaveBeenCalled()
    expect(findProjectApp).not.toHaveBeenCalled()
    expect(queryMetric).not.toHaveBeenCalled()
})

test('rejects a project that is not owned by the current user', async () => {
    const { service, findProjectOwnedByUser, findProjectApp, queryMetric } =
        setup()
    findProjectOwnedByUser.mockResolvedValue(undefined)

    await expect(
        service.queryMetric(TOKEN, PROJECT_ID, APP_ID, metricInput),
    ).resolves.toEqual({ ok: false, reason: 'PROJECT_NOT_FOUND' })

    expect(findProjectApp).not.toHaveBeenCalled()
    expect(queryMetric).not.toHaveBeenCalled()
})

test('rejects an application outside the owned project', async () => {
    const { service, findProjectApp, queryMetric } = setup()
    findProjectApp.mockResolvedValue(undefined)

    await expect(
        service.queryMetric(TOKEN, PROJECT_ID, APP_ID, metricInput),
    ).resolves.toEqual({ ok: false, reason: 'PROJECT_APP_NOT_FOUND' })

    expect(queryMetric).not.toHaveBeenCalled()
})
