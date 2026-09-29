import { expect, test } from 'vitest'
import { parseLoginInput } from './login-input.js'

const VALID_INPUT = {
    phone: '13800000000',
    password: 'test-password',
}

test('整理手机号、保留密码原样，并排除额外字段', () => {
    expect(
        parseLoginInput({
            phone: ' 13800000000 ',
            password: '  secret  ',
            userId: '42',
        }),
    ).toEqual({
        ok: true,
        value: {
            phone: '13800000000',
            password: '  secret  ',
        },
    })
})

test.each([
    { label: '缺少请求体', value: undefined },
    { label: 'null', value: null },
    { label: '数组', value: [] },
    { label: '字符串', value: 'invalid' },
    { label: '数字', value: 123 },
])('$label 请求体被拒绝', ({ value }) => {
    expect(parseLoginInput(value).ok).toBe(false)
})

test.each(['phone', 'password'] as const)(
    '%s 缺少或类型错误时被拒绝',
    (field) => {
        for (const value of [undefined, null, 123, [], {}]) {
            expect(
                parseLoginInput({
                    ...VALID_INPUT,
                    [field]: value,
                }).ok,
            ).toBe(false)
        }
    },
)

test.each([
    '',
    '   ',
    '12800000000',
    '1380000000',
    '138000000000',
    '1380000000a',
    '138 00000000',
])('无效手机号被拒绝：%j', (phone) => {
    expect(parseLoginInput({ ...VALID_INPUT, phone }).ok).toBe(false)
})

test.each([1, 5, 128])('长度为 %i 的密码允许进入登录校验', (length) => {
    const password = 'a'.repeat(length)

    expect(parseLoginInput({ ...VALID_INPUT, password })).toEqual({
        ok: true,
        value: {
            phone: VALID_INPUT.phone,
            password,
        },
    })
})

test.each([0, 129])('密码长度 %i 被拒绝', (length) => {
    expect(
        parseLoginInput({
            ...VALID_INPUT,
            password: 'a'.repeat(length),
        }).ok,
    ).toBe(false)
})
