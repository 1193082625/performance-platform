import { expect, test, vi } from 'vitest'
import type { MetricEventV2 } from '@performance-platform/protocol'
import type { EventRepository } from '../repositories/event-repository.js'
import { createProjectMetricEventIngestionService } from './project-metric-event-ingestion-service.js'
import type { ProjectAppRepository } from '../repositories/project-app-repository.js'

const NOW = Date.UTC(2026, 8, 28, 8, 0, 0)

const EVENT: MetricEventV2 = {
    schemaVersion: '2.0',
    eventId: '40000000-0000-4000-8000-000000000001',
    type: 'web.vital.lcp',
    timestamp: NOW,
    sampleRate: 1,
    metricVersion: 'lcp-v1',
    application: {
        id: 'another-web-app',
        version: '1.0.0',
        environment: 'test',
    },
    runtime: {
        platform: 'web',
        sdk: {
            name: '@performance-platform/browser',
            version: '0.3.0',
        },
    },
    session: {
        sessionId: 'session-project-test',
        viewId: 'view-project-test',
    },
    payload: {
        value: 2300,
        unit: 'ms',
    },
}

function createTestService() {
    const insertBatch = vi.fn<EventRepository['insertBatch']>()

    const repository: EventRepository = {
        insertBatch,
        queryPaintMetrics: vi.fn(),
    }

    const findProjectApp = vi
        .fn<ProjectAppRepository['findProjectApp']>()
        .mockResolvedValue({
            id: '1',
            projectId: '42',
            appId: EVENT.application.id,
            name: '测试 Web 应用',
            platform: 'web',
        })

    return {
        service: createProjectMetricEventIngestionService({
            repository,
            projectAppRepository: {
                findProjectApp,
            },
            now: () => NOW,
        }),
        insertBatch,
        findProjectApp,
    }
}

test('将认证后的项目 ID 写入已接受的 V2 事件', async () => {
    const { service, insertBatch, findProjectApp } = createTestService()

    const result = await service.ingest(
        {
            events: [EVENT],
        },
        '42',
    )

    expect(result).toEqual({
        ok: true,
        value: {
            accepted: 1,
            discarded: 0,
            reasons: {},
        },
    })

    expect(insertBatch).toHaveBeenCalledWith([EVENT], {
        projectId: '42',
    })
    expect(findProjectApp).toHaveBeenCalledWith('42', EVENT.application.id)
})

test('非法批次不会访问存储层', async () => {
    const { service, insertBatch, findProjectApp } = createTestService()

    await expect(
        service.ingest(
            {
                events: [],
            },
            '42',
        ),
    ).resolves.toEqual({
        ok: false,
        code: 'INVALID_BATCH',
    })

    expect(insertBatch).not.toHaveBeenCalled()
    expect(findProjectApp).not.toHaveBeenCalled()
})
test('非法授权应用不会访问存储层', async () => {
    const { service, insertBatch, findProjectApp } = createTestService()

    await expect(
        service.ingest(
            {
                events: [EVENT],
            },
            '42',
            'another-app',
        ),
    ).resolves.toEqual({
        ok: false,
        code: 'APP_KEY_MISMATCH',
    })

    expect(insertBatch).not.toHaveBeenCalled()
    expect(findProjectApp).not.toHaveBeenCalled()
})
