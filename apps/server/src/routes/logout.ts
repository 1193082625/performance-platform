import type { FastifyInstance } from 'fastify'
import { createApiErrorResponse } from '../http/api-error.js'
import {
    createSessionCookieOptions,
    SESSION_COOKIE_NAME,
} from '../http/session-cookie.js'
import type { LogoutService } from '../services/logout-service.js'

interface LogoutRoutesOptions {
    logoutService: LogoutService
    cookieSecure: boolean
}

export async function registerLogoutRoutes(
    app: FastifyInstance,
    options: LogoutRoutesOptions,
): Promise<void> {
    app.post('/monitor-api/auth/logout', async (request, reply) => {
        reply.header('Cache-Control', 'no-store')

        try {
            await options.logoutService.logout(
                request.cookies[SESSION_COOKIE_NAME],
            )

            reply.clearCookie(
                SESSION_COOKIE_NAME,
                createSessionCookieOptions(options.cookieSecure),
            )

            return reply.status(204).send()
        } catch (error) {
            request.log.error({ err: error }, 'logout failed')

            return reply
                .status(500)
                .send(
                    createApiErrorResponse(
                        'INTERNAL_ERROR',
                        '退出登录失败，请稍后重试',
                        request.id,
                    ),
                )
        }
    })
}
