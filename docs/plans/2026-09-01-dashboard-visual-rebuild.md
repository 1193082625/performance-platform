# Dashboard Visual Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Faithfully recreate the supplied Paint Performance dashboard while preserving API-backed FP/FCP summaries, scores, time-range selection, and trend charts.

**Architecture:** Use one reference-ratio dashboard stage so every visual region shares a single coordinate system. Place a text-free HUD raster beneath/around semantic Vue content; keep all changing values and ECharts series in the DOM/canvas and preserve the existing API/composable flow.

**Tech Stack:** Vue 3, TypeScript, CSS, ECharts, Vitest, Vite.

---

### Task 1: Establish the visual stage and decorative asset

**Files:**
- Create: `apps/console/src/assets/dashboard-hud-chrome.png`
- Modify: `apps/console/src/style.css`

1. Measure the source composition and define a 2676 × 1548 reference coordinate system.
2. Produce a decorative image containing frames, rings, connectors, grid, and glow, but no labels, numbers, controls, or chart series.
3. Inspect the asset for unwanted baked-in content.
4. Add it as a non-interactive decorative layer with aspect-preserving scaling.

### Task 2: Align semantic content to the reference regions

**Files:**
- Modify: `apps/console/src/App.vue`
- Modify: `apps/console/src/style.css`
- Modify: `apps/console/src/components/PerformanceScore.vue`
- Modify: `apps/console/src/components/PaintMetricCard.vue`
- Modify: `apps/console/src/components/MetricsRangeSelector.vue`

1. Keep the current API and `usePaintMetrics` data flow unchanged.
2. Place header, status, metric cards, center values, charts, and range selector in measured safe areas.
3. Remove styling that duplicates lines already present in the decorative asset.
4. Preserve semantic headings, buttons, labels, loading, empty, and error states.

### Task 3: Match live chart presentation

**Files:**
- Modify: `apps/console/src/components/paint-trend-option.ts`
- Test: `apps/console/src/components/paint-trend-option.test.ts`

1. Add or update tests for relative time labels, series selection, legend copy, and null points.
2. Tune grid, axes, labels, symbols, lines, and legend to the reference while keeping all values data-driven.
3. Run the focused chart tests.

### Task 4: Verify behavior and build integrity

**Files:**
- Test: `apps/console/src/App.test.ts`
- Test: `apps/console/src/components/*.test.ts`

1. Run Console tests and confirm all dynamic values and range controls still work.
2. Run type checking and production build.
3. Fix regressions without changing metric semantics.

### Task 5: Run blocking design QA

**Files:**
- Modify: `apps/console/design-qa.md`

1. Render the implementation with seeded live-format data at 1280 × 720.
2. Normalize the source to the same viewport and create a side-by-side comparison.
3. Check layout, typography, colors, asset quality, copy, overflow, interactions, and console errors.
4. Fix P0/P1/P2 findings and repeat capture until the report can truthfully say `final result: passed`.
