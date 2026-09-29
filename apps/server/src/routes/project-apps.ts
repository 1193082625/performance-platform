import type { FastifyInstance } from 'fastify'
import type { ProjectAppService } from '../services/project-app-service.js'
import { SESSION_COOKIE_NAME } from '../http/session-cookie.js'
import { createApiErrorResponse } from '../http/api-error.js'
import { parseCreateProjectAppInput } from '../http/project-app-input.js'

interface ProjectAppRoutesOptions {
    projectAppService: ProjectAppService
}

interface ProjectParams {
    projectId: string
}

export async function registerProjectAppRoutes(
    app: FastifyInstance,
    options: ProjectAppRoutesOptions,
): Promise<void> {
    app.get<{ Params: ProjectParams }>(
        '/monitor-api/projects/:projectId/apps',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')

            try {
                const result = await options.projectAppService.listProjectApps(
                    request.cookies[SESSION_COOKIE_NAME],
                    request.params.projectId,
                )

                if (!result.ok) {
                    const statusCode =
                        result.reason === 'UNAUTHENTICATED' ? 401 : 404
                    const message =
                        result.reason === 'UNAUTHENTICATED'
                            ? '请先登录'
                            : '项目不存在或无权访问'
                    return reply
                        .status(statusCode)
                        .send(
                            createApiErrorResponse(
                                result.reason,
                                message,
                                request.id,
                            ),
                        )
                }

                return reply.status(200).send({
                    apps: result.apps,
                })
            } catch (error) {
                request.log.error({ err: error }, 'project app list failed')
                return reply
                    .status(500)
                    .send(
                        createApiErrorResponse(
                            'INTERNAL_ERROR',
                            '获取应用列表失败，请稍后重试',
                            request.id,
                        ),
                    )
            }
        },
    )

    app.post<{ Params: ProjectParams }>(
        '/monitor-api/projects/:projectId/apps',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')

            const parsed = parseCreateProjectAppInput(request.body)

            if (!parsed.ok) {
                return reply
                    .status(400)
                    .send(
                        createApiErrorResponse(
                            'INVALID_PROJECT_APP_INPUT',
                            parsed.message,
                            request.id,
                        ),
                    )
            }

            try {
                const result = await options.projectAppService.createProjectApp(
                    request.cookies[SESSION_COOKIE_NAME],
                    request.params.projectId,
                    parsed.value,
                )

                if (!result.ok) {
                    const statusCode =
                        result.reason === 'UNAUTHENTICATED' ? 401 : 404
                    const message =
                        result.reason === 'UNAUTHENTICATED'
                            ? '请先登录'
                            : '项目不存在或无权访问'
                    return reply
                        .status(statusCode)
                        .send(
                            createApiErrorResponse(
                                result.reason,
                                message,
                                request.id,
                            ),
                        )
                }

                return reply.status(201).send({
                    app: result.app,
                })
            } catch (error) {
                request.log.error({ err: error }, 'project app creation failed')

                return reply
                    .status(500)
                    .send(
                        createApiErrorResponse(
                            'INTERNAL_ERROR',
                            '创建应用失败，请稍后重试',
                            request.id,
                        ),
                    )
            }
        },
    )
}
