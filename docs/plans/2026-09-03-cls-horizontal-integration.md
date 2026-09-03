# CLS Horizontal Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CLS collection, V2 reporting, generic querying, and Console presentation across the existing performance platform.

**Architecture:** Reuse `web-vitals/onCLS` behind a thin browser adapter, translate its final metric into the existing `MetricSample` union, and enqueue it through the shared V2 reporter. The Server already supports `score/cls-v1`, so add regression coverage rather than a new endpoint. Reuse Console's generic metric API, composable, and summary card for a second independently loaded Core Web Vital.

**Tech Stack:** TypeScript, Vitest, web-vitals 6, Vue 3, Fastify, PostgreSQL, Docker Compose.

---

### Task 1: CLS collector contract

**Files:**
- Create: `packages/sdk-browser/src/types/clsCollector.type.ts`
- Create: `packages/sdk-browser/src/cls-collector.ts`
- Create: `packages/sdk-browser/src/cls-collector.test.ts`

1. Test single registration, score conversion, invalid values, destroy behavior, and at-most-once reporting.
2. Represent the determining observation using the last winning layout-shift entry's relative `startTime`.
3. Emit `web.vital.cls`, `score`, and `cls-v1` through `MetricSample`.
4. Run the focused collector test and browser typecheck.

### Task 2: Browser adapter and monitor wiring

**Files:**
- Modify: `packages/sdk-browser/src/web-vitals-adapter.ts`
- Modify: `packages/sdk-browser/src/types/paintMonitor.type.ts`
- Modify: `packages/sdk-browser/src/create-paint-monitor.ts`
- Modify: `packages/sdk-browser/src/create-paint-monitor.test.ts`

1. Adapt `onCLS` to the internal `ObserveCls` contract.
2. Inject CLS observation through the monitor dependency boundary.
3. Start and destroy the CLS collector with existing collectors.
4. Enqueue and immediately flush its final sample through the V2 reporter.
5. Verify sampling prevents CLS observer registration.

### Task 3: Server regression coverage

**Files:**
- Modify: `apps/server/src/repositories/postgres-event-repository.test.ts`
- Modify: `apps/server/src/routes/metric-query.test.ts`

1. Verify a stored CLS event aggregates as `score/cls-v1` without mixing LCP.
2. Verify `/api/v2/metrics?type=web.vital.cls` returns the generic metric shape.
3. Run focused Server tests and typecheck.

### Task 4: Console CLS presentation

**Files:**
- Modify: `apps/console/src/App.vue`
- Modify: `apps/console/src/App.test.ts`
- Modify: `apps/console/src/components/MetricSummaryCard.vue`
- Modify: `apps/console/src/style.css`

1. Create a second `useMetricQuery` instance fixed to `web.vital.cls`.
2. Load LCP and CLS for the same selected range.
3. Reuse the summary card with `score` formatting and a CLS label.
4. Preserve independent loading/error states and include CLS in total samples.
5. Verify the HUD layout at desktop and responsive sizes.

### Task 5: Full verification

1. Run browser, protocol, Server, and Console tests.
2. Run package typechecks and production builds.
3. Run `git diff --check`.
4. Rebuild Docker services, cause a layout shift in demo-web, and verify the stored/query/displayed CLS value.
