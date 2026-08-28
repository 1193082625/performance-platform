import {
    readdir,
    readFile,
} from 'node:fs/promises'

import {
    createDatabasePool,
} from '../src/db/pool.js'

const databaseUrl =
    process.env.DATABASE_URL

if (
    databaseUrl === undefined
    || databaseUrl.trim() === ''
) {
    throw new Error(
        'DATABASE_URL is required',
    )
}

const migrationsDirectory = new URL(
    '../src/db/migrations/',
    import.meta.url
)

const pool =
    createDatabasePool(databaseUrl)

try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL
                DEFAULT now()
        )
    `)
    const files = await readdir(migrationsDirectory)

    const migrationFiles = files.filter((file) => file.endsWith('.sql')).sort()

    const appliedResult = await pool.query<{
        version: string
    }>(`
        SELECT version
        FROM schema_migrations    
    `)

    const appliedVersions = new Set(
        appliedResult.rows.map(
            (row) => row.version,
        )
    )

    const pendingMigrations = migrationFiles.filter((file) => !appliedVersions.has(file))

   
    for(const migrationFile of pendingMigrations) {
        const migrationUrl = new URL(migrationFile, migrationsDirectory)
        const migrationSql = await readFile(migrationUrl, 'utf8')
        const client = await pool.connect()

        try {
            await client.query('BEGIN')
            await client.query(migrationSql)
            await client.query(`
                INSERT INTO schema_migrations (version) VALUES ($1)
            `,[
                migrationFile
            ])
            await client.query('COMMIT')

            console.log(
                `Applied migration: ${migrationFile}`,
            )
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    }
} finally {
    await pool.end()
}