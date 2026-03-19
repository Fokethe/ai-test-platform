# Story 7.2: execution-state-tracking

Status: review

## Story

As a QA engineer,  
I want each execution to have a complete state timeline,  
so that I can trace failures and review quality risk.

## Acceptance Criteria

1. **Given** a run with multiple executions  
   **When** execution states change  
   **Then** each transition is persisted with timestamp  
   **And** history can be queried.
2. **Given** duplicate status reports  
   **When** idempotency key is reused  
   **Then** duplicate dirty writes are prevented.

## Tasks / Subtasks

- [x] Added execution transition persistence
  - [x] `ExecutionStatusEvent` model
  - [x] migration for `execution_status_events` table + indexes
  - [x] unique key `(execution_id, idempotency_key)` for idempotent writes
- [x] Implemented execution state APIs
  - [x] `GET /api/executions/[id]/status` returns execution + state history
  - [x] `PATCH /api/executions/[id]/status` writes transition events
  - [x] idempotent response path when same key is submitted again
- [x] Run aggregate reconciliation
  - [x] recalculate `total/passed/failed/skipped` after each transition
  - [x] update run status (`PENDING/RUNNING/COMPLETED/FAILED`) and duration
  - [x] audit event `EXECUTION_STATUS_UPDATED`

## Test Evidence

- `npx jest --runInBand "src/app/api/executions/\\[id\\]/status/__tests__/route.test.ts"`
- `npx tsc --noEmit --pretty false` (scoped verification: `NO_EPIC7_TSC_ERRORS`)

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added execution status history model and idempotent state transition processing.
- 2026-03-19: Added run-level aggregate recalculation on each execution transition.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319235000_add_execution_tracking_issue_lifecycle/migration.sql
- ai-test-platform/my-app/src/app/api/executions/[id]/status/route.ts
- ai-test-platform/my-app/src/app/api/executions/[id]/status/__tests__/route.test.ts
