# Browser SDK 接入指南

本文介绍如何在当前 pnpm workspace 中接入 `@performance-platform/browser`，采集并上报真实的 FP、FCP、LCP、CLS、INP 和实验性 JS 堆内存指标。

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

当前 Browser SDK 尚未发布到公共 npm 仓库。

## 初始化

在应用入口尽早创建并启动 Monitor：

```ts
import {
    createPaintMonitor,
} from '@performance-platform/browser'

const paintMonitor = createPaintMonitor({
    endpoint:
        'http://localhost:3000/api/v2/events/batch',
    appId: 'demo-web',
    appVersion: '0.2.0',
    environment: 'development',
    sampleRate: 1,
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
| `sampleRate` | `number` | 可选，会话采样率，范围为 `(0, 1]`，默认值为 `1` |
| `debug` | `function` | 可选的 SDK 诊断回调 |

SDK 根据 `sessionId` 进行确定性会话采样。同一个会话在采样率不变时会始终得到相同结果；命中的会话上报全部已启用指标，未命中的会话不启动采集器。

## 使用环境变量

Vite 应用可以通过环境变量提供配置：

```env
VITE_MONITOR_ENDPOINT=http://localhost:3000/api/v2/events/batch
VITE_APP_ID=demo-web
VITE_APP_VERSION=0.2.0
VITE_APP_ENVIRONMENT=development
VITE_MONITOR_SAMPLE_RATE=1
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
    sampleRate: Number(
        import.meta.env.VITE_MONITOR_SAMPLE_RATE,
    ),
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

启动 FP/FCP、LCP、CLS、INP 和可用时的内存采集，并注册页面生命周期监听。重复调用不会重复启动采集器或重复注册监听器。

### `flush()`

```ts
await paintMonitor.flush()
```

立即尝试发送当前等待上报的事件，同时刷新最新的内存快照。通常不需要手动调用，因为 SDK 会在 Paint 条目处理完成、Web Vital 固化、内存上报周期或页面隐藏时自动刷新。

### `destroy()`

```ts
paintMonitor.destroy()
```

停止采集并移除页面生命周期监听器。Monitor 销毁后不能重新启动。

## 上报行为

SDK 会：

1. 使用 `PerformanceObserver` 读取 `first-paint` 和 `first-contentful-paint`；
2. 使用 `web-vitals` 计算当前 view 的 LCP、CLS 和 INP；
3. 在 Chromium 支持时每 30 秒读取一次 JS 堆快照，并每 5 分钟或页面隐藏时上报最新值；
4. 将指标映射为 Paint、Web Vital 或内存类型；
5. 根据 `sessionId` 和 `sampleRate` 决定整个会话是否采集；
6. 为命中会话的事件生成 `eventId`、`sessionId` 和 `viewId`；
7. 生成 `schemaVersion: '2.0'` 事件，指标版本分别为 `paint-v1`、`lcp-v1`、`cls-v1`、`inp-v1` 或 `memory-v1`；
8. 优先通过 `navigator.sendBeacon()` 上报；
9. Beacon 不可用或拒绝请求时，回退到带 `keepalive` 的 `fetch()`；
10. 在网络失败时保留当前批次，不影响业务页面运行。

每个批次最多包含 20 个事件。

如果当前浏览器不支持某项 Performance API，SDK 会单独跳过该指标，不影响其他采集器和业务页面运行。INP 只有发生有效交互后才会产生；`performance.memory` 目前主要由 Chromium 提供。

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

Paint 查询接口只返回 FP/FCP。验证其他指标时，可以查询通用接口：

```bash
curl --get --silent \
  --data-urlencode 'type=web.vital.lcp' \
  http://localhost:3000/api/v2/metrics
```

也可以在浏览器 Network 面板中检查发送到 `/api/v2/events/batch` 的事件是否包含：

```json
{
  "type": "web.vital.lcp",
  "metricVersion": "lcp-v1",
  "payload": {
    "value": 2500,
    "unit": "ms"
  }
}
```

也可以直接查询数据库：

```bash
docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  exec postgres \
  psql \
  -U postgres \
  -d performance_platform \
  -c "
    SELECT
      event_type,
      metric_value,
      metric_unit,
      metric_version,
      sample_rate,
      event_time
    FROM metric_events
    WHERE event_type IN (
      'web.vital.lcp',
      'web.vital.cls',
      'web.vital.inp',
      'web.memory.used_heap'
    )
    ORDER BY received_at DESC
    LIMIT 10;
  "
```

如果 `deploy/.env` 修改了 `POSTGRES_USER` 或 `POSTGRES_DB`，命令中的用户名和数据库名也需要对应调整。

## 常见问题

### Console 没有数据

依次检查：

1. 浏览器 Network 面板中是否出现 `POST /api/v2/events/batch`；
2. 上报接口是否返回 HTTP 200；
3. 响应中的 `accepted` 是否大于 `0`，以及 `reasons` 是否包含丢弃原因；
4. SDK 的 `appId` 是否与 Server 的 `APP_ID` 一致；
5. Demo 地址是否包含在 `CORS_ORIGINS` 中；
6. 当 `sampleRate < 1` 时，当前会话是否未命中采样；
7. 查询时间范围是否覆盖事件产生时间；
8. 浏览器和 Docker 容器的系统时间是否正确。

### 请求返回 `INVALID_BATCH`

确认请求体包含一个非空 `events` 数组，且事件数不超过 20：

```json
{
  "events": [
    {
      "schemaVersion": "2.0",
      "sampleRate": 1,
      "metricVersion": "paint-v1"
    }
  ]
}
```

上面只展示了 V2 版本相关字段，不是可直接提交的完整事件。Browser SDK 会自动生成完整事件；手动调用接口时必须提供符合协议的全部字段。如果批次结构有效但单条事件无效，Server 会返回 HTTP 200，并通过 `discarded` 和 `reasons` 说明丢弃结果。

### 页面关闭时请求使用 `text/plain`

这是 `navigator.sendBeacon()` 发送字符串数据时的正常行为。Server 已兼容 `text/plain` JSON 请求体。

### Server 暂时不可用

SDK 会隔离传输异常，不让监控故障影响业务页面。Server 恢复后刷新页面，可以重新开始采集和上报。
