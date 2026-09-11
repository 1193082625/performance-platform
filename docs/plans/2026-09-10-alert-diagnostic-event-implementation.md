# Alert Diagnostic Event Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate versioned alert events by evaluating abnormal LCP, CLS, and INP metrics together with their precise diagnostic findings.

**Architecture:** Add protocol response types, a server orchestration service, and one read-only evaluation route. Reuse the existing metric and diagnostic repositories; do not add persistence, scheduling, configuration, or notification delivery.

**Tech Stack:** TypeScript, Fastify, PostgreSQL repository interfaces, Vitest

---

### Task 1: Alert event protocol

**Files:**
- Modify: `packages/protocol/src/types.ts`
- Modify: `packages/protocol/src/index.ts`
- Test: `packages/protocol/src/alert-event.test.ts`

Define the versioned rule, metric observation, diagnostic evidence, and evaluation response types. Verify all three Web Vital event variants compile.

### Task 2: Evaluation service

**Files:**
- Create: `apps/server/src/services/alert-evaluation-service.ts`
- Test: `apps/server/src/services/alert-evaluation-service.test.ts`

Validate the requested range, query all metric and diagnostic aggregates in parallel, enforce ten samples, compare P75 against the built-in good threshold, and attach matching findings.

### Task 3: HTTP integration

**Files:**
- Create: `apps/server/src/routes/alert-evaluation.ts`
- Create: `apps/server/src/routes/alert-evaluation.test.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/server/src/index.ts`

Expose `GET /api/v2/alerts/evaluate`, map validation and storage errors, register dependencies, then run targeted and full regression tests.
