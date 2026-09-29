import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { generateSessionToken } from './session-token.js'

test('生成可验证的会话令牌', () => {
    const token = generateSessionToken()

    // 32 字节随机数据转位 Base64URL 后是 43 个字符
    expect(token.plainText).toMatch(/^[A-Za-z0-9_-]{43}$/)

    // 使用 Node 的 SHA-256 独立计算一次，验证工具函数返回的哈希正确
    const expectedHash = createHash('sha256')
        .update(token.plainText)
        .digest('hex')
    expect(token.hash).toBe(expectedHash)
})

test('每次生成的会话令牌都不同', () => {
    const first = generateSessionToken()
    const second = generateSessionToken()

    expect(first.plainText).not.toBe(second.plainText)
    expect(first.hash).not.toBe(second.hash)
})
