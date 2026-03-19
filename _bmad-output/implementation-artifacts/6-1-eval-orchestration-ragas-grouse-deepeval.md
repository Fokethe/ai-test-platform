# Story 6.1: eval-orchestration-ragas-grouse-deepeval

Status: review

## Story

As a QA Lead,  
I want one-click orchestration for ragas/Grouse/DeepEval,  
so that we can evaluate RAG quality with unified and traceable reports.

## Acceptance Criteria

1. **Given** strategy version and dataset version are selected  
   **When** eval orchestration is triggered  
   **Then** ragas/Grouse/DeepEval pipelines run together  
   **And** return a unified report payload.
2. **Given** same strategy + dataset run continuously  
   **When** last 3 results are checked  
   **Then** variance is computed against NFR12  
   **And** strategy/dataset/result versions are traceable.

## Tasks / Subtasks

- [x] Added eval data models
  - [x] `rag_eval_dataset_versions`
  - [x] `rag_eval_runs`
- [x] Added orchestration service
  - [x] Deterministic framework simulation (`ragas` / `grouse` / `deepeval`)
  - [x] Unified retrieval/generation/evaluation/cost metrics
  - [x] NFR12 variance computation on latest 3 runs
- [x] Added orchestration API
  - [x] `POST /api/knowledge/evals/orchestration`
  - [x] `GET /api/knowledge/evals/orchestration`
  - [x] Access control + audit log integration

## Test Evidence

- `npm test -- --runInBand src/app/api/knowledge/evals/orchestration/__tests__/route.test.ts src/lib/ai/rag/__tests__/eval-service.test.ts`
- `npx tsc --noEmit --pretty false` (scoped verification: `NO_EPIC6_TSC_ERRORS`)

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented unified eval orchestration and report schema with version metadata.
- 2026-03-19: Added NFR12 stability/variance check (latest 3 runs).

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319223000_add_rag_eval_ops/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/eval-service.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/orchestration/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/orchestration/__tests__/route.test.ts
- ai-test-platform/my-app/src/lib/ai/rag/__tests__/eval-service.test.ts
