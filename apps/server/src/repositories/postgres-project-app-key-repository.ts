import type { Pool } from 'pg'
import type {
    ProjectAppKey,
    ProjectAppKeyRepository,
} from './project-app-key-repository.js'

interface ProjectAppKeyRow {
    id: string
    key_prefix: string
    created_at: Date
    revoked_at: Date | null
}

function toProjectAppKey(row: ProjectAppKeyRow): ProjectAppKey {
    return {
        id: row.id,
        prefix: row.key_prefix,
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
    }
}

export function createPostgresProjectAppKeyRepository(
    pool: Pool,
): ProjectAppKeyRepository {
    return {
        async createProjectAppKey(input) {
            const result = await pool.query<ProjectAppKeyRow>(
                `
                INSERT INTO project_app_keys (
                    project_app_id,
                    key_hash,
                    key_prefix
                )
                VALUES ($1, $2, $3)
                RETURNING id, key_prefix, created_at, revoked_at
                `,
                [input.projectAppId, input.keyHash, input.keyPrefix],
            )
            const row = result.rows[0]
            if (row === undefined) {
                throw new Error('创建应用密钥失败')
            }
            return toProjectAppKey(row)
        },
        async listProjectAppKeys(projectAppId) {
            const result = await pool.query<ProjectAppKeyRow>(
                `
                SELECT id, key_prefix, created_at, revoked_at
                FROM project_app_keys
                WHERE project_app_id = $1
                ORDER BY created_at DESC, id DESC
                `,
                [projectAppId],
            )
            return result.rows.map(toProjectAppKey)
        },
        async revokeProjectAppKey(keyId, projectAppId, revokedAt) {
            await pool.query(
                `
                UPDATE project_app_keys
                SET revoked_at = $3
                WHERE id = $1
                    AND project_app_id = $2
                    AND revoked_at IS NULL
                `,
                [keyId, projectAppId, revokedAt],
            )
        },
        async findActiveProjectAppByKeyHash(keyHash) {
            const result = await pool.query<{
                project_id: string
                app_id: string
            }>(
                `
                SELECT project_apps.project_id, project_apps.app_id
                FROM project_app_keys
                JOIN project_apps
                    ON project_apps.id = project_app_keys.project_app_id
                WHERE project_app_keys.key_hash = $1
                    AND project_app_keys.revoked_at IS NULL
                LIMIT 1
                `,
                [keyHash],
            )

            const row = result.rows[0]

            return row === undefined
                ? undefined
                : {
                      projectId: row.project_id,
                      appId: row.app_id,
                  }
        },
    }
}
