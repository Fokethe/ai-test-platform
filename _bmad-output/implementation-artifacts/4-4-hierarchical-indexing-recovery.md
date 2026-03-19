# Story 4.4: hierarchical-indexing-recovery

Status: review

## Story

As a QA Lead,  
I want RAPTOR-like hierarchical indexing with checkpoint recovery,  
so that large-scale indexing keeps stable and restart-safe.

## Acceptance Criteria

1. **Given** indexing task for large documents  
   **When** root/sub clustering runs  
   **Then** hierarchical index structure is generated  
   **And** can be used for layered recall.
2. **Given** indexing task interruption  
   **When** task resumes  
   **Then** process resumes from latest checkpoint  
   **And** recovery SLA (10-minute window) is observable in run metadata.

## Tasks / Subtasks

- [x] Added hierarchical indexing persistence models
  - [x] `rag_hierarchical_index_jobs`
  - [x] `rag_index_checkpoints`
  - [x] `rag_hierarchical_index_nodes`
- [x] Added hierarchical indexing engine
  - [x] Root cluster -> sub cluster -> leaf node staged pipeline.
  - [x] Stage checkpoints with resumable payload.
  - [x] Resume mode based on failed job + latest checkpoint.
  - [x] Recovery SLA indicator (`recoveredWithinSla`, `recoveryWindowMinutes`).
- [x] Added layered recall utility over hierarchical nodes
  - [x] Query overlap scoring across levels.
  - [x] Optional recall output from hierarchical index API.
- [x] Added API routes
  - [x] `POST /api/knowledge/hierarchical-index` for start/resume.
  - [x] `GET /api/knowledge/hierarchical-index` for snapshot + layered recall.
- [x] Added route tests
  - [x] `src/app/api/knowledge/hierarchical-index/__tests__/route.test.ts`

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/hierarchical-index/__tests__/route.test.ts`
- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/__tests__/route.test.ts src/app/api/knowledge/index-units/__tests__/document-processor.test.ts src/app/api/knowledge/index-units/__tests__/route.test.ts src/app/api/knowledge/index-representations/__tests__/route.test.ts src/app/api/knowledge/embedding-strategies/__tests__/route.test.ts src/app/api/knowledge/hierarchical-index/__tests__/route.test.ts src/app/api/knowledge/multi-source-query/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts src/app/api/knowledge/strategy-config/__tests__/route.test.ts src/app/api/knowledge/routing-rules/__tests__/route.test.ts src/app/api/knowledge/prompt-templates/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented stage-based hierarchical index build with checkpoint persistence.
- 2026-03-19: Implemented restart/recovery flow from latest checkpoint.
- 2026-03-19: Added layered recall API output and recovery observability metadata.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319210000_add_rag_hierarchical_index_jobs/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/hierarchical-indexer.ts
- ai-test-platform/my-app/src/app/api/knowledge/hierarchical-index/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/hierarchical-index/__tests__/route.test.ts
