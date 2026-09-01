# Performance Platform

一个可自托管的 Web 性能监控平台。当前 v0.1 支持采集、存储、聚合和展示 FP/FCP 指标。

## 完整链路

```text
浏览器产生 FP/FCP
        ↓
PerformanceObserver
        ↓
Browser SDK
        ↓
构造并校验 PaintEventV1
        ↓
Reporter 批量上报
        ↓
Server
        ↓
PostgreSQL
        ↓
Metrics API
        ↓
Console
```

## 项目结构

```text
apps/
  console/       性能数据控制台
  demo-web/      Browser SDK 接入示例
  server/        事件接收和指标查询服务

packages/
  protocol/      事件协议、类型和校验逻辑
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

详细步骤参见：

- [FP/FCP MVP 本地部署](docs/operations/mvp-deployment.md)

## 开发验证

运行单元测试和接口测试：

```bash
corepack pnpm test
```

运行类型检查：

```bash
corepack pnpm typecheck
```

构建所有 workspace：

```bash
corepack pnpm build
```

保持 Docker Compose 服务运行，然后执行端到端测试：

```bash
corepack pnpm test:e2e
```

## 当前能力

v0.1 已实现：

- 使用 `PerformanceObserver` 采集真实 FP/FCP
- Browser SDK 批量上报和 Beacon 自动刷新
- 事件协议与运行时校验
- PostgreSQL 事件持久化
- FP/FCP 汇总、百分位数和时间序列查询
- Console 指标卡片、趋势图和性能评分
- Docker Compose 一键部署
- Playwright 完整链路测试

## 文档

- [总体架构](docs/总体架构.md)
- [性能指标与数据口径](docs/性能指标与数据口径.md)
- [FP/FCP MVP 0.1 技术方案](docs/FP-FCP%20MVP%200.1%20技术方案.md)
- [Browser SDK 接入指南](docs/getting-started/mvp-sdk-integration.md)
- [本地部署与运行](docs/operations/mvp-deployment.md)

## License

MIT
