import type { FastifyInstance } from 'fastify'
import type { RegisterService } from '../services/register-service.js'
import { parseRegisterInput } from '../http/register-input.js'
import { createApiErrorResponse } from '../http/api-error.js'

interface RegisterRoutesOptions {
    registerService: RegisterService
}

export async function registerRegistrationRoutes(
    app: FastifyInstance,
    options: RegisterRoutesOptions,
): Promise<void> {
    app.post('/monitor-api/auth/register', async (request, reply) => {
        const parsed = parseRegisterInput(request.body)

        if (!parsed.ok) {
            return reply
                .status(400)
                .send(
                    createApiErrorResponse(
                        'INVALID_REGISTER_INPUT',
                        parsed.message,
                        request.id,
                    ),
                )
        }

        try {
            const result = await options.registerService.register(parsed.value)
            if (!result.ok) {
                return reply
                    .status(409)
                    .send(
                        createApiErrorResponse(
                            'PHONE_TAKEN',
                            '该手机号已注册',
                            request.id,
                        ),
                    )
            }

            return reply.status(201).send({
                user: {
                    id: result.user.id,
                    name: result.user.name,
                    phone: result.user.phone,
                },
            })
        } catch (error) {
            request.log.error({ err: error }, 'registration failed')

            return reply
                .status(500)
                .send(
                    createApiErrorResponse(
                        'INTERNAL_ERROR',
                        '注册暂时失败，请稍后重试',
                        request.id,
                    ),
                )
        }
    })
}
