import type { FastifyInstance } from 'fastify'
import type { ProjectService } from '../services/project-service.js'
import { SESSION_COOKIE_NAME } from '../http/session-cookie.js'
import { createApiErrorResponse } from '../http/api-error.js'
import { parseCreateProjectInput } from '../http/project-input.js'

interface ProjectRoutesOptions {
    projectService: Pick<ProjectService, 'createProject' | 'listProjects'>
}

export async function registerProjectRoutes(
    app: FastifyInstance,
    options: ProjectRoutesOptions,
): Promise<void> {
    app.get('/monitor-api/projects', async (request, reply) => {
        reply.header('Cache-Control', 'no-store')

        try {
            const result = await options.projectService.listProjects(
                request.cookies[SESSION_COOKIE_NAME],
            )

            if (!result.ok) {
                return reply
                    .status(401)
                    .send(
                        createApiErrorResponse(
                            result.reason,
                            '请先登录',
                            request.id,
                        ),
                    )
            }

            return reply.status(200).send({
                projects: result.projects,
            })
        } catch (error) {
            request.log.error({ err: error }, 'project list lookup failed')
            return reply
                .status(500)
                .send(
                    createApiErrorResponse(
                        'INTERNAL_ERROR',
                        '获取项目列表失败，请稍后重试',
                        request.id,
                    ),
                )
        }
    })

    app.post('/monitor-api/projects', async (request, reply) => {
        reply.header('Cache-Control', 'no-store')

        const parsed = parseCreateProjectInput(request.body)

        if (!parsed.ok) {
            return reply
                .status(400)
                .send(
                    createApiErrorResponse(
                        'INVALID_PROJECT_INPUT',
                        parsed.message,
                        request.id,
                    ),
                )
        }

        try {
            const result = await options.projectService.createProject(
                request.cookies[SESSION_COOKIE_NAME],
                parsed.value,
            )

            if (!result.ok) {
                return reply
                    .status(401)
                    .send(
                        createApiErrorResponse(
                            result.reason,
                            '请先登录',
                            request.id,
                        ),
                    )
            }

            return reply.status(201).send({
                project: result.project,
            })
        } catch (error) {
            request.log.error({ err: error }, 'project creation failed')

            return reply
                .status(500)
                .send(
                    createApiErrorResponse(
                        'INTERNAL_ERROR',
                        '创建项目失败，请稍后重试',
                        request.id,
                    ),
                )
        }
    })
}
