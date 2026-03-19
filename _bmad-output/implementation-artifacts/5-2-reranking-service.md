# Story 5.2: reranking-service

Status: review

## Story

As a QA engineer,  
I want a deterministic reranking service for refined evidence,  
so that final evidence order is relevance-oriented and auditable.

## Acceptance Criteria

1. **Given** refined retrieval candidates  
   **When** reranking executes  
   **Then** candidates are reordered with rerank scores  
   **And** top-N candidates are returned.
2. **Given** reranked candidates  
   **When** explainability is requested  
   **Then** each candidate includes rank and rationale tags  
   **And** reranking model metadata is returned.

## Tasks / Subtasks

- [x] Added reranking service module
  - [x] `cross-encoder-lite` scoring approximation.
  - [x] Lexical/phrase/source weighting.
  - [x] Rank + rationale output.
- [x] Wired reranking into `POST /api/knowledge/search`
  - [x] New option: `enableReranking`.
  - [x] New response field: `reranking`.
- [x] Added tests
  - [x] `src/lib/ai/rag/__tests__/reranking-service.test.ts`
  - [x] `src/app/api/knowledge/search/__tests__/route.test.ts`

## Test Evidence

- `npm test -- --runInBand src/lib/ai/rag/__tests__/reranking-service.test.ts`
- `npm test -- --runInBand src/app/api/knowledge/search/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added reranking service with score/rank/rationale output contract.
- 2026-03-19: Integrated reranking response payload into knowledge search route.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/reranking-service.ts
- ai-test-platform/my-app/src/lib/ai/rag/__tests__/reranking-service.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
