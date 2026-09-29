import type { FastifyInstance } from 'fastify'
import type { LoginService } from '../services/login-service.js'
import { parseLoginInput } from '../http/login-input.js'
import { createApiErrorResponse } from '../http/api-error.js'
import {
    createSessionCookieOptions,
    SESSION_COOKIE_NAME,
} from '../http/session-cookie.js'

interface LoginRoutesOptions {
    loginService: LoginService
    cookieSecure: boolean
}

export async function registerLoginRoutes(
    app: FastifyInstance,
    options: LoginRoutesOptions,
): Promise<void> {
    app.post('/monitor-api/auth/login', async (request, reply) => {
        reply.header('Cache-Control', 'no-store')

        const parsed = parseLoginInput(request.body)

        if (!parsed.ok) {
            return reply
                .status(400)
                .send(
                    createApiErrorResponse(
                        'INVALID_LOGIN_INPUT',
                        parsed.message,
                        request.id,
                    ),
                )
        }

        try {
            const result = await options.loginService.login(parsed.value)

            if (!result.ok) {
                return reply
                    .status(401)
                    .send(
                        createApiErrorResponse(
                            'INVALID_CREDENTIALS',
                            '手机号或密码错误',
                            request.id,
                        ),
                    )
            }

            reply.setCookie(SESSION_COOKIE_NAME, result.sessionToken, {
                ...createSessionCookieOptions(options.cookieSecure),
                expires: result.expiresAt,
            })

            return reply.status(200).send({
                user: {
                    id: result.user.id,
                    name: result.user.name,
                    phone: result.user.phone,
                },
            })
        } catch (error) {
            request.log.error({ err: error }, 'login failed')
            return reply
                .status(500)
                .send(
                    createApiErrorResponse(
                        'INTERNAL_ERROR',
                        '登录暂时失败，请稍后重试',
                        request.id,
                    ),
                )
        }
    })
}
