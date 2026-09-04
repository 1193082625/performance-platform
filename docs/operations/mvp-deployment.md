# v0.2 本地部署与验收

## 前置条件

- Docker Desktop 或兼容的 Docker Engine
- Docker Compose v2
- 可用端口：
  - `3000`：Server
  - `4173`：Console
  - `5173`：Demo Web

所有命令都在项目根目录执行。

## 配置

复制本地配置示例：

```bash
cp deploy/.env.example deploy/.env
```

默认配置可直接用于本地验证。必要时可以修改 `deploy/.env` 中的端口、数据库凭据和应用信息。

## 构建并启动

```bash
docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  up -d --build
```

该命令会启动：

- PostgreSQL
- 数据库迁移任务
- Server
- Console
- Demo Web

`migrate` 是一次性任务，迁移成功后显示 `Exited (0)` 属于正常状态。

## 检查服务状态

```bash
docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  ps -a
```

预期结果：

- `postgres`：healthy
- `server`：healthy
- `console`：healthy
- `demo-web`：healthy
- `migrate`：Exited (0)

检查迁移日志：

```bash
docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  logs migrate
```

检查 Server：

```bash
curl --noproxy '*' \
  --fail \
  --show-error \
  http://localhost:3000/health
```

预期响应：

```json
{"status":"ok"}
```

## 验证完整链路

在浏览器中打开 Demo：

```text
http://localhost:5173
```

然后打开 Console：

```text
http://localhost:4173
```

在 Demo 页面等待布局偏移内容出现，并点击 `Simulate slow interaction` 触发一次 INP。切换到 Console 后，应看到 FP、FCP、LCP、CLS、INP、三个内存指标及内存健康状态。

也可以直接查询指标接口：

```bash
curl --noproxy '*' \
  --silent \
  http://localhost:4173/api/v1/metrics/paint
```

## 运行端到端测试

保持 Compose 服务运行，然后执行：

```bash
corepack pnpm test:e2e
```

该测试会验证：

1. Demo 产生真实 FP、FCP、LCP、CLS、INP 和可用的内存快照。
2. Browser SDK 通过 V2 批量接口上报事件。
3. Server 接收并存储事件。
4. Paint 和通用指标接口返回新增数据。
5. Console 展示全部指标、趋势切换和内存状态。

内存数据依赖 Chromium。页面切换到 Console 时，SDK 会利用页面隐藏生命周期刷新当前快照，因此无需等待默认的 5 分钟上报周期。

## 停止服务

停止并删除容器和网络，但保留数据库数据：

```bash
docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  down
```

## 清除数据库数据

如果需要重新验证空数据库迁移，可以同时删除数据卷：

```bash
docker compose \
  --env-file deploy/.env \
  -f deploy/docker-compose.yml \
  down --volumes
```

该操作会永久删除当前 Compose PostgreSQL 数据。
