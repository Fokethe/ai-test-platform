# Story 4.2: multi-representation-summary-indexing

Status: review

## Story

As a QA Lead,  
I want original and summary representations for the same document to be indexed together,  
so that retrieval can balance coverage and response speed.

## Acceptance Criteria

1. **Given** document enters indexing pipeline  
   **When** multi-representation indexing runs  
   **Then** both original and summary representations are generated  
   **And** both representations can be linked to the same source document.
2. **Given** index persistence executes  
   **When** writing is completed  
   **Then** summary data is written into both vector and graph indexes  
   **And** any single write failure triggers compensation and alerting.

## Tasks / Subtasks

- [x] Added multi-representation persistence models
  - [x] `rag_vector_index_entries`
  - [x] `rag_graph_index_nodes`
  - [x] `RagRepresentationType` enum.
- [x] Added multi-representation indexing service
  - [x] Builds `ORIGINAL` + `SUMMARY` representations from active index units.
  - [x] Writes vector and graph summary indexes linked by `sourceUnitKey`.
  - [x] Supports compensation rollback on partial failure with degraded result contract.
- [x] Added route API
  - [x] `POST /api/knowledge/index-representations`
  - [x] `GET /api/knowledge/index-representations`
  - [x] Includes compensation/fallback audit events.
- [x] Added route tests
  - [x] `src/app/api/knowledge/index-representations/__tests__/route.test.ts`

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/index-representations/__tests__/route.test.ts`
- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/__tests__/route.test.ts src/app/api/knowledge/index-units/__tests__/document-processor.test.ts src/app/api/knowledge/index-units/__tests__/route.test.ts src/app/api/knowledge/index-representations/__tests__/route.test.ts src/app/api/knowledge/embedding-strategies/__tests__/route.test.ts src/app/api/knowledge/hierarchical-index/__tests__/route.test.ts src/app/api/knowledge/multi-source-query/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts src/app/api/knowledge/strategy-config/__tests__/route.test.ts src/app/api/knowledge/routing-rules/__tests__/route.test.ts src/app/api/knowledge/prompt-templates/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented original+summary dual representation generation and persistence linkage.
- 2026-03-19: Implemented vector/graph summary dual-write with compensation path.
- 2026-03-19: Added degraded contract and audit observability for write failures.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319204000_add_rag_representation_indexes/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/representation-indexer.ts
- ai-test-platform/my-app/src/app/api/knowledge/index-representations/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/index-representations/__tests__/route.test.ts
