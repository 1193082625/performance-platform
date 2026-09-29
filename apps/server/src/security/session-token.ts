import { createHash, randomBytes } from 'crypto'

const SESSION_TOKEN_BYTES_LENGTH = 32

export interface GeneratedSessionToken {
    plainText: string
    hash: string
}

export function hashSessionToken(plainText: string): string {
    return createHash('sha256').update(plainText).digest('hex')
}

export function generateSessionToken(): GeneratedSessionToken {
    const plainText = randomBytes(SESSION_TOKEN_BYTES_LENGTH).toString(
        'base64url',
    )

    return {
        plainText,
        hash: hashSessionToken(plainText),
    }
}
