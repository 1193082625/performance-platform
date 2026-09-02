# ADR-001：V2 通用指标存储
- 状态：已接受
- 日期：2026-09-02
- 适用版本：V2

## 背景

现有 paint_events 只能保存 FP/FCP 和毫秒值。
V2 需要保存 Web Vitals、内存、采样率和指标算法版本。

## 备选方案

1. 直接扩展并重命名 paint_events
2. 新增 metric_events，与 paint_events 并存
3. 每类指标建立独立表

## 决策

采用方案 1：通过 002 migration 将 paint_events 演进为 metric_events。

## 原因

- 保留现有事件和查询能力
- 避免 V1/V2 数据分裂
- 保持单一幂等键和查询入口
- 当前为单机 MVP，不需要为每类指标拆表

## 约束

- 必须保留现有 V1 FP/FCP 数据。
- 现有 FP/FCP 查询结果必须保持一致。
- `event_id` 继续作为全局幂等键。
- 同一张表需要支持 `ms`、`score` 和 `byte`。
- 数据库约束应与协议层的核心值域一致。
- 当前采用 Docker Compose 单实例部署，不要求旧版与新版 Server 同时运行。

## 目标数据模型

`paint_events` 重命名为 `metric_events`。

- `value_ms` 重命名为 `metric_value`。
- 新增 `metric_unit`，支持 `ms | score | byte`。
- 新增 `sample_rate`，范围为 `(0, 1]`。
- 新增 `metric_version`，记录指标计算规则版本。
- 扩展 `event_type`，支持 FP、FCP、LCP、CLS、INP 和内存指标。

## V1 数据回填

已有 FP/FCP 事件使用以下值回填：

- `metric_unit = 'ms'`
- `sample_rate = 1`
- `metric_version = 'paint-v1'`
- `schema_version` 保持原来的 `'1.0'`

## 后果

### 正面

- V1 和 V2 使用统一事件表。
- 保留单一事件幂等约束和查询入口。
- FP/FCP 查询不需要跨表合并。
- 后续新增指标可以复用相同 Repository。

### 负面

- 表名和列名变化后，旧版 Server 无法继续工作。
- 新指标类型仍需同步更新数据库 CHECK 约束。
- 单表承载多种单位，查询时必须同时考虑指标类型和单位。
- 迁移执行期间会获取表级锁；当前 MVP 数据规模下可以接受。

## 部署与失败处理

当前迁移执行器会为每个 SQL 文件开启事务：

1. `BEGIN`
2. 执行迁移 SQL
3. 写入 `schema_migrations`
4. `COMMIT`

任一步失败都会 `ROLLBACK`，因此不会留下半迁移状态。

部署顺序：

1. 备份数据库。
2. 停止旧版 Server。
3. 执行 002 migration。
4. 启动支持 `metric_events` 的新版 Server。
5. 验证 V1 FP/FCP 查询和 V2 写入。

当前不提供自动 down migration。失败恢复方式为事务回滚；迁移已经提交后的恢复依赖数据库备份和 `v0.1.0` 代码版本。
