# Performance Platform

一个可自托管的 Web 真实用户性能监控平台。v0.2 支持采集、存储、聚合和展示 FP、FCP、LCP、CLS、INP 与 Chromium JS 堆内存指标。

## 完整链路

```text
浏览器 Performance API / web-vitals / performance.memory
        ↓
Browser SDK（会话级确定性采样）
        ↓
构造并校验 MetricEventV2
        ↓
Reporter 批量上报 / Beacon 与 fetch 降级
        ↓
Server → PostgreSQL metric_events
        ↓
Paint 查询 / 通用指标查询 / 内存健康评估
        ↓
Console 指标卡片、等级、趋势图和内存状态
```

## v0.2 能力

- FP、FCP、LCP、CLS、INP 真实浏览器采集
- Chromium `performance.memory` 实验性 JS 堆快照
- `(0, 1]` 会话级确定性采样，事件记录实际 `sampleRate`
- V2 通用指标协议、批量校验和幂等事件写入
- PostgreSQL 汇总、P50/P75/P90 和时间序列查询
- Web Vitals 标准等级与通用趋势切换
- 内存利用率、持续增长和样本充足度健康评估
- Docker Compose 一键部署及 Playwright 完整链路测试

内存状态用于风险提示，不能单独证明发生了内存泄漏。该能力依赖 Chromium 的非标准 `performance.memory`，不支持时 SDK 会安全跳过。

## 项目结构

```text
apps/
  console/       性能数据控制台
  demo-web/      Browser SDK 接入与异常场景示例
  server/        事件接收、存储和指标查询服务

packages/
  protocol/      V1/V2 协议、指标口径、阈值和校验
  sdk-browser/   浏览器性能采集 SDK

deploy/          Docker Compose 部署配置
docs/            产品、架构、指标口径和部署文档
tests/e2e/       Playwright 端到端测试
```

## 环境要求

- Node.js `>=24.19.0 <25`
- pnpm `>=10.34.5 <11`
- Docker Desktop 或兼容的 Docker Engine
- Docker Compose v2

## 安装依赖

```bash
corepack pnpm install
```

## 本地 Docker 部署

```bash
cp deploy/.env.example deploy/.env

docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  up -d --build
```

服务地址：

- Demo Web：<http://localhost:5173>
- Console：<http://localhost:4173>
- Server 健康检查：<http://localhost:3000/health>

详细步骤参见[本地部署与验收](docs/operations/mvp-deployment.md)。

## 开发验证

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

保持 Docker Compose 服务运行后执行：

```bash
corepack pnpm test:e2e
```

## 主要接口

| 接口 | 用途 |
|---|---|
| `POST /api/v2/events/batch` | 接收 V2 指标事件批次 |
| `GET /api/v1/metrics/paint` | 查询兼容的 FP/FCP 聚合结果 |
| `GET /api/v2/metrics?type=...` | 查询单个通用指标的摘要和趋势 |
| `GET /api/v2/memory-health` | 查询服务端计算的内存健康状态 |
| `GET /health` | 服务健康检查 |

## 文档

- [总体架构](docs/总体架构.md)
- [性能指标与数据口径](docs/性能指标与数据口径.md)
- [Browser SDK 接入指南](docs/getting-started/mvp-sdk-integration.md)
- [本地部署与验收](docs/operations/mvp-deployment.md)
- [INP 采集与上报流程](docs/INP采集与上报流程.md)
- [V2 指标存储 ADR](docs/ADR-001-v2-metric-storage.md)

## 版本边界

v0.2 仍采用单应用、免登录模式。账号、团队、项目管理、外部告警、版本对比和多租户权限不属于本版本。

## License

MIT
