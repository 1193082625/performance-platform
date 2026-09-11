# Web Vitals 最终值生命周期设计

## 目标

确保 LCP、CLS 和 INP 每个页面访问只上报一个由 SDK 明确落定的最终值，不依赖 `web-vitals` 默认回调次数这一隐含行为。

## 方案

- 适配器为 LCP、CLS、INP 启用 `reportAllChanges`，接收页面生命周期内的候选值变化。
- 各 Collector 校验并保存最新有效候选，不在观察回调中立即上报。
- 页面首次进入 `hidden`、触发 `pagehide` 或 Monitor 被销毁时，调用三个 Collector 的 `finalize()`。浏览器适配层在 Document 监听 `visibilitychange`，在 Window 监听 `pagehide`。
- `finalize()` 最多生成一次事件；重复的生命周期事件不重复上报。
- 没有有效候选值时不生成事件，也不以 `0` 代替缺失指标。
- 显式 `monitor.flush()` 只发送已经生成的事件，不提前结束仍在进行的 Web Vital 生命周期。

## 错误处理

观察器注册、指标消费者和生命周期监听器异常继续隔离，不影响宿主页面。无效候选值被忽略，后续有效候选仍可成为最终值。

## 验收

- 单元测试覆盖多次候选更新、无效候选、无交互、重复 finalize、destroy 后回调。
- Monitor 测试覆盖 hidden、pagehide、destroy 的落定与去重。
- 适配器测试锁定 `reportAllChanges: true`。
- 全量测试、类型检查、构建和 Chromium E2E 通过。
