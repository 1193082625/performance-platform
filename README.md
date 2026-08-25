## 完整链路

```text
浏览器产生 FP/FCP
        ↓
PerformanceObserver
        ↓
createPaintMonitor --> sdk-browser/ids.ts
        ↓
ids.ts 生成/提供三个 ID --> eventID、viewId、sessionId
        ↓
构造 PaintEventV1 --> protocol/validate.ts [上报内容]
        ↓
Reporter 批量上报
        ↓
Server
        ↓
PostgreSQL
```
