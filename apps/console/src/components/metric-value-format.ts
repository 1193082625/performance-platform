
const BYTE_UNITS = [
    'B',
    'KiB',
    'MiB',
    'GiB',
    'TiB',
] as const

export function formatBytes(
    value: number
): string {
    if (!Number.isFinite(value) || value < 0) {
        return '—'
    }

    if (value === 0) {
        return '0 B'
    }

    // Math.log(x) ： 计算x的自然对数
    // 这里利用换底公式计算以 1024 为底的对数 Math.log(value) / Math.log(1024)
    /**
     * 也就是计算 1024 需要乘方多少次，才能接近 value
     * 例如： Math.log(1024 ** 2) / Math.log(1024) => 2，因为 1024² = 1 MiB
     * 得到的数字正好可以作为单位数组的下标
     */
    const unitIndex = Math.min(
        Math.floor(Math.log(value) / Math.log(1024)),
        BYTE_UNITS.length - 1
    )

    const scaledValue = value / 1024 ** unitIndex

    // toLocalString() 增加本地化的千位分隔
    const formattedValue = Number(
        scaledValue.toFixed(2)
    ).toLocaleString()

    return `${formattedValue} ${BYTE_UNITS[unitIndex]}`
}

// 给趋势图提供统一的数值坐标
export function bytesToMebibytes(
    value: number
): number {
    return Number(
        (value / 1024 ** 2).toFixed(1)
    )
}