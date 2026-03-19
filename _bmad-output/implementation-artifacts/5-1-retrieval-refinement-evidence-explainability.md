# Story 5.1: retrieval-refinement-evidence-explainability

Status: review

## Story

As a QA Lead,  
I want retrieval refinement with explainable evidence scoring,  
so that each retrieval result can be interpreted and reviewed.

## Acceptance Criteria

1. **Given** retrieval candidates are returned from baseline retrieval  
   **When** refinement executes  
   **Then** candidates are deduplicated and rescored  
   **And** top candidates are returned in stable order.
2. **Given** refined candidates are returned  
   **When** explainability is requested  
   **Then** each candidate includes score components and overlap tokens  
   **And** overall query coverage is returned.

## Tasks / Subtasks

- [x] Added retrieval refinement module
  - [x] Candidate dedupe and score normalization.
  - [x] Source reliability and freshness boost.
  - [x] Query-token overlap explainability output.
  - [x] Coverage metric output.
- [x] Wired refinement output into `POST /api/knowledge/search`
  - [x] New option: `enableRefinement`.
  - [x] New response field: `retrievalRefinement`.
- [x] Added tests
  - [x] `src/lib/ai/rag/__tests__/retrieval-refinement.test.ts`
  - [x] `src/app/api/knowledge/search/__tests__/route.test.ts`

## Test Evidence

- `npm test -- --runInBand src/lib/ai/rag/__tests__/retrieval-refinement.test.ts`
- `npm test -- --runInBand src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added explainable retrieval refinement pipeline for score decomposition.
- 2026-03-19: Added API-level response metadata for refinement and evidence transparency.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/retrieval-refinement.ts
- ai-test-platform/my-app/src/lib/ai/rag/__tests__/retrieval-refinement.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
