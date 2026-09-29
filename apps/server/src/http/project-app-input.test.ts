import { describe, expect, test } from 'vitest'
import { parseCreateProjectAppInput } from './project-app-input.js'

describe('parseCreateProjectAppInput', () => {
    test('清洗名称并接受允许的平台', () => {
        expect(
            parseCreateProjectAppInput({
                name: '  官网 Web 端  ',
                platform: 'web',
            }),
        ).toEqual({
            ok: true,
            value: {
                name: '官网 Web 端',
                platform: 'web',
            },
        })
    })

    test('接受全部允许的平台', () => {
        for (const platform of [
            'web',
            'ios',
            'android',
            'mini_program_zfb',
            'mini_program_wx',
        ]) {
            expect(
                parseCreateProjectAppInput({
                    name: '测试应用',
                    platform,
                }),
            ).toMatchObject({ ok: true })
        }
    })

    test('拒绝不是对象的请求体', () => {
        expect(parseCreateProjectAppInput(null)).toEqual({
            ok: false,
            message: '请求体必须是 JSON 对象',
        })
    })

    test('拒绝空白或超长应用名称', () => {
        expect(
            parseCreateProjectAppInput({
                name: '   ',
                platform: 'web',
            }),
        ).toEqual({
            ok: false,
            message: '应用名称不能为空',
        })

        expect(
            parseCreateProjectAppInput({
                name: 'a'.repeat(101),
                platform: 'web',
            }),
        ).toEqual({
            ok: false,
            message: '应用名称不能超过 100 个字符',
        })
    })

    test('拒绝未知平台', () => {
        expect(
            parseCreateProjectAppInput({
                name: '测试应用',
                platform: 'desktop',
            }),
        ).toEqual({
            ok: false,
            message: '应用平台不受支持',
        })
    })
})
