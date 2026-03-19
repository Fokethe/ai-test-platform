# Story 7.1: run-creation-start

Status: review

## Story

As a QA engineer,  
I want to create and start test runs,  
so that I can execute planned regression and verification tasks.

## Acceptance Criteria

1. **Given** selected target test cases  
   **When** a Run is created and started  
   **Then** the system creates a run and enters execution state  
   **And** creator and timestamp are recorded.
2. **Given** a transient execution failure  
   **When** retry is triggered  
   **Then** the system supports retry run creation and records audit trace.

## Tasks / Subtasks

- [x] Implemented run creation/list APIs
  - [x] `GET /api/runs` with auth + project access filtering + pagination
  - [x] `POST /api/runs` with schema validation and project permission check
- [x] Implemented run start flow
  - [x] `startNow` sets run status to `RUNNING` and initializes `startedAt`
  - [x] bulk create execution records from selected tests
  - [x] audit events `RUN_CREATED` and `RUN_STARTED`
- [x] Implemented retry trigger path
  - [x] `POST /api/runs/[id]/rerun` clones source run test scope
  - [x] new run starts in `RUNNING` state and records `RUN_RERUN_TRIGGERED`
- [x] Implemented run detail/update/delete control
  - [x] `GET/PUT/DELETE /api/runs/[id]`
  - [x] cancel flow updates pending/running executions to `SKIPPED`

## Test Evidence

- `npx jest --runInBand src/app/api/runs/__tests__/route.test.ts`
- `npx jest --runInBand "src/app/api/runs/\\[id\\]/__tests__/route.test.ts"`
- `npx jest --runInBand "src/app/api/runs/\\[id\\]/rerun/__tests__/route.test.ts"`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Rebuilt run APIs to support authenticated run creation/start and scoped query behavior.
- 2026-03-19: Added rerun endpoint and run-level audit events for retry traceability.

### File List

- ai-test-platform/my-app/src/app/api/runs/route.ts
- ai-test-platform/my-app/src/app/api/runs/[id]/route.ts
- ai-test-platform/my-app/src/app/api/runs/[id]/rerun/route.ts
- ai-test-platform/my-app/src/app/api/runs/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/runs/[id]/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/runs/[id]/rerun/__tests__/route.test.ts
