# Browser SDK 接入指南

本文介绍如何在当前 pnpm workspace 中接入 `@performance-platform/browser`，采集并上报真实的 FP/FCP 指标。

## 前置条件

接入前需要确认：

- Performance Platform Server 已启动；
- 接入应用的地址已加入 Server 的 `CORS_ORIGINS`；
- SDK 的 `appId` 与 Server 的 `APP_ID` 完全一致；
- 浏览器支持 `PerformanceObserver`。

## 安装 SDK

在当前 monorepo 中，通过 workspace 协议添加依赖：

```bash
corepack pnpm \
  --filter <应用包名称> \
  add '@performance-platform/browser@workspace:*'
```

例如 Demo Web：

```bash
corepack pnpm \
  --filter @performance-platform/demo-web \
  add '@performance-platform/browser@workspace:*'
```

当前 v0.1 的 Browser SDK 尚未发布到公共 npm 仓库。

## 初始化

在应用入口尽早创建并启动 Monitor：

```ts
import {
    createPaintMonitor,
} from '@performance-platform/browser'

const paintMonitor = createPaintMonitor({
    endpoint:
        'http://localhost:3000/api/v1/events/batch',
    appId: 'demo-web',
    appVersion: '0.1.0',
    environment: 'development',
    debug: (message, error) => {
        console.debug(
            `[performance-platform] ${message}`,
            error,
        )
    },
})

paintMonitor.start()
```

Monitor 应尽早启动，以便通过 `PerformanceObserver` 的 buffered 模式读取浏览器已经产生的 Paint 条目。

## 配置项

| 配置 | 类型 | 说明 |
|---|---|---|
| `endpoint` | `string` | Server 批量事件上报地址 |
| `appId` | `string` | 应用标识，必须与 Server 的 `APP_ID` 一致 |
| `appVersion` | `string` | 当前应用版本 |
| `environment` | `string` | `development`、`test`、`staging` 或 `production` |
| `debug` | `function` | 可选的 SDK 诊断回调 |

## 使用环境变量

Vite 应用可以通过环境变量提供配置：

```env
VITE_MONITOR_ENDPOINT=http://localhost:3000/api/v1/events/batch
VITE_APP_ID=demo-web
VITE_APP_VERSION=0.1.0
VITE_APP_ENVIRONMENT=development
```

初始化代码：

```ts
import {
    createPaintMonitor,
} from '@performance-platform/browser'

const paintMonitor = createPaintMonitor({
    endpoint: import.meta.env.VITE_MONITOR_ENDPOINT,
    appId: import.meta.env.VITE_APP_ID,
    appVersion: import.meta.env.VITE_APP_VERSION,
    environment: import.meta.env.VITE_APP_ENVIRONMENT,
})

paintMonitor.start()
```

实际项目应在创建 Monitor 前验证必需的环境变量。Demo Web 的实现可以作为参考：

```text
apps/demo-web/src/monitor-config.ts
```

## Monitor 生命周期

### `start()`

```ts
paintMonitor.start()
```

启动 FP/FCP 采集并注册页面生命周期监听。重复调用不会重复启动采集器或重复注册监听器。

### `flush()`

```ts
await paintMonitor.flush()
```

立即尝试发送当前等待上报的事件。通常不需要手动调用，因为 SDK 会在 Paint 条目处理完成和页面隐藏时自动刷新。

### `destroy()`

```ts
paintMonitor.destroy()
```

停止采集并移除页面生命周期监听器。Monitor 销毁后不能重新启动。

## 上报行为

SDK 会：

1. 使用 `PerformanceObserver` 读取 `first-paint` 和 `first-contentful-paint`；
2. 将它们映射为 `web.paint.fp` 和 `web.paint.fcp`；
3. 为事件生成 `eventId`、`sessionId` 和 `viewId`；
4. 优先通过 `navigator.sendBeacon()` 上报；
5. Beacon 不可用或拒绝请求时，回退到带 `keepalive` 的 `fetch()`；
6. 在网络失败时保留当前批次，不影响业务页面运行。

每个批次最多包含 20 个事件。

## 验证上报

打开接入 SDK 的页面，然后查询指标接口：

```bash
curl --noproxy '*' \
  --silent \
  http://localhost:3000/api/v1/metrics/paint
```

也可以通过 Console 查看：

```text
http://localhost:4173
```

## 常见问题

### Console 没有数据

依次检查：

1. 浏览器 Network 面板中是否出现 `POST /api/v1/events/batch`；
2. 上报接口是否返回 HTTP 200；
3. SDK 的 `appId` 是否与 Server 的 `APP_ID` 一致；
4. Demo 地址是否包含在 `CORS_ORIGINS` 中；
5. 查询时间范围是否覆盖事件产生时间；
6. 浏览器和 Docker 容器的系统时间是否正确。

### 请求返回 `INVALID_BATCH`

确认请求体结构为：

```json
{
  "events": [
    {
      "schemaVersion": "1.0"
    }
  ]
}
```

Browser SDK 会自动生成完整事件。手动调用接口时必须提供符合协议的完整字段。

### 页面关闭时请求使用 `text/plain`

这是 `navigator.sendBeacon()` 发送字符串数据时的正常行为。Server 已兼容 `text/plain` JSON 请求体。

### Server 暂时不可用

SDK 会隔离传输异常，不让监控故障影响业务页面。Server 恢复后刷新页面，可以重新采集并上报 FP/FCP。
