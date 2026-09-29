import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { createDatabasePool } from '../db/pool.js'
import { generateSessionToken } from '../security/session-token.js'
import { createPostgresSessionRepository } from './postgres-session-repository.js'

const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

describe('PostgresSessionRepository', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)
    const repository = createPostgresSessionRepository(pool)

    afterAll(async () => {
        await pool.end()
    })

    it('creates, reads and revokes a session', async () => {
        const result = await pool.query<{ id: string }>(
            `
            INSERT INTO users (name, phone, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [
                'session-repository-test',
                `test-${randomUUID()}`,
                'unused-test-password-hash',
            ],
        )

        const user = result.rows[0]
        if (user === undefined) {
            throw new Error('Failed to create test user')
        }

        try {
            const token = generateSessionToken()
            const expiresAt = new Date('2030-01-02T00:00:00.000Z')
            const revokedAt = new Date('2030-01-01T01:00:00.000Z')

            await expect(
                repository.findSessionByTokenHash(token.hash),
            ).resolves.toBeUndefined()

            await repository.createSession({
                userId: user.id,
                tokenHash: token.hash,
                expiresAt,
            })

            await expect(
                repository.findSessionByTokenHash(token.hash),
            ).resolves.toEqual({
                userId: user.id,
                expiresAt,
                revokedAt: null,
            })

            await repository.revokeSessionByTokenHash(token.hash, revokedAt)

            // 重复撤销应保留第一次撤销时间。
            await repository.revokeSessionByTokenHash(
                token.hash,
                new Date('2030-01-01T02:00:00.000Z'),
            )

            await expect(
                repository.findSessionByTokenHash(token.hash),
            ).resolves.toEqual({
                userId: user.id,
                expiresAt,
                revokedAt,
            })
        } finally {
            await pool.query('DELETE FROM users WHERE id = $1', [user.id])
        }
    })
})
