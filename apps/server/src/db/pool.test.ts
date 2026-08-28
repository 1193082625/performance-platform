import {
    describe,
    it,
    expect,
    afterAll,
} from 'vitest'

import { createDatabasePool } from './pool.js'

const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/performance_platform_test'

describe('database pool', () => {
    const pool = createDatabasePool(TEST_DATABASE_URL)
    afterAll(async () => {
        // 连接池会保留数据库连接。如果测试结束不关闭它，Vitest 可能一直等待，提示存在未关闭的句柄
        await pool.end()
    })

    it('connects to the test database', async () => {
        // SELECT 1 AS value ： 不读取任何业务表，只要求 PostgreSQL 返回固定值 value = 1
        // 如果测试通过，就证明数据库连接本身成立
        const result = await pool.query<{
            value: number
        }>('SELECT 1 AS value')

        expect(result.rows).toEqual([
            {
                value: 1,
            }
        ])
    })
})