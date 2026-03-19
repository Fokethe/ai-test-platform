# Story 5.4: self-rag-rrr-controlled-generation

Status: review

## Story

As a platform administrator,  
I want controlled generation modes (`self-rag` / `rrr`) with bounded loops,  
so that generation strategy is configurable, traceable, and safe.

## Acceptance Criteria

1. **Given** search request enables controlled generation mode  
   **When** mode is `self-rag` or `rrr`  
   **Then** generation returns mode, iteration count, confidence, and trace steps.
2. **Given** controlled generation completes  
   **When** request is audited  
   **Then** system records strategy mode and run metadata  
   **And** response includes evidence used in final generation.

## Tasks / Subtasks

- [x] Added controlled generation modes
  - [x] `standard` mode.
  - [x] `self-rag` mode with reflection/revision path.
  - [x] `rrr` mode with retrieve-read-refine path.
  - [x] Iteration cap (`maxGenerationIterations`).
- [x] Wired mode controls into `POST /api/knowledge/search`
  - [x] New option: `generationMode`.
  - [x] New option: `maxGenerationIterations`.
  - [x] Added audit event: `RAG_CONTROLLED_GENERATION_COMPLETED`.
- [x] Added tests
  - [x] `src/lib/ai/rag/__tests__/controlled-generation.test.ts`
  - [x] `src/app/api/knowledge/search/__tests__/route.test.ts`

## Test Evidence

- `npm test -- --runInBand src/lib/ai/rag/__tests__/controlled-generation.test.ts`
- `npm test -- --runInBand src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented bounded controlled generation with `self-rag` and `rrr` modes.
- 2026-03-19: Added route-level mode exposure, metadata payload, and audit integration.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/controlled-generation.ts
- ai-test-platform/my-app/src/lib/ai/rag/__tests__/controlled-generation.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
