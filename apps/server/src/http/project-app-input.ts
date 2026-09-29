import type { ProjectAppPlatform } from '../repositories/project-app-repository.js'
import type { CreateAppInput } from '../services/project-app-service.js'

export type ParseProjectAppInputResult =
    | {
          ok: true
          value: CreateAppInput
      }
    | {
          ok: false
          message: string
      }

function isProjectAppPlatform(value: unknown): value is ProjectAppPlatform {
    return (
        value === 'web' ||
        value === 'ios' ||
        value === 'android' ||
        value === 'mini_program_zfb' ||
        value === 'mini_program_wx'
    )
}

export function parseCreateProjectAppInput(
    body: unknown,
): ParseProjectAppInputResult {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return {
            ok: false,
            message: '请求体必须是 JSON 对象',
        }
    }

    const { name, platform } = body as Record<string, unknown>

    if (typeof name !== 'string' || name.trim().length === 0) {
        return {
            ok: false,
            message: '应用名称不能为空',
        }
    }

    if (name.trim().length > 100) {
        return {
            ok: false,
            message: '应用名称不能超过 100 个字符',
        }
    }

    if (!isProjectAppPlatform(platform)) {
        return {
            ok: false,
            message: '应用平台不受支持',
        }
    }

    return {
        ok: true,
        value: {
            name: name.trim(),
            platform,
        },
    }
}
