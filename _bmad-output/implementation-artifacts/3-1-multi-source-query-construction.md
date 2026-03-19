# Story 3.1: multi-source-query-construction

Status: review

## Story

As a QA engineer,  
I want to build relational/graph/vector query plans for the same question and run them concurrently,  
so that I can get broader candidate evidence with partial-failure tolerance.

## Acceptance Criteria

1. **Given** a user query  
   **When** planning starts  
   **Then** relational/graph/vector plans are generated with traceable metadata.
2. **Given** plans are ready  
   **When** execution runs concurrently  
   **Then** merged candidate evidence is returned with source tags.
3. **Given** one source fails  
   **When** aggregation finishes  
   **Then** successful sources still return  
   **And** failed source reasons are included in response.

## DS Progress

- [x] Added story API endpoint
  - [x] `POST /api/knowledge/multi-source-query`
  - [x] Uses unified response contract and session-based access control.
  - [x] Supports explicit `projectId` or auto-scoped project set.
- [x] Added planner/executor module
  - [x] `src/lib/ai/rag/multi-source-query.ts`
  - [x] Builds three plans: `relational`, `graph`, `vector`.
  - [x] Executes three sources concurrently.
  - [x] Merges and ranks candidates, preserves source label.
  - [x] Captures per-source errors without failing whole request.
- [x] Added route tests
  - [x] `src/app/api/knowledge/multi-source-query/__tests__/route.test.ts`
  - [x] Covers `401/400/403/success/empty-scope`.
  - [x] Covers partial-failure reporting in response metadata.
- [x] Integration and observability closure
  - [x] Wired multi-source execution into `POST /api/knowledge/search` via `options.enableMultiSource`.
  - [x] Added lightweight audit telemetry for failed source branches.
  - [x] Added story-scoped regression tests for search + multi-source wiring.

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/multi-source-query/__tests__/route.test.ts`
- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/search/__tests__/route.test.ts`
- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/__tests__/route.test.ts src/app/api/knowledge/multi-source-query/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Rebuilt `POST /api/knowledge/search` to stable UTF-8 source and added optional multi-source orchestration path.
- 2026-03-19: Added audit logging for multi-source partial failures in both dedicated and integrated search endpoints.
- 2026-03-19: Added route-level regression coverage for search + multi-source integration behavior.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/multi-source-query.ts
- ai-test-platform/my-app/src/app/api/knowledge/multi-source-query/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/multi-source-query/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
