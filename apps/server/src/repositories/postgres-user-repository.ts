import type { Pool } from 'pg'
import type { UserProfile, UserRepository } from './user-repository.js'

interface UserWithPasswordRow extends UserProfile {
    password_hash: string
}

export function createPostgresUserRepository(pool: Pool): UserRepository {
    return {
        async createUser(input) {
            const result = await pool.query<UserProfile>(
                `
                INSERT INTO users (name, phone, password_hash)
                VALUES ($1, $2, $3)
                ON CONFLICT (phone) DO NOTHING
                RETURNING id, name, phone
                `,
                [input.name, input.phone, input.passwordHash],
            )
            const user = result.rows[0]
            if (user === undefined) {
                return {
                    ok: false,
                    reason: 'phone_taken',
                }
            }

            return {
                ok: true,
                user,
            }
        },
        async findUserByPhone(phone) {
            const result = await pool.query<UserWithPasswordRow>(
                `
                SELECT id, name, phone, password_hash
                FROM users
                WHERE phone = $1
                `,
                [phone],
            )

            const row = result.rows[0]
            if (row === undefined) {
                return undefined
            }

            return {
                id: row.id,
                name: row.name,
                phone: row.phone,
                passwordHash: row.password_hash,
            }
        },
        async findUserById(id) {
            const result = await pool.query<UserProfile>(
                `
                SELECT id, name, phone
                FROM users
                WHERE id = $1
                `,
                [id],
            )
            return result.rows[0]
        },
    }
}
