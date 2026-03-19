# Story 2.3: test-asset-create-search

Status: review

## Story

As a QA engineer,  
I want to create CASE/SUITE/FOLDER assets and filter them quickly,  
so that test assets are organized and discoverable at project scale.

## Acceptance Criteria

1. **Given** QA creates CASE/SUITE/FOLDER  
   **When** submitting test asset data  
   **Then** records persist with correct type and project scope.
2. **Given** many assets in one project  
   **When** filtering by project/type/tag/keyword/status/priority/source  
   **Then** APIs return stable paginated results.
3. **Given** non-member access  
   **When** hitting test asset APIs  
   **Then** access is denied by resource ownership chain.

## Tasks / Subtasks

- [x] Rework list and create API behavior
  - [x] Rewrote `GET /api/tests` with unified access scope and composable filters.
  - [x] Rewrote `POST /api/tests` to validate project access and requirement linkage.
  - [x] Preserved pagination and sorting (`page/pageSize/sort/order`).
- [x] Rework test detail API behavior
  - [x] Rewrote `GET /api/tests/[id]` with traceability payload.
  - [x] Rewrote `PUT /api/tests/[id]` with ownership-bound updates.
  - [x] Rewrote `DELETE /api/tests/[id]` to soft-archive.
- [x] Add route-level tests
  - [x] Added `src/app/api/tests/__tests__/route.test.ts`.
  - [x] Added `src/app/api/tests/[id]/__tests__/route.test.ts`.

## Dev Notes

- Access guard standard: `auth() + hasProjectAccess(session.user.id, projectId)`.
- List API now supports:
  - `projectId`, `type`, `parentId`, `search`, `tags`, `status`, `priority`, `source`
  - `page`, `pageSize`, `sort`, `order`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Rebuilt test-asset APIs with project-scoped filtering and permissions.
- 2026-03-19: Added story-scoped test coverage for create/list/detail/delete paths.

### File List

- ai-test-platform/my-app/src/app/api/tests/route.ts
- ai-test-platform/my-app/src/app/api/tests/[id]/route.ts
- ai-test-platform/my-app/src/app/api/tests/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/tests/[id]/__tests__/route.test.ts
