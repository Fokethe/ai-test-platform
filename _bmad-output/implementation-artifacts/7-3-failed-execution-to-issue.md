# Story 7.3: failed-execution-to-issue

Status: review

## Story

As a QA engineer,  
I want one-click issue creation from failed execution,  
so that I can shorten issue handoff latency.

## Acceptance Criteria

1. **Given** an execution is failed  
   **When** QA triggers quick issue creation  
   **Then** failed context, logs, and key evidence are prefilled  
   **And** issue is linked to execution automatically.
2. **Given** QA submits issue details  
   **When** save succeeds  
   **Then** issue enters initial lifecycle status  
   **And** assignment information can be updated later.

## Tasks / Subtasks

- [x] Implemented one-click issue creation API
  - [x] `POST /api/executions/[id]/issue`
  - [x] only allows `FAILED` / `ERROR` execution status
  - [x] validates project access before issue creation
- [x] Added failure context auto-fill
  - [x] auto title from test name
  - [x] auto description includes run/test/error, plus stderr/stdout snippets
  - [x] issue severity/priority defaults applied when not provided
- [x] Added relationship binding and initial lifecycle event
  - [x] issue links to `project/run/test/execution`
  - [x] creates `IssueLifecycleEvent` with initial `OPEN` transition
  - [x] audit event `ISSUE_CREATED_FROM_EXECUTION`

## Test Evidence

- `npx jest --runInBand "src/app/api/executions/\\[id\\]/issue/__tests__/route.test.ts"`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added one-click issue creation from failed execution with auto context packaging.
- 2026-03-19: Added initial lifecycle event and audit record for traceability.

### File List

- ai-test-platform/my-app/src/app/api/executions/[id]/issue/route.ts
- ai-test-platform/my-app/src/app/api/executions/[id]/issue/__tests__/route.test.ts
- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319235000_add_execution_tracking_issue_lifecycle/migration.sql
