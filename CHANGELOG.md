# Changelog

本项目遵循语义化版本。日期使用项目发布时所在时区。

## [0.2.0] - 2026-09-04

### Added

- MetricEventV2 通用指标协议、运行时校验和批量接收接口。
- 基于 `sessionId` 的确定性会话采样及事件 `sampleRate` 记录。
- LCP、CLS、INP 采集、存储、聚合、Web Vitals 等级和 Console 展示。
- Chromium JS 堆内存采集、通用趋势和内存健康风险状态。
- `GET /api/v2/metrics` 通用指标查询接口。
- `GET /api/v2/memory-health` 内存健康查询接口。
- v0.2 完整采集、入库、查询和 Console 展示端到端测试。

### Changed

- 事件存储由 `paint_events` 演进为支持多指标的 `metric_events`。
- Demo Web 默认通过 `/api/v2/events/batch` 上报。
- Console 调整为统一的 Web 性能与内存监控看板。

### Compatibility

- 保留 V1 Paint 事件接收和 `GET /api/v1/metrics/paint` 查询接口。
- 内存采集依赖非标准 `performance.memory`；不支持的浏览器会安全跳过。

## [0.1.0]

- 完成 FP/FCP 从 Browser SDK 采集到 Console 展示的最小闭环。
