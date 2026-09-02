/**
 * 得到 [0, 1) 的采样值
 * 
 * 例如某个会话的值为 0.63：
    sampleRate 0.5  → 不采样
    sampleRate 0.75 → 采样
    sampleRate 1    → 采样
    这保证了采样集合的单调性。
 */
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193
const UINT32_RANGE = 0x1_0000_0000

function validateSampleRate(
    sampleRate: number,
): void {
    if (
        !Number.isFinite(sampleRate)
        || sampleRate <= 0
        || sampleRate > 1
    ) {
        throw new RangeError(
            'sampleRate must be greater than 0 and less than or equal to 1',
        )
    }
}

export function shouldSampleSession(
    sessionId: string,
    sampleRate: number,
): boolean {
    validateSampleRate(sampleRate)

    if (sampleRate === 1) {
        return true
    }

    let hash = FNV_OFFSET_BASIS

    for (
        let index = 0;
        index < sessionId.length;
        index += 1
    ) {
        hash ^= sessionId.charCodeAt(
            index,
        )

        // 执行 32 位整数乘法
        hash = Math.imul(
            hash,
            FNV_PRIME,
        )
    }

    // hash >>> 0 把有符号 32 位整数转换成无符号整数，范围变成： 0 ～ 4,294,967,295
    const sampleValue =
        (hash >>> 0) / UINT32_RANGE

    return sampleValue < sampleRate
}