# FP/FCP MVP 本地部署

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

Console 应显示 Demo 上报的 FP、FCP 指标。

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

1. Demo 产生真实 FP 和 FCP。
2. Browser SDK 通过 Beacon 上报事件。
3. Server 接收并存储事件。
4. 指标接口返回新增数据。
5. Console 展示 FP、FCP 和总体评分。

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
