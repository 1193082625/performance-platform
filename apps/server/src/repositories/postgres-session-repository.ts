import type { Pool } from 'pg'
import type { SessionRepository } from './session-repository.js'

interface SessionRow {
    user_id: string
    expires_at: Date
    revoked_at: Date | null
}

export function createPostgresSessionRepository(pool: Pool): SessionRepository {
    return {
        async createSession(input) {
            await pool.query(
                `
                INSERT INTO user_sessions (user_id, token_hash, expires_at)
                VALUES ($1, $2, $3)
                `,
                [input.userId, input.tokenHash, input.expiresAt],
            )
        },
        async findSessionByTokenHash(tokenHash) {
            const result = await pool.query<SessionRow>(
                `
                SELECT user_id, expires_at, revoked_at
                FROM user_sessions
                WHERE token_hash = $1
                `,
                [tokenHash],
            )

            const row = result.rows[0]
            if (row === undefined) {
                return undefined
            }

            return {
                userId: row.user_id,
                expiresAt: row.expires_at,
                revokedAt: row.revoked_at,
            }
        },
        async revokeSessionByTokenHash(tokenHash, revokedAt) {
            await pool.query(
                `
                UPDATE user_sessions
                SET revoked_at = $2
                WHERE token_hash = $1
                    AND revoked_at IS NULL
                `,
                [tokenHash, revokedAt],
            )
        },
    }
}
