import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { createDatabasePool } from '../db/pool.js'
import { createPostgresProjectAppKeyRepository } from './postgres-project-app-key-repository.js'

const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

describe('PostgresProjectAppKeyRepository', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)
    const repository = createPostgresProjectAppKeyRepository(pool)

    afterAll(async () => {
        await pool.end()
    })

    it('finds an active app key and ignores a revoked key', async () => {
        const suffix = randomUUID()
        const activeHash = `active-hash-${suffix}`
        const revokedHash = `revoked-hash-${suffix}`
        const createdHash = `created-hash-${suffix}`
        let userId: string | undefined
        let projectId: string | undefined
        let projectAppId: string | undefined

        try {
            const userResult = await pool.query<{ id: string }>(
                `
                INSERT INTO users (name, phone, password_hash)
                VALUES ($1, $2, $3)
                RETURNING id
                `,
                ['app-key-owner', `app-key-${suffix}`, 'unused-hash'],
            )
            const user = userResult.rows[0]
            if (user === undefined) {
                throw new Error('Failed to create test user')
            }
            userId = user.id

            const projectResult = await pool.query<{ id: string }>(
                `
                INSERT INTO projects (name, owner_id)
                VALUES ($1, $2)
                RETURNING id
                `,
                ['应用密钥测试项目', user.id],
            )
            const project = projectResult.rows[0]
            if (project === undefined) {
                throw new Error('Failed to create test project')
            }
            projectId = project.id

            const appResult = await pool.query<{ id: string }>(
                `
                INSERT INTO project_apps (project_id, app_id, name, platform)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                `,
                [project.id, `test-web-${suffix}`, '测试 Web 应用', 'web'],
            )
            const projectApp = appResult.rows[0]
            if (projectApp === undefined) {
                throw new Error('Failed to create test project app')
            }
            projectAppId = projectApp.id

            await pool.query(
                `
                INSERT INTO project_app_keys (
                    project_app_id,
                    key_hash,
                    key_prefix,
                    revoked_at
                )
                VALUES
                    ($1, $2, $3, NULL),
                    ($1, $4, $5, now())
                `,
                [
                    projectApp.id,
                    activeHash,
                    'ppk_active',
                    revokedHash,
                    'ppk_revoked',
                ],
            )

            const createdKey = await repository.createProjectAppKey({
                projectAppId: projectApp.id,
                keyHash: createdHash,
                keyPrefix: 'ppk_created',
            })

            expect(createdKey).toEqual({
                id: expect.any(String),
                prefix: 'ppk_created',
                createdAt: expect.any(Date),
                revokedAt: null,
            })

            await expect(
                repository.listProjectAppKeys(projectApp.id),
            ).resolves.toEqual(
                expect.arrayContaining([
                    {
                        id: createdKey.id,
                        prefix: 'ppk_created',
                        createdAt: expect.any(Date),
                        revokedAt: null,
                    },
                ]),
            )

            await expect(
                repository.findActiveProjectAppByKeyHash(activeHash),
            ).resolves.toEqual({
                projectId: project.id,
                appId: `test-web-${suffix}`,
            })

            await expect(
                repository.findActiveProjectAppByKeyHash(revokedHash),
            ).resolves.toBeUndefined()

            await repository.revokeProjectAppKey(
                createdKey.id,
                projectApp.id,
                new Date('2030-01-01T00:00:00.000Z'),
            )

            await expect(
                repository.findActiveProjectAppByKeyHash(createdHash),
            ).resolves.toBeUndefined()
        } finally {
            if (projectAppId !== undefined) {
                await pool.query(
                    `DELETE FROM project_app_keys WHERE project_app_id = $1`,
                    [projectAppId],
                )
                await pool.query(`DELETE FROM project_apps WHERE id = $1`, [
                    projectAppId,
                ])
            }
            if (projectId !== undefined) {
                await pool.query(`DELETE FROM projects WHERE id = $1`, [
                    projectId,
                ])
            }
            if (userId !== undefined) {
                await pool.query(`DELETE FROM users WHERE id = $1`, [userId])
            }
        }
    })
})
