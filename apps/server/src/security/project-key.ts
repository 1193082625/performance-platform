import { createHash, randomBytes } from 'node:crypto'

const KEY_PREFIX = 'ppk_'
const RANDOM_BYTES_LENGTH = 32
const DISPLAY_PREFIX_LENGTH = 12

export interface GeneratedProjectKey {
    plainText: string
    hash: string
    prefix: string
}

export function hashProjectKey(plainText: string): string {
    return createHash('sha256').update(plainText).digest('hex')
}

export function generateProjectKey(): GeneratedProjectKey {
    const plainText =
        KEY_PREFIX + randomBytes(RANDOM_BYTES_LENGTH).toString('base64url')

    const hash = hashProjectKey(plainText)

    return {
        plainText,
        hash,
        prefix: plainText.slice(0, DISPLAY_PREFIX_LENGTH),
    }
}
