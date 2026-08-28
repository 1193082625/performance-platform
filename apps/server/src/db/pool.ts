/**
 * 连接池工厂
 * 职责： 根据一个连接地址创建数据库连接池
 * 地址来自哪里，由外层决定
 */
import { Pool } from 'pg'

export function createDatabasePool(
    connectionString: string
): Pool {
    // 真正执行 await pool.query(...) 时，连接池才会按需建立连接
    return new Pool({
        connectionString
    })
}