import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createDatabasePool } from './db/pool.js'
import { createPostgresEventRepository } from './repositories/postgres-event-repository.js'
import { createPostgresProjectAppKeyRepository } from './repositories/postgres-project-app-key-repository.js'
import { createPostgresProjectAppRepository } from './repositories/postgres-project-app-repository.js'
import { createPostgresProjectRepository } from './repositories/postgres-project-repository.js'
import { createPostgresSessionRepository } from './repositories/postgres-session-repository.js'
import { createPostgresUserRepository } from './repositories/postgres-user-repository.js'

const config = loadConfig(process.env)
const pool = createDatabasePool(config.databaseUrl)
const repository = createPostgresEventRepository(pool)
const userRepository = createPostgresUserRepository(pool)
const sessionRepository = createPostgresSessionRepository(pool)
const projectAppRepository = createPostgresProjectAppRepository(pool)
const projectAppKeyRepository = createPostgresProjectAppKeyRepository(pool)
const projectRepository = createPostgresProjectRepository(pool)

const app = buildApp({
    eventRepository: repository,
    metricQueryRepository: repository,
    memoryHealthRepository: repository,
    lcpDiagnosticRepository: repository,
    clsDiagnosticRepository: repository,
    inpDiagnosticRepository: repository,
    appId: config.appId,
    now: Date.now,
    corsOrigins: config.corsOrigins,
    logLevel: config.logLevel,
    projectRepository,
    projectAppRepository,
    projectAppKeyRepository,
    userRepository,
    sessionRepository,
    cookieSecure: config.cookieSecure,
})

async function shutdown(signal: string): Promise<void> {
    app.log.info({ signal }, 'shutting down server')

    await app.close()
    await pool.end()
}

// 操作系统发送给进程的“请停止运行”信号
// SIGINT 通常来自终端中的 Ctrl + C
// 处理一次关闭流程，shutdown() 负责有顺序地关闭
process.once('SIGINT', () => void shutdown('SIGINT'))

// SIGTERM 通常来自 Docker 或 部署平台
process.once('SIGTERM', () => void shutdown('SIGTERM'))

try {
    await app.listen({
        host: '0.0.0.0',
        port: config.port,
    })
} catch (error) {
    app.log.error(error, 'failed to start server')

    await pool.end()

    process.exitCode = 1
}
