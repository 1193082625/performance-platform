# INP Horizontal Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add INP collection, V2 reporting, generic querying, and Console presentation across the performance platform.

**Architecture:** Use `web-vitals/onINP` behind the SDK dependency boundary and map the selected interaction's duration and start time into the existing `MetricSample` model. Reuse the V2 reporter and generic Server query path. Add a third independently loaded summary card to the Console and a deliberate slow interaction to demo-web for deterministic end-to-end verification.

**Tech Stack:** TypeScript, Vitest, web-vitals 6, Vue 3, Fastify, PostgreSQL, Docker Compose.

---

### Task 1: INP collector

**Files:**
- Create: `packages/sdk-browser/src/types/inpCollector.type.ts`
- Create: `packages/sdk-browser/src/inp-collector.ts`
- Create: `packages/sdk-browser/src/inp-collector.test.ts`

Test and implement single registration, `ms/inp-v1` sample conversion, invalid input rejection, destruction, and at-most-once reporting.

### Task 2: SDK monitor wiring

**Files:**
- Modify: `packages/sdk-browser/src/web-vitals-adapter.ts`
- Modify: `packages/sdk-browser/src/types/paintMonitor.type.ts`
- Modify: `packages/sdk-browser/src/create-paint-monitor.ts`
- Modify: `packages/sdk-browser/src/create-paint-monitor.test.ts`

Adapt `onINP`, inject it into the monitor, respect session sampling, and flush immediately after the final sample is enqueued.

### Task 3: Server regression

**Files:**
- Modify: `apps/server/src/repositories/postgres-event-repository.test.ts`
- Modify: `apps/server/src/services/metric-query-service.test.ts`

Verify that `web.vital.inp` resolves to `ms/inp-v1` and aggregates independently from other millisecond metrics.

### Task 4: Console and demo integration

**Files:**
- Modify: `apps/console/src/App.vue`
- Modify: `apps/console/src/App.test.ts`
- Modify: `apps/console/src/style.css`
- Modify: `apps/demo-web/src/main.ts`
- Modify: `apps/demo-web/src/style.css`

Add a fixed INP query instance, third Vital card, shared range refresh, and total sample aggregation. Add an explicit demo interaction that blocks the main thread long enough to create a measurable INP candidate.

### Task 5: Verification

Run all tests and builds, rebuild Docker services, trigger the demo interaction, hide/navigate the page, query `web.vital.inp`, and visually verify the Console.
