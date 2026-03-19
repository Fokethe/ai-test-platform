# Story 4.3: special-embedding-adapter

Status: review

## Story

As a platform administrator,  
I want plugin-like special embedding strategy integration,  
so that indexing representation can evolve for specific business scenarios.

## Acceptance Criteria

1. **Given** new embedding strategy is configured  
   **When** indexing runs  
   **Then** strategy routing selects the configured embedder  
   **And** output vector dimension aligns with index configuration.
2. **Given** strategy is unavailable or errors  
   **When** handling new requests  
   **Then** system falls back to default embedding strategy  
   **And** fallback events are observable.

## Tasks / Subtasks

- [x] Added embedding strategy configuration model
  - [x] `rag_embedding_strategy_configs` with active-version semantics.
- [x] Added strategy registry and resolution logic
  - [x] Built-in strategies: `default-hash`, `colbert-lite`, `high-recall`.
  - [x] Configurable strategy routing + fallback target.
  - [x] Dimension validation and automatic fallback on mismatch/unavailable strategy.
- [x] Added strategy config API
  - [x] `GET /api/knowledge/embedding-strategies`
  - [x] `PUT /api/knowledge/embedding-strategies`
- [x] Wired embedding strategy into multi-representation indexing
  - [x] Vector writes now include strategy metadata and vector dimension.
  - [x] Fallback events are logged via audit.
- [x] Added route tests
  - [x] `src/app/api/knowledge/embedding-strategies/__tests__/route.test.ts`

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/embedding-strategies/__tests__/route.test.ts src/app/api/knowledge/index-representations/__tests__/route.test.ts`
- `npx prisma generate --no-engine`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented embedding strategy registry with deterministic plugins and versioned runtime config.
- 2026-03-19: Added robust fallback logic for unavailable strategy and dimension mismatch.
- 2026-03-19: Added fallback audit path for operational observability.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319205000_add_rag_embedding_strategy_configs/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/embedding-strategies.ts
- ai-test-platform/my-app/src/lib/ai/rag/representation-indexer.ts
- ai-test-platform/my-app/src/app/api/knowledge/embedding-strategies/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/embedding-strategies/__tests__/route.test.ts
