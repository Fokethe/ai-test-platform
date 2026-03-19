# Story 4.1: semantic-splitting-index-units

Status: review

## Story

As a QA engineer,  
I want documents to be semantically split into high-quality index units,  
so that retrieval accuracy can improve with traceable chunk boundaries.

## Acceptance Criteria

1. **Given** imported requirement/knowledge documents  
   **When** index building runs  
   **Then** text is split by semantic boundaries  
   **And** each unit gets a unique index identifier.
2. **Given** split quality is insufficient  
   **When** split parameters are adjusted and rebuilt  
   **Then** active index units are replaced  
   **And** build version history is retained.

## Tasks / Subtasks

- [x] Implemented semantic splitter core
  - [x] Rebuilt `DocumentProcessor` from stub to production-capable segmentation.
  - [x] Added configurable parameters: `targetChunkSize`, `minChunkSize`, `overlapSentences`, `maxChunks`.
  - [x] Added unit offsets/token estimation/quality score output.
- [x] Added versioned index persistence
  - [x] Added `rag_index_builds` model (versioned build snapshots).
  - [x] Added `rag_index_units` model (stable unit records with unique `unitKey`).
  - [x] Added active-version replacement semantics while preserving history.
- [x] Added index build API
  - [x] `POST /api/knowledge/index-units` builds and persists new semantic index units.
  - [x] `GET /api/knowledge/index-units` returns active build units + version history.
  - [x] Added project access guard and audit trail for build operations.
- [x] Added story-scoped tests
  - [x] `src/app/api/knowledge/index-units/__tests__/document-processor.test.ts`
  - [x] `src/app/api/knowledge/index-units/__tests__/route.test.ts`

## Test Evidence

- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/index-units/__tests__/document-processor.test.ts src/app/api/knowledge/index-units/__tests__/route.test.ts`
- `npx jest --config jest.api.config.js --runInBand --runTestsByPath src/app/api/knowledge/__tests__/route.test.ts src/app/api/knowledge/index-units/__tests__/document-processor.test.ts src/app/api/knowledge/index-units/__tests__/route.test.ts src/app/api/knowledge/multi-source-query/__tests__/route.test.ts src/app/api/knowledge/search/__tests__/route.test.ts src/app/api/knowledge/strategy-config/__tests__/route.test.ts src/app/api/knowledge/routing-rules/__tests__/route.test.ts src/app/api/knowledge/prompt-templates/__tests__/route.test.ts`
- `npx prisma generate --no-engine`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added semantic chunking with sentence boundary awareness and overlap controls.
- 2026-03-19: Added versioned index build/unit persistence to support rebuild and historical traceability.
- 2026-03-19: Added index unit API and route tests with access control and audit coverage.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319201000_add_rag_index_builds_and_units/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/document-processor.ts
- ai-test-platform/my-app/src/lib/ai/rag/index-unit-builder.ts
- ai-test-platform/my-app/src/app/api/knowledge/index-units/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/index-units/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/index-units/__tests__/document-processor.test.ts
