# Changelog

本项目遵循语义化版本。日期使用项目发布时所在时区。

## [0.3.0] - 2026-09-11

### Added

- LCP 四阶段、CLS 偏移来源和 INP 三阶段的版本化精准诊断证据与建议。
- 当前告警评估接口和 Console 告警数量、右侧抽屉及诊断详情。
- Reporter 有界队列、分批排空、事件过期、失败保留、指数退避重试和安全调试回调。
- Web Vitals 最终生命周期结算，以及页面隐藏、退出和销毁时的内存收尾上报。

### Changed

- 内存健康查询跟随 Console 的 1h、24h、7d 和 30d 时间范围。
- 1H 趋势按分钟分桶，X 轴使用访问者本地实时的一小时窗口。
- 稀疏趋势保留缺失区间并显示独立采样点，不再产生看似空白的图表。

### Fixed

- 修复 1H 范围查询、空状态、内存趋势和 X 轴时间展示不一致的问题。
- 修复 Reporter 并发 flush、飞行中入队和传输失败时可能丢失队列事件的问题。

### Compatibility

- 保持 V1 Paint 接口和 v0.2 MetricEventV2 数据兼容。
- 本版本仍为单应用、免登录部署；不包含外部通知和持久化告警生命周期。

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
