import type { Pool } from 'pg'
import type {
    ProjectApp,
    ProjectAppPlatform,
    ProjectAppRepository,
} from './project-app-repository.js'

interface ProjectAppRow {
    id: string
    project_id: string
    app_id: string
    name: string
    platform: ProjectAppPlatform
}

function toProjectApp(row: ProjectAppRow): ProjectApp {
    return {
        id: row.id,
        projectId: row.project_id,
        appId: row.app_id,
        name: row.name,
        platform: row.platform,
    }
}

export function createPostgresProjectAppRepository(
    pool: Pool,
): ProjectAppRepository {
    return {
        async createProjectApp(input) {
            const result = await pool.query<ProjectAppRow>(
                `
                INSERT INTO project_apps (
                    project_id,
                    app_id,
                    name,
                    platform
                )
                VALUES ($1, $2, $3, $4)
                RETURNING id, project_id, app_id, name, platform
                `,
                [input.projectId, input.appId, input.name, input.platform],
            )

            const row = result.rows[0]

            if (row === undefined) {
                throw new Error('创建应用失败')
            }

            return toProjectApp(row)
        },
        async findProjectApp(projectId, appId) {
            const result = await pool.query<ProjectAppRow>(
                `
                SELECT id, project_id, app_id, name, platform
                FROM project_apps
                WHERE project_id = $1
                    AND app_id = $2
                `,
                [projectId, appId],
            )
            const row = result.rows[0]
            return row === undefined ? undefined : toProjectApp(row)
        },
        async listProjectApps(projectId) {
            const result = await pool.query<ProjectAppRow>(
                `
                SELECT id, project_id, app_id, name, platform
                FROM project_apps
                WHERE project_id = $1
                ORDER BY created_at ASC, id ASC
                `,
                [projectId],
            )
            return result.rows.map(toProjectApp)
        },
    }
}
