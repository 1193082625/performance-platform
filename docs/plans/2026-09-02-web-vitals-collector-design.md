# Web Vitals Collector 设计

## 状态

已确认，2026-09-02。

## 目标

在现有会话级采样和 V2 指标上报链路中，依次接入 LCP、CLS 和 INP。

## 关键决策

- 使用 `web-vitals` 作为指标计算实现。
- SDK 通过薄适配器注入 `onLCP`、`onCLS` 和 `onINP`。
- Collector 不直接依赖第三方模块，便于测试和替换。
- 默认只上报每个 view 的最终指标，不启用 `reportAllChanges`。
- 未命中会话采样时不启动任何 Collector。
- 所有指标复用现有 Reporter 和 V2 endpoint。

## 事件构造

将 `createPaintEvent` 重构为 `createMetricEvent`。

Collector 输出判别联合类型 `MetricSample`；事件工厂统一补充：

- `schemaVersion`
- `eventId`
- `application`
- `runtime`
- `session`
- `sampleRate`

指标映射：

| 指标 | 类型 | 单位 | 算法版本 |
|---|---|---|---|
| FP/FCP | `web.paint.*` | `ms` | `paint-v1` |
| LCP | `web.vital.lcp` | `ms` | `lcp-v1` |
| CLS | `web.vital.cls` | `score` | `cls-v1` |
| INP | `web.vital.inp` | `ms` | `inp-v1` |

## LCP 数据流

```text
web-vitals onLCP
→ LcpCollector
→ MetricSample
→ createMetricEvent
→ Reporter
→ POST /api/v2/events/batch
