type Environment =
    Record<string, string | undefined>

export interface ServerConfig {
    port: number
    databaseUrl: string
    appId: string
    corsOrigins: string[]
    logLevel: string
}

const LOG_LEVELS = [
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
    'silent',
]

export function loadConfig(
    env: Environment,
): ServerConfig {
    const corsOrigins =
        (env.CORS_ORIGINS ?? '')
            .split(',')
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0)

    const port = Number(env.PORT ?? '5000')
    // TCP/UDP 端口是 16 位无符号数，合法范围是 0–65535；其中 0 通常表示让操作系统随机分配端口，不适合作为这里的明确服务配置，所以要求 1–65535
    if (
        !Number.isInteger(port)
        || port < 1
        || port > 65_535
    ) {
        throw new Error(
            'PORT must be an integer between 1 and 65535',
        )
    }

    const databaseUrl = env.DATABASE_URL?.trim() ?? ''
    if (databaseUrl.length === 0) {
        throw new Error('DATABASE_URL is required')
    }

    const appId = env.APP_ID?.trim() ?? ''
    if (appId.length === 0) {
        throw new Error('APP_ID is required')
    }

    const logLevel = env.LOG_LEVEL?.trim() || 'info'
    if (!LOG_LEVELS.includes(logLevel)) {
        throw new Error(
            'LOG_LEVEL must be one of trace, debug, info, warn, error, fatal, or silent',
        )
    }
    
    return {
        port,
        databaseUrl,
        appId,
        corsOrigins,
        logLevel,
    }
}