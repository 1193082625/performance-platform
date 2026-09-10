# INP 精准诊断设计

## 目标

在现有 INP 指标链路中增加可验证的交互归因证据，识别输入等待、事件处理和呈现三个阶段的主要瓶颈，并定位高频慢交互元素。

## 数据流

1. Browser SDK 使用 `web-vitals/attribution/onINP`。
2. V2 事件携带三段耗时、交互类型、目标元素、加载阶段，以及可用时的脚本、样式布局和绘制耗时。
3. PostgreSQL 聚合证据覆盖率、阶段耗时和高频交互目标。
4. 规则层生成版本化 finding，Console 展示一条主要建议。

## 可靠性边界

首版不开启 `processedEventEntries`，避免为每次交互携带较大的原始事件数组。长动画帧数据只能作为相关执行证据，不能单独证明某个脚本是全部延迟的根因。

## 实施步骤

1. 扩展协议、校验和 Browser SDK attribution 采集。
2. 增加 INP 聚合、诊断规则和 `/api/v2/diagnostics/inp`。
3. 接入 Console 精准建议。
4. 增加确定性场景和端到端验收。
