# Story 3.2: rag-strategy-toggles

Status: review

## Story

As a QA Lead,  
I want to enable and persist Multi Query / HyDE / Decomposition / Fusion strategies,  
so that retrieval can balance quality and cost by scenario.

## Acceptance Criteria

1. **Given** user configures strategy toggles  
   **When** settings are saved  
   **Then** strategy status is persisted  
   **And** new requests use the latest strategy.
2. **Given** strategy-enabled retrieval executes  
   **When** inspecting response metadata  
   **Then** current strategy combination is visible  
   **And** strategy version is traceable.

## Tasks / Subtasks

- [x] Added strategy persistence model and migration
  - [x] `rag_strategy_configs` table with versioning and active flag.
- [x] Added strategy config API
  - [x] `GET /api/knowledge/strategy-config`
  - [x] `PUT /api/knowledge/strategy-config`
  - [x] Access control via `session.user.id` + `hasProjectAccess`.
- [x] Wired strategy execution into search workflow
  - [x] `POST /api/knowledge/search` resolves persisted strategy.
  - [x] Request options can override persisted toggles.
  - [x] Response now includes `data.strategy` with version/source/toggles.
- [x] Added route-level regression tests
  - [x] `src/app/api/knowledge/strategy-config/__tests__/route.test.ts`
  - [x] Extended `src/app/api/knowledge/search/__tests__/route.test.ts` for persisted-toggle execution and metadata.

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/strategy-config/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented persisted strategy configuration with versioned active snapshots.
- 2026-03-19: Integrated strategy resolution into knowledge search with request override precedence.
- 2026-03-19: Added story-scoped tests for strategy persistence and metadata observability.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319183500_add_rag_strategy_configs/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/strategy-config.ts
- ai-test-platform/my-app/src/app/api/knowledge/strategy-config/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/strategy-config/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
