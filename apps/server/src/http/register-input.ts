import type { RegisterInput } from '../services/register-service.js'

export type ParseRegisterInputResult =
    | {
          ok: true
          value: RegisterInput
      }
    | {
          ok: false
          message: string
      }

export function parseRegisterInput(input: unknown): ParseRegisterInputResult {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return {
            ok: false,
            message: '请求体必须是对象',
        }
    }

    const body = input as Record<string, unknown>

    if (
        typeof body.name !== 'string' ||
        typeof body.phone !== 'string' ||
        typeof body.password !== 'string'
    ) {
        return {
            ok: false,
            message: '姓名、手机号和密码必须是字符串',
        }
    }

    const name = body.name.trim()
    const phone = body.phone.trim()
    const password = body.password

    if (name.length < 1 || name.length > 50) {
        return {
            ok: false,
            message: '姓名长度必须为 1~50',
        }
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return {
            ok: false,
            message: '请输入有效的中国大陆手机号',
        }
    }

    if (password.length < 6 || password.length > 128) {
        return {
            ok: false,
            message: '密码长度必须为 6～128',
        }
    }

    return {
        ok: true,
        value: {
            name,
            phone,
            password,
        },
    }
}
