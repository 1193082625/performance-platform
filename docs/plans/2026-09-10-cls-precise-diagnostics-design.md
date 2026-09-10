# CLS 精准诊断设计

## 目标

在现有 CLS 指标链路上增加可验证的布局偏移证据、服务端聚合诊断和 Console 精准建议，并复用 LCP 已建立的版本化 finding 模式。

## 数据流

1. Browser SDK 使用 `web-vitals/attribution/onCLS` 获取最大布局偏移来源。
2. V2 事件携带最大偏移元素、偏移时间、单次分值、页面加载阶段和前后矩形。
3. PostgreSQL 聚合总样本、证据覆盖率、加载阶段分布和高频目标元素。
4. 规则层只根据可观测证据生成 `early-load-shift`、`late-layout-shift` 和 `repeated-shift-target` finding。
5. Console 按规则优先级展示一条主要建议；证据不足时回退到通用 CLS 建议。

## 可靠性边界

首版不直接断言图片缺少尺寸、字体切换或动态 DOM 是根因，因为 Layout Shift API 只能证明发生偏移的元素和时机。后续可通过额外 DOM、资源和字体证据增加专项规则。

## 实施步骤

1. 扩展协议和 Browser SDK 归因采集，并完成校验测试。
2. 增加 CLS 诊断聚合、版本化规则和 `/api/v2/diagnostics/cls`。
3. 接入 Console 精准建议及中英文文案。
4. 增加确定性演示数据和端到端验收。
