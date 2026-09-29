import type { Pool } from 'pg'
import type { OwnedProject, ProjectRepository } from './project-repository.js'

export function createPostgresProjectRepository(pool: Pool): ProjectRepository {
    return {
        async findProjectOwnedByUser(projectId, userId) {
            const result = await pool.query<OwnedProject>(
                `
                SELECT id, name, description
                FROM projects
                WHERE id = $1
                    AND owner_id = $2
                `,
                [projectId, userId],
            )
            return result.rows[0]
        },
        async createProject(ownerId, input) {
            const result = await pool.query<OwnedProject>(
                `
                INSERT INTO projects (name, description, owner_id)
                VALUES ($1, $2, $3)
                RETURNING id, name, description
                `,
                [input.name, input.description, ownerId],
            )
            const project = result.rows[0]
            if (project === undefined) {
                throw new Error('创建项目失败')
            }
            return project
        },
        async listProjectsOwnedByUser(userId) {
            const result = await pool.query<OwnedProject>(
                `
                SELECT id, name, description
                FROM projects
                WHERE owner_id = $1
                ORDER BY created_at DESC, id DESC
                `,
                [userId],
            )
            return result.rows
        },
    }
}
