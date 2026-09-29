import type { CreateProjectInput } from '../repositories/project-repository.js'

export type ParseProjectInputResult =
    | {
          ok: true
          value: CreateProjectInput
      }
    | {
          ok: false
          message: string
      }

export function parseCreateProjectInput(
    body: unknown,
): ParseProjectInputResult {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return {
            ok: false,
            message: '请求体必须是 JSON 对象',
        }
    }

    const { name, description } = body as Record<string, unknown>

    if (typeof name !== 'string' || name.trim().length === 0) {
        return {
            ok: false,
            message: '项目名称不能为空',
        }
    }

    if (name.trim().length > 100) {
        return {
            ok: false,
            message: '项目名称不能超过 100 个字符',
        }
    }

    if (typeof description !== 'string') {
        return {
            ok: false,
            message: '项目描述必须是字符串',
        }
    }

    if (description.trim().length > 1_000) {
        return {
            ok: false,
            message: '项目描述不能超过 1000 个字符',
        }
    }

    return {
        ok: true,
        value: {
            name: name.trim(),
            description: description.trim(),
        },
    }
}
