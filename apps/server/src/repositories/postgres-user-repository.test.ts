import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { createDatabasePool } from '../db/pool.js'
import { createPostgresUserRepository } from './postgres-user-repository.js'

const TEST_DATABASE_URL =
    'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

describe('PostgresUserRepository', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)
    const repository = createPostgresUserRepository(pool)

    afterAll(async () => {
        await pool.end()
    })

    it('creates and queries a user without overwriting duplicate accounts', async () => {
        const phone = `test-${randomUUID()}`
        const input = {
            name: 'user-repository-test',
            phone,
            passwordHash: 'original-test-hash',
        }

        try {
            await expect(
                repository.findUserByPhone(phone),
            ).resolves.toBeUndefined()

            const created = await repository.createUser(input)
            if (!created.ok) {
                throw new Error('Failed to create test user')
            }

            const profile = {
                id: created.user.id,
                name: input.name,
                phone,
            }

            expect(typeof created.user.id).toBe('string')
            expect(created.user).toEqual(profile)

            await expect(repository.findUserById(profile.id)).resolves.toEqual(
                profile,
            )

            await expect(repository.findUserByPhone(phone)).resolves.toEqual({
                ...profile,
                passwordHash: input.passwordHash,
            })

            await expect(
                repository.createUser({
                    name: 'replacement-name',
                    phone,
                    passwordHash: 'replacement-hash',
                }),
            ).resolves.toEqual({
                ok: false,
                reason: 'phone_taken',
            })

            // 重复注册后，原用户的资料和密码哈希保持不变。
            await expect(repository.findUserByPhone(phone)).resolves.toEqual({
                ...profile,
                passwordHash: input.passwordHash,
            })

            await pool.query('DELETE FROM users WHERE id = $1', [profile.id])

            await expect(
                repository.findUserById(profile.id),
            ).resolves.toBeUndefined()
        } finally {
            await pool.query('DELETE FROM users WHERE phone = $1', [phone])
        }
    })
})
