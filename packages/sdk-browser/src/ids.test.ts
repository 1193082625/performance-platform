import {
    describe,
    expect,
    it,
    vi
} from 'vitest'

import {
    createMonitorIds,
    SESSION_ID_STORAGE_KEY,
} from './ids'

/**
 * 不使用 as const 时，大致推断为：
 *  {
 *      view: string
 *      event1: string
 *  }
 * 
 * 使用后更加精确：
 *  {
 *      readonly view: '04f080c8-...'
 *      readonly event1: '7ae498ca-...'
 *  }
 * 可以防止测试数据被意外修改
 */
const UUIDS = {
    view: '04f080c8-0625-4b76-a53e-d67f99a03380',
    session: 'c866a447-3bad-4fb8-bbab-105e4cbd92aa',
    existingSession: 'f5bacdd0-3c4c-457d-820b-ae87ae773152',
    event1: '7ae498ca-1dc3-4cf7-be84-67e3c8cd2e1a',
    event2: '178714a8-1cd5-4900-baf4-4d8761451806',
} as const

// 假的 UUID 生成器
function createRandomUUID(
    ...values: string[]
): () => string {
    // vi.fn() // 创建一个可以被 vitest 监视的假函数，它除了能被调用，还会记录：调用了几次，每次传了什么参数，每次返回了什么
    return vi.fn(() => {
        const value = values.shift()

        if (value === undefined) {
            throw new Error('No UUID prepared for this test')
        }

        return value
    })
}

describe('createMonitorIds', () => {
    it('creates a new ID for every event', () => {
        // 提供一个假的 UUID 生成器，第一次调用 -> UUIDS.view，第二次调用 -> UUIDS.event1，第三次调用 -> UUIDS.event2
        const randomUUID = createRandomUUID(
            UUIDS.view,
            UUIDS.event1,
            UUIDS.event2,
        )

        // 创建ID管理器，消耗第一个UUID作为 view ID
        // 这时就已经是第一次调用了，返回 view
        const ids = createMonitorIds({
            randomUUID
        })

        // 断言两个事件不能共用一个 ID
        // ids.createEventId() 每调用一次都生成新 UUID
        // 断言第一次创建事件ID --> event1，消耗第二个 UUID
        expect(ids.createEventId()).toBe(UUIDS.event1)
        // 断言第二次创建事件ID --> event2，消耗第三个UUID
        expect(ids.createEventId()).toBe(UUIDS.event2)
    })

    it('reuses one view ID for the monitor lifetime', () => {
        const randomUUID = createRandomUUID(UUIDS.view)
        const ids = createMonitorIds({
            randomUUID
        })

        expect(ids.getViewId()).toBe(UUIDS.view)
        expect(ids.getViewId()).toBe(UUIDS.view)
        expect(randomUUID).toHaveBeenCalledTimes(1)
    })

    it('reuse an existing session ID from sessionStorage', () => {
        const randomUUID = createRandomUUID(UUIDS.view)

        // Node 测试环境没有真实 sessionStorage，所以创建假对象
        const sessionStorage = {
            getItem: vi.fn(() => UUIDS.existingSession),
            setItem: vi.fn(), // 不真正存储，只记录调用
        }

        const ids = createMonitorIds({
            randomUUID,
            sessionStorage,
        })

        expect(ids.getSessionId()).toBe(UUIDS.existingSession)

        expect(sessionStorage.getItem).toHaveBeenCalledWith(
            SESSION_ID_STORAGE_KEY
        )

        expect(sessionStorage.setItem).not.toHaveBeenCalled()
        expect(randomUUID).toHaveBeenCalledTimes(1)
    })

    it('create and stores a session ID when none exists', () => {
        const randomUUID = createRandomUUID(
            UUIDS.view,
            UUIDS.session
        )

        // Node 测试环境没有真实 sessionStorage，所以创建假对象
        const sessionStorage = {
            getItem: vi.fn(() => null), // 永远返回 null，模拟尚无 Session ID
            setItem: vi.fn(), // 不真正存储，只记录调用
        }

        const ids = createMonitorIds({
            randomUUID,
            sessionStorage,
        })

        expect(ids.getSessionId()).toBe(UUIDS.session)

        // 断言 代码尝试将新 Session ID  写入正确的 key
        expect(sessionStorage.setItem).toHaveBeenCalledWith(
            SESSION_ID_STORAGE_KEY,
            UUIDS.session,
        )

        expect(ids.getSessionId()).toBe(UUIDS.session)
        expect(randomUUID).toHaveBeenCalledTimes(2)
    })

    it('falls back to an in-memory session when reading storage fails', () => {
        const randomUUID = createRandomUUID(
          UUIDS.view,
          UUIDS.session,
        )
    
        const sessionStorage = {
          getItem: vi.fn(() => {
            throw new Error('Storage access denied')
          }),
          setItem: vi.fn(),
        }
    
        const ids = createMonitorIds({
          randomUUID,
          sessionStorage,
        })
    
        let sessionId: string | undefined

        expect(() => {
            sessionId = ids.getSessionId()
        }).not.toThrow()

        expect(sessionId).toBe(UUIDS.session)
        expect(ids.getSessionId()).toBe(UUIDS.session)
        expect(randomUUID).toHaveBeenCalledTimes(2)
    })
    
    it('keeps the in-memory session when writing storage fails', () => {
        const randomUUID = createRandomUUID(
          UUIDS.view,
          UUIDS.session,
        )
    
        const sessionStorage = {
          getItem: vi.fn(() => null),
          setItem: vi.fn(() => {
            throw new Error('Storage access denied')
          }),
        }
    
        const ids = createMonitorIds({
          randomUUID,
          sessionStorage,
        })
    
        let sessionId: string | undefined

        expect(() => {
            sessionId = ids.getSessionId()
        }).not.toThrow()

        expect(sessionId).toBe(UUIDS.session)
        expect(ids.getSessionId()).toBe(UUIDS.session)
        expect(randomUUID).toHaveBeenCalledTimes(2)
    })

    it.each([
        '',
        '  ',
        'x'.repeat(129),
    ])('replaces unusable stored session ID %#', (storedValue) => {
        const randomUUID = createRandomUUID(
            UUIDS.view,
            UUIDS.session,
        )

        const sessionStorage = {
            getItem: vi.fn(() => storedValue),
            setItem: vi.fn(),
        }

        const ids = createMonitorIds({
            randomUUID,
            sessionStorage
        })

        expect(ids.getSessionId()).toBe(UUIDS.session)

        expect(sessionStorage.setItem).toHaveBeenCalledWith(
            SESSION_ID_STORAGE_KEY,
            UUIDS.session,
        )
    })

})