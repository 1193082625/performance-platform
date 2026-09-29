import { describe, expect, test } from 'vitest'
import { parseCreateProjectInput } from './project-input.js'

describe('parseCreateProjectInput', () => {
    test('清洗并接受有效的项目输入', () => {
        expect(
            parseCreateProjectInput({
                name: '  官网性能监控  ',
                description: '  监控用户访问体验  ',
            }),
        ).toEqual({
            ok: true,
            value: {
                name: '官网性能监控',
                description: '监控用户访问体验',
            },
        })
    })

    test('接受空描述', () => {
        expect(
            parseCreateProjectInput({
                name: '官网性能监控',
                description: '   ',
            }),
        ).toEqual({
            ok: true,
            value: {
                name: '官网性能监控',
                description: '',
            },
        })
    })

    test('拒绝不是对象的请求体', () => {
        expect(parseCreateProjectInput(null)).toEqual({
            ok: false,
            message: '请求体必须是 JSON 对象',
        })
    })

    test('拒绝空白项目名称', () => {
        expect(
            parseCreateProjectInput({
                name: '   ',
                description: '',
            }),
        ).toEqual({
            ok: false,
            message: '项目名称不能为空',
        })
    })

    test('拒绝超过 100 个字符的项目名称', () => {
        expect(
            parseCreateProjectInput({
                name: 'a'.repeat(101),
                description: '',
            }),
        ).toEqual({
            ok: false,
            message: '项目名称不能超过 100 个字符',
        })
    })

    test('拒绝不是字符串或过长的项目描述', () => {
        expect(
            parseCreateProjectInput({
                name: '官网性能监控',
                description: 1,
            }),
        ).toEqual({
            ok: false,
            message: '项目描述必须是字符串',
        })

        expect(
            parseCreateProjectInput({
                name: '官网性能监控',
                description: 'a'.repeat(1_001),
            }),
        ).toEqual({
            ok: false,
            message: '项目描述不能超过 1000 个字符',
        })
    })
})
