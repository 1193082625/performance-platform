import type { CookieSerializeOptions } from '@fastify/cookie'

export const SESSION_COOKIE_NAME = 'pp_session'

export function createSessionCookieOptions(
    secure: boolean,
): CookieSerializeOptions {
    return {
        httpOnly: true, // 浏览器页面脚本不能通过 document.cookie 读取令牌，浏览器仍可随请求发送它
        secure, // 由外层明确传入；HTTPS 部署使用 true，本地 HTTP 调试使用 false
        sameSite: 'lax', // 限制跨站请求携带 Cookie，适合当前 Console 与 API 通过同一站点代理的方向
        path: '/monitor-api', // Cookie 用于这个路径及其子路径，覆盖登录后的管理、查询接口
    }
}
