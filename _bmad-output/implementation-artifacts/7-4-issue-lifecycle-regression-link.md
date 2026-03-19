# Story 7.4: issue-lifecycle-regression-link

Status: review

## Story

As a QA lead,  
I want issue lifecycle transitions linked with regression evidence,  
so that closure quality can be measured and reviewed.

## Acceptance Criteria

1. **Given** issue status changes  
   **When** it moves across lifecycle stages  
   **Then** full status transition history is persisted  
   **And** status-based reporting is possible.
2. **Given** regression is executed after fix  
   **When** regression finishes  
   **Then** regression result can be written back to issue  
   **And** closure linkage is visible.

## Tasks / Subtasks

- [x] Added issue lifecycle data model
  - [x] `IssueLifecycleEvent` model with from/to status and actor
  - [x] optional regression links: `regressionRunId`, `regressionExecutionId`, `regressionResult`
  - [x] migration tables/indexes and issue relation updates
- [x] Implemented lifecycle API
  - [x] `GET /api/issues/[id]/lifecycle` returns issue + ordered lifecycle timeline
  - [x] `POST /api/issues/[id]/lifecycle` writes transitions and regression linkage
  - [x] validates referenced regression run/execution existence
- [x] Integrated compatibility update path
  - [x] `PUT /api/issues/[id]` now writes lifecycle event when status changes
  - [x] keeps unified transition trace across old/new update paths
  - [x] audit event `ISSUE_LIFECYCLE_UPDATED`

## Test Evidence

- `npx jest --runInBand "src/app/api/issues/\\[id\\]/lifecycle/__tests__/route.test.ts"`
- `npx tsc --noEmit --pretty false` (scoped verification: `NO_EPIC7_TSC_ERRORS`)

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added issue lifecycle transition API with regression run/execution linkage.
- 2026-03-19: Unified issue status changes to always emit lifecycle history.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319235000_add_execution_tracking_issue_lifecycle/migration.sql
- ai-test-platform/my-app/src/app/api/issues/[id]/lifecycle/route.ts
- ai-test-platform/my-app/src/app/api/issues/[id]/lifecycle/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/issues/[id]/route.ts
