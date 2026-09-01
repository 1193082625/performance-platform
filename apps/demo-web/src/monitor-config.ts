import type {
    PaintMonitorConfig,
} from '@performance-platform/browser'


type ApplicationEnvironment = PaintMonitorConfig['environment']

interface ResolveMonitorConfigOptions {
    VITE_MONITOR_ENDPOINT?: string
    VITE_APP_ID?: string,
    VITE_APP_VERSION?: string
    VITE_APP_ENVIRONMENT?: string
}

const requireEnvironmentVariable = (name: string, value: string | undefined) => {
    const normalizedValue = value?.trim()
    if (!normalizedValue) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return normalizedValue
}

function resolveApplicationEnvironment(
    value: string | undefined,
): ApplicationEnvironment {
    const normalizedValue =
        requireEnvironmentVariable(
            'VITE_APP_ENVIRONMENT',
            value,
        )

    // 这里用 switch 可以同时完成运行时验证和ts类型收窄，没有用类型断言掩盖风险
    switch (normalizedValue) {
        case 'development':
        case 'test':
        case 'staging':
        case 'production':
            return normalizedValue

        default:
            throw new Error(
                `Unsupported application environment: ${normalizedValue}`,
            )
    }
}

export function resolveMonitorConfig(
 options: ResolveMonitorConfigOptions,
): PaintMonitorConfig {
    const endpoint = requireEnvironmentVariable(
        'VITE_MONITOR_ENDPOINT',
        options.VITE_MONITOR_ENDPOINT
    )
    const appId = requireEnvironmentVariable(
        'VITE_APP_ID',
        options.VITE_APP_ID
    )
    const appVersion = requireEnvironmentVariable(
        'VITE_APP_VERSION',
        options.VITE_APP_VERSION
    )
    const environment = resolveApplicationEnvironment(options.VITE_APP_ENVIRONMENT)

    return {
        endpoint,
        appId,
        appVersion,
        environment
    }
}