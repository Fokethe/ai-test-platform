# Story 2.4: bulk-ops-source-tracking

Status: review

## Story

As a QA engineer,  
I want batch update/delete/move with source-aware metadata and trace links,  
so that large-scale maintenance remains safe and auditable.

## Acceptance Criteria

1. **Given** batch operations on multiple assets  
   **When** API executes  
   **Then** each item returns explicit success/failure result and reason.
2. **Given** cross-project or unauthorized assets in request  
   **When** batch operation runs  
   **Then** unauthorized items are rejected while valid items continue.
3. **Given** source metadata and requirement/execution linkage  
   **When** querying test details  
   **Then** origin and traceability are available from API payloads.

## Tasks / Subtasks

- [x] Rebuild batch API contract and guards
  - [x] Rewrote `DELETE /api/tests/batch` for per-item soft-delete results.
  - [x] Rewrote `PUT /api/tests/batch` for status/source metadata updates.
  - [x] Rewrote `POST /api/tests/batch` for scoped parent move with project mismatch protection.
- [x] Keep batch execution resilient
  - [x] Mixed authorized/unauthorized ids now produce partial-success result sets.
  - [x] Summary payload includes requested/succeeded/failed.
- [x] Add route-level tests
  - [x] Added `src/app/api/tests/batch/__tests__/route.test.ts`.

## Dev Notes

- Response format standardized to:
  - `data.summary`
  - `data.results[]` with `{ id, success, action, reason? }`
- Batch scope uses project ownership chain, not only direct project members.

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Removed legacy `FIXME` permission gaps in batch operations.
- 2026-03-19: Added per-item error reporting and partial-success handling.
- 2026-03-19: Added story-scoped tests for batch behaviors and invalid target move.

### File List

- ai-test-platform/my-app/src/app/api/tests/batch/route.ts
- ai-test-platform/my-app/src/app/api/tests/batch/__tests__/route.test.ts
