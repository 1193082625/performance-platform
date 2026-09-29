import type { LoginInput } from '../services/login-service.js'

export type ParseLoginInputResult =
    | {
          ok: true
          value: LoginInput
      }
    | {
          ok: false
          message: string
      }

export function parseLoginInput(input: unknown): ParseLoginInputResult {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        return {
            ok: false,
            message: '请求体必须是对象',
        }
    }

    const body = input as Record<string, unknown>

    if (typeof body.phone !== 'string' || typeof body.password !== 'string') {
        return {
            ok: false,
            message: '手机号和密码必须是字符串',
        }
    }

    const phone = body.phone.trim()
    const password = body.password

    if (!/^1[3-9]\d{9}$/.test(phone)) {
        return {
            ok: false,
            message: '请输入有效的中国大陆手机号',
        }
    }

    if (password.length === 0 || password.length > 128) {
        return {
            ok: false,
            message: '密码不能为空且长度不能超过 128',
        }
    }

    return {
        ok: true,
        value: {
            phone,
            password,
        },
    }
}
