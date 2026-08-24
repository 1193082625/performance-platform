# FP/FCP MVP 0.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-hosted single-application MVP that collects real browser FP/FCP events and visualizes their summary and trends.

**Architecture:** A framework-free browser SDK sends versioned paint events to one Fastify process. The server keeps validation, normalization, repository, and query modules separate while PostgreSQL stores event details and calculates aggregates; a Vue console reads a stable metrics API.

**Tech Stack:** TypeScript, pnpm workspace, Vite, Vue 3, Fastify, PostgreSQL, node-postgres, Vitest, Playwright, ECharts, Docker Compose, Nginx.

---

## Execution rules

- Implement tasks in order; do not add MVP 1.0 features.
- Use tests before implementation for protocol, SDK, repository, API and UI state logic.
- Commit after each task only when the user has requested Git commits.
- Run task-specific tests after every change and the full suite before delivery.
- Keep SDK protocol independent of PostgreSQL rows and Console independent of SQL.

### Task 1: Workspace and quality foundation

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `vitest.workspace.ts`
- Create: `apps/server/package.json`
- Create: `apps/console/package.json`
- Create: `apps/demo-web/package.json`
- Create: `packages/protocol/package.json`
- Create: `packages/sdk-browser/package.json`

**Step 1: Create the workspace manifests**

Declare scripts at the root:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run --workspace vitest.workspace.ts",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm -r --parallel dev"
  }
}
```

**Step 2: Configure shared TypeScript strictness**

Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, ESM resolution, source maps and declaration output for packages.

**Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile created and all workspace packages resolved.

**Step 4: Verify the empty workspace**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: commands complete without configuration errors; zero tests is acceptable only for this task.

### Task 2: Versioned protocol and validation

**Files:**

- Create: `packages/protocol/src/types.ts`
- Create: `packages/protocol/src/validate.ts`
- Create: `packages/protocol/src/index.ts`
- Test: `packages/protocol/src/validate.test.ts`

**Step 1: Write failing protocol tests**

Cover:

- valid FP and FCP events;
- unsupported `schemaVersion`;
- wrong `appId`;
- unsupported event type;
- `NaN`, infinity, negative and non-number values;
- empty and over-20 event batches;
- partial success with reason counts.

Example:

```ts
it('rejects a negative paint value', () => {
  const result = validatePaintEvent(makeEvent({ payload: { value: -1, unit: 'ms' } }), 'demo-web')
  expect(result).toEqual({ ok: false, reason: 'invalid_value' })
})
```

**Step 2: Run the test and verify failure**

Run:

```bash
pnpm --filter @performance-platform/protocol test
```

Expected: FAIL because validation is not implemented.

**Step 3: Implement types and pure validation**

Export `PaintMetric`, `PaintEvent`, `BatchRequest`, `BatchResponse`, `PaintStats`, `PaintSeriesPoint` and `PaintMetricsResponse`. Return discriminated validation results; never throw for untrusted event input.

**Step 4: Run protocol tests**

Run the same command.

Expected: all validation tests PASS.

### Task 3: Browser SDK collection and reporting

**Files:**

- Create: `packages/sdk-browser/src/create-paint-monitor.ts`
- Create: `packages/sdk-browser/src/reporter.ts`
- Create: `packages/sdk-browser/src/ids.ts`
- Create: `packages/sdk-browser/src/index.ts`
- Test: `packages/sdk-browser/src/create-paint-monitor.test.ts`
- Test: `packages/sdk-browser/src/reporter.test.ts`
- Create: `packages/sdk-browser/vite.config.ts`

**Step 1: Write failing collection tests**

Use a fake `PerformanceObserver` to verify:

- `buffered: true` paint observation;
- FP/FCP name mapping;
- unknown paint entries ignored;
- non-finite and negative values ignored;
- `start()` is idempotent;
- `destroy()` disconnects and removes listeners;
- missing API fails silently.

**Step 2: Run and verify failure**

```bash
pnpm --filter @performance-platform/browser test
```

Expected: FAIL because monitor implementation is missing.

**Step 3: Implement the minimal monitor**

Expose:

```ts
interface PaintMonitor {
  start(): void
  flush(): Promise<void>
  destroy(): void
}

function createPaintMonitor(config: {
  appId: string
  endpoint: string
  debug?: (message: string, error?: unknown) => void
}): PaintMonitor
```

Generate `eventId`, session-scoped `sessionId` and per-load `viewId`. Catch every internal boundary.

**Step 4: Write failing reporter tests**

Test Beacon success, fetch fallback, maximum batch size, queue clearing only after accepted transport, visibility flush and network failure isolation.

**Step 5: Implement reporter and build outputs**

Output ESM and IIFE/CDN builds. Keep the package framework-free.

**Step 6: Verify SDK**

```bash
pnpm --filter @performance-platform/browser test
pnpm --filter @performance-platform/browser typecheck
pnpm --filter @performance-platform/browser build
```

Expected: tests pass and distributable files are produced.

### Task 4: PostgreSQL schema and repository

**Files:**

- Create: `apps/server/src/db/migrations/001_create_paint_events.sql`
- Create: `apps/server/src/db/pool.ts`
- Create: `apps/server/src/repositories/event-repository.ts`
- Create: `apps/server/src/repositories/postgres-event-repository.ts`
- Test: `apps/server/src/repositories/postgres-event-repository.test.ts`
- Create: `apps/server/scripts/migrate.ts`

**Step 1: Create the migration**

Use the schema from the MVP design, including unique `event_id`, event type check and `(app_id, event_type, event_time)` index.

**Step 2: Write failing repository integration tests**

Test:

- batch insert;
- duplicate `eventId` is idempotent;
- FP and FCP stored independently;
- range boundaries;
- empty summary returns count 0 and null statistics;
- known dataset returns exact average and expected percentiles.

**Step 3: Start the test database**

```bash
docker compose -f deploy/docker-compose.test.yml up -d postgres-test
```

Expected: PostgreSQL health check succeeds.

**Step 4: Run tests and verify failure**

```bash
pnpm --filter @performance-platform/server test -- postgres-event-repository
```

Expected: FAIL because repository methods are absent.

**Step 5: Implement repository**

Define an interface with `insertBatch(events)` and `queryPaintMetrics(query)`. Use parameterized SQL and `percentile_cont` for P50/P75/P90. Whitelist interval SQL fragments instead of interpolating untrusted input.

**Step 6: Run repository tests**

Expected: all integration tests PASS.

### Task 5: Fastify ingestion and metrics API

**Files:**

- Create: `apps/server/src/config.ts`
- Create: `apps/server/src/services/event-ingestion-service.ts`
- Create: `apps/server/src/services/paint-metrics-service.ts`
- Create: `apps/server/src/routes/events.ts`
- Create: `apps/server/src/routes/metrics.ts`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/index.ts`
- Test: `apps/server/src/routes/events.test.ts`
- Test: `apps/server/src/routes/metrics.test.ts`

**Step 1: Write failing ingestion route tests**

Use `fastify.inject()` to verify valid batch, partial success, wrong app, invalid batch, payload limit, duplicate idempotency and stable error responses.

**Step 2: Implement ingestion service and route**

Route: `POST /api/v1/events/batch`. Set a 32 KB body limit. Validate each event through the protocol package, normalize timestamps, then call the repository once per batch.

**Step 3: Write failing metrics route tests**

Cover default 24-hour range, explicit range, allowed intervals, invalid dates, `from >= to`, over-30-day range and empty results.

**Step 4: Implement metrics service and route**

Route: `GET /api/v1/metrics/paint`. Response must match the shared protocol type exactly.

**Step 5: Add health endpoint and CORS configuration**

Expose `GET /health`; restrict origins from `CORS_ORIGINS`.

**Step 6: Verify server**

```bash
pnpm --filter @performance-platform/server test
pnpm --filter @performance-platform/server typecheck
```

Expected: all route and repository tests PASS.

### Task 6: Vue Console data client and states

**Files:**

- Create: `apps/console/src/api/metrics.ts`
- Create: `apps/console/src/composables/use-paint-metrics.ts`
- Create: `apps/console/src/components/MetricSummary.vue`
- Create: `apps/console/src/components/PaintTrendChart.vue`
- Create: `apps/console/src/views/DashboardView.vue`
- Create: `apps/console/src/App.vue`
- Create: `apps/console/src/main.ts`
- Create: `apps/console/src/styles.css`
- Create: `apps/console/index.html`
- Create: `apps/console/vite.config.ts`
- Test: `apps/console/src/composables/use-paint-metrics.test.ts`
- Test: `apps/console/src/views/DashboardView.test.ts`

**Step 1: Write failing state tests**

Verify loading, success, empty, error and range-change states. A stale response must not overwrite a newer range request.

**Step 2: Implement typed API client and composable**

Use shared response types. Default to 24 hours/hour interval; map 1 hour to minute, 7/30 days to day.

**Step 3: Write failing dashboard tests**

Verify FP/FCP labels, sample counts, average/P50/P75/P90 formatting, empty guidance and retry action.

**Step 4: Implement the dashboard**

Create two summary sections, average trend chart and P75 chart. Keep units visible and use `—` for null statistics, never `0`.

**Step 5: Verify Console**

```bash
pnpm --filter @performance-platform/console test
pnpm --filter @performance-platform/console typecheck
pnpm --filter @performance-platform/console build
```

Expected: UI tests pass and production assets build.

### Task 7: Demo application

**Files:**

- Create: `apps/demo-web/index.html`
- Create: `apps/demo-web/src/main.ts`
- Create: `apps/demo-web/src/style.css`
- Create: `apps/demo-web/vite.config.ts`
- Test: `apps/demo-web/src/main.test.ts`

**Step 1: Write a failing initialization test**

Verify the Demo creates one monitor with configured `APP_ID` and endpoint and calls `start()` once.

**Step 2: Implement Demo**

Render realistic text, CSS and a local image. Display only SDK initialization status; do not fabricate paint values.

**Step 3: Verify Demo**

```bash
pnpm --filter @performance-platform/demo-web test
pnpm --filter @performance-platform/demo-web build
```

Expected: test and build PASS.

### Task 8: Docker Compose deployment

**Files:**

- Create: `apps/server/Dockerfile`
- Create: `apps/console/Dockerfile`
- Create: `apps/console/nginx.conf`
- Create: `apps/demo-web/Dockerfile`
- Create: `deploy/docker-compose.yml`
- Create: `deploy/docker-compose.test.yml`
- Create: `deploy/.env.example`
- Create: `docs/operations/mvp-deployment.md`

**Step 1: Define services**

Services: `postgres`, `server`, `console`, `demo-web`. Add health checks and dependency conditions. Configure fixed `APP_ID=demo-web` and CORS origins.

**Step 2: Build images**

```bash
docker compose -f deploy/docker-compose.yml build
```

Expected: all images build without copying development secrets.

**Step 3: Start clean deployment**

```bash
docker compose -f deploy/docker-compose.yml up -d
docker compose -f deploy/docker-compose.yml ps
```

Expected: all services become healthy.

**Step 4: Smoke-test endpoints**

```bash
curl -fsS http://localhost:3000/health
curl -fsS 'http://localhost:3000/api/v1/metrics/paint'
```

Expected: health success and a valid empty metrics response.

### Task 9: End-to-end flow and release documentation

**Files:**

- Create: `tests/e2e/fp-fcp-flow.spec.ts`
- Create: `playwright.config.ts`
- Create: `docs/getting-started/mvp-sdk-integration.md`
- Create: `README.md`
- Modify: `docs/product/product-requirements.md`
- Modify: `docs/plans/2026-08-23-fp-fcp-mvp-design.md`

**Step 1: Write the failing E2E test**

The test must:

1. open Demo;
2. wait for a paint batch request;
3. poll the metrics API until FP/FCP samples appear;
4. open Console;
5. assert FP/FCP summaries and chart canvases render;
6. verify no uncaught Demo page error.

**Step 2: Run and confirm failure**

```bash
pnpm exec playwright test tests/e2e/fp-fcp-flow.spec.ts
```

Expected: FAIL until deployment URLs and selectors are wired.

**Step 3: Complete integration and documentation**

Document prerequisites, one-command startup, ports, SDK snippet, API examples, no-data troubleshooting and teardown.

**Step 4: Run full verification**

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
docker compose -f deploy/docker-compose.yml config --quiet
```

Expected: all commands PASS.

**Step 5: Verify MVP acceptance manually**

- Console opens without login.
- Demo works when API is stopped.
- Real FP/FCP samples appear after API recovery and page reload.
- Invalid events do not affect statistics.
- Empty statistics use null/`—`, not zero.
- A clean Docker environment reproduces the flow.

## Completion definition

The plan is complete when a new user can clone the repository, start Docker Compose, open Demo, and see real FP/FCP summary and trends in the免登录 Console without manually creating database rows or configuration records.
