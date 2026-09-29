import type { FastifyInstance } from 'fastify'
import { createApiErrorResponse } from '../http/api-error.js'
import { SESSION_COOKIE_NAME } from '../http/session-cookie.js'
import type { ProjectAppKeyService } from '../services/project-app-key-service.js'

interface ProjectAppKeyRoutesOptions {
    projectAppKeyService: ProjectAppKeyService
}

interface ProjectAppParams {
    projectId: string
    appId: string
}

interface ProjectAppKeyParams extends ProjectAppParams {
    keyId: string
}

function failureStatus(
    reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'PROJECT_APP_NOT_FOUND',
): number {
    return reason === 'UNAUTHENTICATED' ? 401 : 404
}

function failureMessage(
    reason: 'UNAUTHENTICATED' | 'PROJECT_NOT_FOUND' | 'PROJECT_APP_NOT_FOUND',
): string {
    if (reason === 'UNAUTHENTICATED') return '请先登录'
    if (reason === 'PROJECT_NOT_FOUND') return '项目不存在或无权访问'
    return '应用不存在或不属于当前项目'
}

export async function registerProjectAppKeyRoutes(
    app: FastifyInstance,
    options: ProjectAppKeyRoutesOptions,
): Promise<void> {
    app.get<{ Params: ProjectAppParams }>(
        '/monitor-api/projects/:projectId/apps/:appId/keys',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')
            try {
                const result =
                    await options.projectAppKeyService.listProjectAppKeys(
                        request.cookies[SESSION_COOKIE_NAME],
                        request.params.projectId,
                        request.params.appId,
                    )
                if (!result.ok) {
                    return reply
                        .status(failureStatus(result.reason))
                        .send(
                            createApiErrorResponse(
                                result.reason,
                                failureMessage(result.reason),
                                request.id,
                            ),
                        )
                }
                return reply.status(200).send({ keys: result.keys })
            } catch (error) {
                request.log.error({ err: error }, 'project app key list failed')
                return reply
                    .status(500)
                    .send(
                        createApiErrorResponse(
                            'INTERNAL_ERROR',
                            '获取应用密钥失败，请稍后重试',
                            request.id,
                        ),
                    )
            }
        },
    )

    app.post<{ Params: ProjectAppParams }>(
        '/monitor-api/projects/:projectId/apps/:appId/keys',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')
            try {
                const result =
                    await options.projectAppKeyService.createProjectAppKey(
                        request.cookies[SESSION_COOKIE_NAME],
                        request.params.projectId,
                        request.params.appId,
                    )
                if (!result.ok) {
                    return reply
                        .status(failureStatus(result.reason))
                        .send(
                            createApiErrorResponse(
                                result.reason,
                                failureMessage(result.reason),
                                request.id,
                            ),
                        )
                }
                return reply.status(201).send({
                    key: {
                        id: result.key.id,
                        prefix: result.key.prefix,
                        createdAt: result.key.createdAt,
                        revokedAt: result.key.revokedAt,
                        plainText: result.plainTextKey,
                    },
                })
            } catch (error) {
                request.log.error(
                    { err: error },
                    'project app key creation failed',
                )
                return reply
                    .status(500)
                    .send(
                        createApiErrorResponse(
                            'INTERNAL_ERROR',
                            '创建应用密钥失败，请稍后重试',
                            request.id,
                        ),
                    )
            }
        },
    )

    app.delete<{ Params: ProjectAppKeyParams }>(
        '/monitor-api/projects/:projectId/apps/:appId/keys/:keyId',
        async (request, reply) => {
            reply.header('Cache-Control', 'no-store')
            try {
                const result =
                    await options.projectAppKeyService.revokeProjectAppKey(
                        request.cookies[SESSION_COOKIE_NAME],
                        request.params.projectId,
                        request.params.appId,
                        request.params.keyId,
                    )
                if (!result.ok) {
                    return reply
                        .status(failureStatus(result.reason))
                        .send(
                            createApiErrorResponse(
                                result.reason,
                                failureMessage(result.reason),
                                request.id,
                            ),
                        )
                }
                return reply.status(204).send()
            } catch (error) {
                request.log.error(
                    { err: error },
                    'project app key revocation failed',
                )
                return reply
                    .status(500)
                    .send(
                        createApiErrorResponse(
                            'INTERNAL_ERROR',
                            '停用应用密钥失败，请稍后重试',
                            request.id,
                        ),
                    )
            }
        },
    )
}
