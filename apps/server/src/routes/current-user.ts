import type { FastifyInstance } from 'fastify'
import type { CurrentUserService } from '../services/current-user-service.js'
import { SESSION_COOKIE_NAME } from '../http/session-cookie.js'
import { createApiErrorResponse } from '../http/api-error.js'

interface CurrentUserRoutesOptions {
    currentUserService: CurrentUserService
}

export async function registerCurrentUserRoutes(
    app: FastifyInstance,
    options: CurrentUserRoutesOptions,
): Promise<void> {
    app.get('/monitor-api/auth/me', async (request, reply) => {
        reply.header('Cache-Control', 'no-store')

        try {
            const result = await options.currentUserService.getCurrentUser(
                request.cookies[SESSION_COOKIE_NAME],
            )

            if (!result.ok) {
                return reply
                    .status(401)
                    .send(
                        createApiErrorResponse(
                            'UNAUTHENTICATED',
                            '请先登录',
                            request.id,
                        ),
                    )
            }

            return reply.status(200).send({
                user: {
                    id: result.user.id,
                    name: result.user.name,
                    phone: result.user.phone,
                },
            })
        } catch (error) {
            request.log.error({ err: error }, 'current user lookup failed')

            return reply
                .status(500)
                .send(
                    createApiErrorResponse(
                        'INTERNAL_ERROR',
                        '获取当前用户失败，请稍后重试',
                        request.id,
                    ),
                )
        }
    })
}
