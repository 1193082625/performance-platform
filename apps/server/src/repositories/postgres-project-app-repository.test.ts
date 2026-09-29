import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { createDatabasePool } from '../db/pool.js'
import { createPostgresProjectAppRepository } from './postgres-project-app-repository.js'

const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

describe('PostgresProjectAppRepository', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)
    const repository = createPostgresProjectAppRepository(pool)

    afterAll(async () => {
        await pool.end()
    })

    it('isolates apps by project and lists one project apps', async () => {
        const suffix = randomUUID()
        const phone = `project-app-${suffix}`
        let userId: string | undefined
        let firstProjectId: string | undefined
        let secondProjectId: string | undefined

        try {
            const insertedUser = await pool.query<{ id: string }>(
                `
                INSERT INTO users (name, phone, password_hash)
                VALUES ($1, $2, $3)
                RETURNING id
                `,
                ['project-app-owner', phone, 'unused-test-password-hash'],
            )

            const user = insertedUser.rows[0]
            if (user === undefined) {
                throw new Error('Failed to create test user')
            }

            userId = user.id

            const insertedProjects = await pool.query<{
                id: string
                name: string
            }>(
                `
                INSERT INTO projects (name, owner_id)
                VALUES
                    ($1, $3),
                    ($2, $3)
                RETURNING id, name
                `,
                ['穿搭业务', '另一业务', user.id],
            )

            const firstProject = insertedProjects.rows.find(
                (project) => project.name === '穿搭业务',
            )
            const secondProject = insertedProjects.rows.find(
                (project) => project.name === '另一业务',
            )

            if (firstProject === undefined || secondProject === undefined) {
                throw new Error('Failed to create test projects')
            }

            firstProjectId = firstProject.id
            secondProjectId = secondProject.id

            const createdApp = await repository.createProjectApp({
                projectId: firstProject.id,
                appId: 'app_generated_web',
                name: '系统生成的 Web 应用',
                platform: 'web',
            })

            expect(createdApp).toEqual({
                id: expect.any(String),
                projectId: firstProject.id,
                appId: 'app_generated_web',
                name: '系统生成的 Web 应用',
                platform: 'web',
            })

            const insertedApps = await pool.query<{
                id: string
                project_id: string
                app_id: string
                name: string
                platform:
                    | 'web'
                    | 'ios'
                    | 'android'
                    | 'mini_program_zfb'
                    | 'mini_program_wx'
            }>(
                `
                INSERT INTO project_apps (
                    project_id,
                    app_id,
                    name,
                    platform
                )
                VALUES
                    ($1, $3, $4, $5),
                    ($1, $6, $7, $8),
                    ($2, $3, $9, $5)
                RETURNING id, project_id, app_id, name, platform
                `,
                [
                    firstProject.id,
                    secondProject.id,
                    'outfit-web',
                    '穿搭 Web 端',
                    'web',
                    'outfit-mini-wx',
                    '穿搭微信小程序',
                    'mini_program_wx',
                    '另一业务 Web 端',
                ],
            )

            const firstProjectWebApp = insertedApps.rows.find(
                (app) =>
                    app.project_id === firstProject.id &&
                    app.app_id === 'outfit-web',
            )

            const secondProjectWebApp = insertedApps.rows.find(
                (app) =>
                    app.project_id === secondProject.id &&
                    app.app_id === 'outfit-web',
            )

            if (
                firstProjectWebApp === undefined ||
                secondProjectWebApp === undefined
            ) {
                throw new Error('Failed to create test project apps')
            }

            await expect(
                repository.findProjectApp(firstProject.id, 'outfit-web'),
            ).resolves.toEqual({
                id: firstProjectWebApp.id,
                projectId: firstProject.id,
                appId: 'outfit-web',
                name: '穿搭 Web 端',
                platform: 'web',
            })

            await expect(
                repository.findProjectApp(secondProject.id, 'outfit-web'),
            ).resolves.toEqual({
                id: secondProjectWebApp.id,
                projectId: secondProject.id,
                appId: 'outfit-web',
                name: '另一业务 Web 端',
                platform: 'web',
            })

            await expect(
                repository.findProjectApp(firstProject.id, 'unknown-app'),
            ).resolves.toBeUndefined()

            await expect(
                repository.listProjectApps(firstProject.id),
            ).resolves.toEqual([
                createdApp,
                {
                    id: firstProjectWebApp.id,
                    projectId: firstProject.id,
                    appId: 'outfit-web',
                    name: '穿搭 Web 端',
                    platform: 'web',
                },
                {
                    id: expect.any(String),
                    projectId: firstProject.id,
                    appId: 'outfit-mini-wx',
                    name: '穿搭微信小程序',
                    platform: 'mini_program_wx',
                },
            ])

            await expect(
                repository.listProjectApps(secondProject.id),
            ).resolves.toEqual([
                {
                    id: secondProjectWebApp.id,
                    projectId: secondProject.id,
                    appId: 'outfit-web',
                    name: '另一业务 Web 端',
                    platform: 'web',
                },
            ])
        } finally {
            if (firstProjectId !== undefined && secondProjectId !== undefined) {
                await pool.query(
                    `
                    DELETE FROM project_apps
                    WHERE project_id IN ($1, $2)
                    `,
                    [firstProjectId, secondProjectId],
                )

                await pool.query(
                    `
                    DELETE FROM projects
                    WHERE id IN ($1, $2)
                    `,
                    [firstProjectId, secondProjectId],
                )
            }

            if (userId !== undefined) {
                await pool.query('DELETE FROM users WHERE id = $1', [userId])
            }
        }
    })
})
