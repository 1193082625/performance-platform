import { expect, test } from 'vitest'
import { generateProjectKey } from './project-key.js'
import { createHash } from 'crypto'

test('生成可用于上报且可验证的项目 Key', () => {
    const key = generateProjectKey()

    expect(key.plainText).toMatch(/^ppk_[A-Za-z0-9_-]{43}$/)
    expect(key.prefix).toBe(key.plainText.slice(0, 12))

    const expectedHash = createHash('sha256')
        .update(key.plainText)
        .digest('hex')
    expect(key.hash).toBe(expectedHash)
})

test('每次生成的项目 Key 都不同', () => {
    const first = generateProjectKey()
    const second = generateProjectKey()

    expect(first.plainText).not.toBe(second.plainText)
    expect(first.hash).not.toBe(second.hash)
})
