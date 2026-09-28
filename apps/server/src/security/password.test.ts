import { expect, test } from 'vitest'
import { hashPassword, verifyPassword } from './password.js'

test('相同密码使用不同随机盐，生成不同的哈希', async () => {
    const password = 'test-password-only'

    const first = await hashPassword(password)
    const second = await hashPassword(password)

    expect(first).not.toBe(second)

    const firstParts = first.split('$')
    const secondParts = second.split('$')

    // 盐位于第5段
    expect(firstParts[4]).not.toBe(secondParts[4])

    // 算法、参数、32 位十六进制盐、128 位十六进制结果
    const format = /^scrypt\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/

    expect(first).toMatch(format)
    expect(second).toMatch(format)
}, 10_000) // 10_000 是测试超时时间，单位 毫秒

test('正确密码通过，错误密码被拒绝', async () => {
    const hash = await hashPassword('correct-password')

    expect(await verifyPassword('correct-password', hash)).toBe(true)
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
}, 10_000)

test('无效的哈希格式返回 false', async () => {
    expect(await verifyPassword('any-password', 'invalid')).toBe(false)
})
