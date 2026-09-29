import { hashPassword, verifyPassword } from '../src/security/password.js'
import { createDatabasePool } from '../src/db/pool.js'
import { generateProjectKey } from '../src/security/project-key.js'

function requireEnv(name: string): string {
    const value = process.env[name]

    if (value === undefined || value.trim() === '') {
        throw new Error(`${name} is required`)
    }

    return value
}

const config = {
    databaseUrl: requireEnv('DATABASE_URL').trim(),
    phone: requireEnv('SEED_USER_PHONE').trim(),
    password: requireEnv('SEED_USER_PASSWORD'),
    userName: 'test',
    projectName: 'demo-web',
}

const pool = createDatabasePool(config.databaseUrl)

try {
    const passwordHash = await hashPassword(config.password)

    const inserted = await pool.query<{ id: string }>(
        `
        INSERT INTO users (name, phone, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) DO NOTHING
        RETURNING id
        `,
        [config.userName, config.phone, passwordHash],
    )

    let userId = inserted.rows[0]?.id
    const userCreated = userId !== undefined

    if (userId === undefined) {
        const existing = await pool.query<{
            id: string
            password_hash: string
        }>(
            `
            SELECT id, password_hash
            FROM users
            WHERE phone = $1
            `,
            [config.phone],
        )

        const user = existing.rows[0]

        if (user === undefined) {
            throw new Error('未找到默认用户，请重新运行初始化')
        }

        const matches = await verifyPassword(
            config.password,
            user.password_hash,
        )

        if (!matches) {
            throw new Error('该手机号已存在，但初始化密码不匹配')
        }
        userId = user.id
    }

    const insertedProject = await pool.query<{ id: string }>(
        `
        INSERT INTO projects (name, owner_id)
        VALUES ($1, $2)
        ON CONFLICT (owner_id, name) DO NOTHING
        RETURNING id
        `,
        [config.projectName, userId],
    )

    let projectId = insertedProject.rows[0]?.id
    const projectCreated = projectId !== undefined

    if (projectId === undefined) {
        const existingProject = await pool.query<{ id: string }>(
            `
            SELECT id
            FROM projects
            WHERE owner_id = $1
                AND name = $2
            `,
            [userId, config.projectName],
        )
        const project = existingProject.rows[0]

        if (project === undefined) {
            throw new Error('未找到默认项目，请重新运行初始化')
        }

        projectId = project.id
    }

    await pool.query(
        `
        INSERT INTO project_apps (project_id, app_id, name, platform)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (project_id, app_id) DO NOTHING
        `,
        [projectId, 'demo-web', 'demo-web', 'web'],
    )

    const existingKeyResult = await pool.query<{
        id: string
        key_prefix: string
    }>(
        `
        SELECT id, key_prefix
        FROM project_keys
        WHERE project_id = $1
            AND revoked_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [projectId],
    )

    const existingKey = existingKeyResult.rows[0]
    let keyId = existingKey?.id
    let keyPrefix = existingKey?.key_prefix
    let keyCreated = false
    let plainTextKey: string | undefined

    if (existingKey === undefined) {
        const generatedKey = generateProjectKey()
        const insertedKey = await pool.query<{ id: string }>(
            `
            INSERT INTO project_keys (
                project_id,
                key_hash,
                key_prefix
            )
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [projectId, generatedKey.hash, generatedKey.prefix],
        )

        const inserted = insertedKey.rows[0]

        if (inserted === undefined) {
            throw new Error('创建默认项目 Key 后未返回 ID')
        }

        keyId = inserted.id
        keyPrefix = generatedKey.prefix
        keyCreated = true
        plainTextKey = generatedKey.plainText
    }

    console.log('默认初始化完成', {
        userId,
        userCreated,
        projectId,
        projectCreated,
        keyId,
        keyPrefix,
        keyCreated,
    })

    if (plainTextKey !== undefined) {
        console.log('请立即保存项目 Key，它不会再次显示：', plainTextKey)
    }
} finally {
    await pool.end()
}
