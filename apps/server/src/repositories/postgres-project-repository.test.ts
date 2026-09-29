import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { createDatabasePool } from '../db/pool.js'
import { createPostgresProjectRepository } from './postgres-project-repository.js'

const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

describe('PostgresProjectRepository', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)
    const repository = createPostgresProjectRepository(pool)

    afterAll(async () => {
        await pool.end()
    })

    it('only returns a project to its owner', async () => {
        const suffix = randomUUID()
        const ownerPhone = `owner-${suffix}`
        const otherPhone = `other-${suffix}`
        let projectId: string | undefined

        try {
            const users = await pool.query<{ id: string; phone: string }>(
                `
                INSERT INTO users (name, phone, password_hash)
                VALUES
                    ($1, $2, $3),
                    ($4, $5, $6)
                RETURNING id, phone
                `,
                [
                    'project-owner',
                    ownerPhone,
                    'unused-test-password-hash',
                    'other-user',
                    otherPhone,
                    'unused-test-password-hash',
                ],
            )

            const owner = users.rows.find((user) => user.phone === ownerPhone)
            const otherUser = users.rows.find(
                (user) => user.phone === otherPhone,
            )

            if (owner === undefined || otherUser === undefined) {
                throw new Error('Failed to create test users')
            }

            const insertedProject = await pool.query<{
                id: string
                name: string
                description: string
            }>(
                `
                INSERT INTO projects (name, description, owner_id)
                VALUES ($1, $2, $3)
                RETURNING id, name, description
                `,
                ['穿搭业务', '多端性能监控项目', owner.id],
            )

            const project = insertedProject.rows[0]
            if (project === undefined) {
                throw new Error('Failed to create test project')
            }

            projectId = project.id

            await expect(
                repository.findProjectOwnedByUser(project.id, owner.id),
            ).resolves.toEqual(project)

            await expect(
                repository.findProjectOwnedByUser(project.id, otherUser.id),
            ).resolves.toBeUndefined()

            await expect(
                repository.findProjectOwnedByUser('999999999', owner.id),
            ).resolves.toBeUndefined()
        } finally {
            if (projectId !== undefined) {
                await pool.query('DELETE FROM projects WHERE id = $1', [
                    projectId,
                ])
            }

            await pool.query('DELETE FROM users WHERE phone IN ($1, $2)', [
                ownerPhone,
                otherPhone,
            ])
        }
    })
    it('creates projects and lists only the owner projects', async () => {
        const suffix = randomUUID()
        const ownerPhone = `project-list-owner-${suffix}`
        const otherPhone = `project-list-other-${suffix}`
        let ownerId: string | undefined
        let otherUserId: string | undefined

        try {
            const users = await pool.query<{ id: string; phone: string }>(
                `
                INSERT INTO users (name, phone, password_hash)
                VALUES
                    ($1, $2, $3),
                    ($4, $5, $6)
                RETURNING id, phone
                `,
                [
                    'project-list-owner',
                    ownerPhone,
                    'unused-test-password-hash',
                    'project-list-other',
                    otherPhone,
                    'unused-test-password-hash',
                ],
            )

            const owner = users.rows.find((user) => user.phone === ownerPhone)
            const otherUser = users.rows.find(
                (user) => user.phone === otherPhone,
            )

            if (owner === undefined || otherUser === undefined) {
                throw new Error('Failed to create test users')
            }

            ownerId = owner.id
            otherUserId = otherUser.id

            const olderProject = await repository.createProject(owner.id, {
                name: '第一个项目',
                description: '较早创建',
            })
            const newerProject = await repository.createProject(owner.id, {
                name: '第二个项目',
                description: '较晚创建',
            })

            // 故意让创建时间与 ID 顺序相反，验证优先按创建时间排序。
            await pool.query(
                `
                UPDATE projects
                SET created_at = CASE
                    WHEN id = $1 THEN TIMESTAMPTZ '2026-01-02 00:00:00+00'
                    WHEN id = $2 THEN TIMESTAMPTZ '2026-01-01 00:00:00+00'
                    ELSE created_at
                END
                WHERE id IN ($1, $2)
                `,
                [olderProject.id, newerProject.id],
            )

            await expect(
                repository.listProjectsOwnedByUser(owner.id),
            ).resolves.toEqual([olderProject, newerProject])

            await expect(
                repository.listProjectsOwnedByUser(otherUser.id),
            ).resolves.toEqual([])
        } finally {
            if (ownerId !== undefined || otherUserId !== undefined) {
                await pool.query(
                    `
                    DELETE FROM projects
                    WHERE owner_id IN ($1, $2)
                    `,
                    [ownerId, otherUserId],
                )
            }

            await pool.query(`DELETE FROM users WHERE phone IN ($1, $2)`, [
                ownerPhone,
                otherPhone,
            ])
        }
    })
})
