# Memory health design

内存健康状态只在 Console 中展示，不发送外部通知。为了避免 Console 使用彼此不对应的聚合分位数计算，服务端必须基于同一次页面快照中的 `used_heap` 和 `heap_limit` 进行评估，再把稳定状态返回给 Console。

状态包括 `INSUFFICIENT_DATA`、`NORMAL`、`WARNING` 和 `CRITICAL`。至少需要 6 个有效快照且覆盖 20 分钟，否则明确返回数据不足。内存压力使用最新快照的 `used_heap / heap_limit`；增长风险同时要求至少 80% 的相邻快照增长、达到绝对增长量，并达到相对增长比例。单次峰值不会被判断为持续增长。

首版 WARNING 阈值为利用率 70%，或者持续增长至少 32 MiB 且至少 20%。CRITICAL 阈值为利用率 90%，或者持续增长至少 128 MiB 且至少 50%。这些状态表达风险而不是断言已经发生内存泄漏，因为 `performance.memory` 是 Chromium 提供的近似 JS 堆数据。

数据流为：Repository 关联同一快照的内存事件，Service 调用纯函数 `evaluateMemoryHealth()`，路由返回评估结果，Console 仅负责显示状态、原因、利用率和增长量。纯函数及阈值放在协议包中，确保服务端判定与 Console 类型契约一致。
