import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// 计算成本参数
const SCRYPT_N = 131072
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

function deriveKey(password: string, salt: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        // 异步计算
        scrypt(
            password,
            salt,
            KEY_LENGTH,
            {
                N: SCRYPT_N,
                r: SCRYPT_R,
                p: SCRYPT_P,
                maxmem: 256 * 1024 * 1024, // 允许使用的内存上线
            },
            (error, key) => {
                if (error) {
                    reject(error)
                    return
                }

                resolve(key)
            },
        )
    })
}

export async function hashPassword(password: string): Promise<string> {
    // randomBytes(16) 生成随机盐
    const salt = randomBytes(16).toString('hex')

    const derivedKey = await deriveKey(password, salt)

    return [
        'scrypt',
        SCRYPT_N,
        SCRYPT_R,
        SCRYPT_P,
        salt,
        derivedKey.toString('hex'),
    ].join('$')
}

export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    const parts = storedHash.split('$')

    if (parts.length !== 6) {
        return false
    }

    const [algorithm, n, r, p, salt, hashHex] = parts

    if (
        algorithm !== 'scrypt' ||
        n !== String(SCRYPT_N) ||
        p !== String(SCRYPT_P) ||
        r !== String(SCRYPT_R) ||
        salt === undefined ||
        hashHex === undefined ||
        !/^[0-9a-f]{32}$/.test(salt) ||
        !/^[0-9a-f]{128}$/.test(hashHex)
    ) {
        return false
    }

    const expectedKey = Buffer.from(hashHex, 'hex')
    const actualKey = await deriveKey(password, salt)

    return timingSafeEqual(actualKey, expectedKey)
}
