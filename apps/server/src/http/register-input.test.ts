import { expect, test } from 'vitest'
import { parseRegisterInput } from './register-input.js'

const VALID_INPUT = {
    name: '测试用户',
    phone: '13800000000',
    password: 'test-password',
}

test('整理姓名和手机号，保留密码原样，并排除额外字段', () => {
    const password = '  secret  '

    expect(
        parseRegisterInput({
            name: '  测试用户  ',
            phone: ' 13800000000 ',
            password,
            role: 'admin',
        }),
    ).toEqual({
        ok: true,
        value: {
            name: '测试用户',
            phone: '13800000000',
            password,
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
    expect(parseRegisterInput(value).ok).toBe(false)
})

test.each(['name', 'phone', 'password'] as const)(
    '%s 缺少或类型错误时被拒绝',
    (field) => {
        for (const value of [undefined, null, 123, [], {}]) {
            expect(
                parseRegisterInput({
                    ...VALID_INPUT,
                    [field]: value,
                }).ok,
            ).toBe(false)
        }
    },
)

test.each([1, 50])('姓名长度 %i 被接受', (length) => {
    expect(
        parseRegisterInput({
            ...VALID_INPUT,
            name: '名'.repeat(length),
        }).ok,
    ).toBe(true)
})

test.each(['', '   ', '名'.repeat(51)])('无效姓名被拒绝：%j', (name) => {
    expect(parseRegisterInput({ ...VALID_INPUT, name }).ok).toBe(false)
})

test.each([
    '12800000000',
    '1380000000',
    '138000000000',
    '1380000000a',
    '138 00000000',
])('无效手机号被拒绝：%s', (phone) => {
    expect(parseRegisterInput({ ...VALID_INPUT, phone }).ok).toBe(false)
})

test.each([6, 128])('密码长度 %i 被接受', (length) => {
    expect(
        parseRegisterInput({
            ...VALID_INPUT,
            password: 'a'.repeat(length),
        }).ok,
    ).toBe(true)
})

test.each([0, 5, 129])('密码长度 %i 被拒绝', (length) => {
    expect(
        parseRegisterInput({
            ...VALID_INPUT,
            password: 'a'.repeat(length),
        }).ok,
    ).toBe(false)
})
