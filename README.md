# Performance Platform

一个可自托管的 Web 真实用户性能监控平台。v0.3 支持采集、存储、聚合和展示 FP、FCP、LCP、CLS、INP 与 Chromium JS 堆内存指标，并提供证据驱动的精准诊断和当前告警。

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

## v0.3 能力

- FP、FCP、LCP、CLS、INP 真实浏览器采集
- Chromium `performance.memory` 实验性 JS 堆快照
- `(0, 1]` 会话级确定性采样，事件记录实际 `sampleRate`
- V2 通用指标协议、批量校验和幂等事件写入
- PostgreSQL 汇总、P50/P75/P90 和时间序列查询
- Web Vitals 标准等级与通用趋势切换
- 基于 LCP 四阶段证据的版本化诊断规则和精准优化建议
- 基于 CLS 偏移来源和 INP 三阶段证据的版本化精准诊断
- 当前告警评估、数量提示和可展开诊断详情的 Console 抽屉
- 内存利用率、持续增长和样本充足度健康评估
- Web Vitals 最终生命周期结算和内存退出收尾
- Reporter 有界队列、分批排空、失败保留和指数退避重试
- 1H 分钟趋势、访问者本地实时 X 轴和稀疏采样点展示
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

如需写入包含 LCP 和 CLS 精准诊断场景的确定性演示数据：

```bash
corepack pnpm --filter @performance-platform/server seed:demo
```

脚本会写入 LCP 四阶段瓶颈，以及 CLS 加载期偏移、晚期偏移和重复偏移元素样本。组合数据会为两项指标生成稳定的首要建议。

## 主要接口

| 接口 | 用途 |
|---|---|
| `POST /api/v2/events/batch` | 接收 V2 指标事件批次 |
| `GET /api/v1/metrics/paint` | 查询兼容的 FP/FCP 聚合结果 |
| `GET /api/v2/metrics?type=...` | 查询单个通用指标的摘要和趋势 |
| `GET /api/v2/diagnostics/lcp` | 查询 LCP 四阶段证据和版本化诊断结论 |
| `GET /api/v2/diagnostics/cls` | 查询 CLS 偏移来源和版本化诊断结论 |
| `GET /api/v2/diagnostics/inp` | 查询 INP 三阶段证据和版本化诊断结论 |
| `GET /api/v2/memory-health` | 查询服务端计算的内存健康状态 |
| `GET /api/v2/alerts/evaluate` | 评估当前范围内的指标告警和诊断证据 |
| `GET /health` | 服务健康检查 |

## 文档

- [总体架构](docs/总体架构.md)
- [性能指标与数据口径](docs/性能指标与数据口径.md)
- [Browser SDK 接入指南](docs/getting-started/mvp-sdk-integration.md)
- [本地部署与验收](docs/operations/mvp-deployment.md)
- [INP 采集与上报流程](docs/INP采集与上报流程.md)
- [V2 指标存储 ADR](docs/ADR-001-v2-metric-storage.md)

## 版本边界

v0.3 仍采用单应用、免登录模式。账号、团队、项目管理、外部通知、版本对比和多租户权限不属于本版本。

## License

MIT
