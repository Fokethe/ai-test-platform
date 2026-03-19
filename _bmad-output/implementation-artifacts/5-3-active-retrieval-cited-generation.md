# Story 5.3: active-retrieval-cited-generation

Status: review

## Story

As a QA Lead,  
I want generation to trigger active follow-up retrieval when evidence is insufficient,  
so that answers stay grounded and citation-backed.

## Acceptance Criteria

1. **Given** generation starts with low evidence coverage  
   **When** active retrieval is enabled  
   **Then** follow-up retrieval is triggered during generation  
   **And** newly retrieved evidence can be merged into answer context.
2. **Given** final answer is produced  
   **When** response is returned  
   **Then** answer includes citation references  
   **And** active retrieval events are auditable.

## Tasks / Subtasks

- [x] Added controlled generation module with active retrieval hook
  - [x] Coverage-based follow-up retrieval trigger.
  - [x] Citation list output and referenced answer rendering.
  - [x] Trace steps for reflect/retrieve/revise phases.
- [x] Wired active retrieval into `POST /api/knowledge/search`
  - [x] New option: `enableActiveRetrieval`.
  - [x] New response fields: `generationControl`, citation list from controlled generation.
  - [x] Added audit event: `RAG_ACTIVE_RETRIEVAL_TRIGGERED`.
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

- 2026-03-19: Added active retrieval decision and follow-up query flow inside controlled generation.
- 2026-03-19: Added active retrieval audit logging and citation-backed response rendering.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/controlled-generation.ts
- ai-test-platform/my-app/src/lib/ai/rag/__tests__/controlled-generation.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/search/__tests__/route.test.ts
