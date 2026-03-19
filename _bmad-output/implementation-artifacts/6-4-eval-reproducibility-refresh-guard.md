# Story 6.4: eval-reproducibility-refresh-guard

Status: review

## Story

As a QA Lead,  
I want eval retry/recovery and dashboard refresh guardrails,  
so that quality operations remain stable under transient failures.

## Acceptance Criteria

1. **Given** an eval run fails  
   **When** retry is triggered  
   **Then** run can be recovered with preserved strategy/dataset metadata  
   **And** retry trace is auditable.
2. **Given** dashboard refresh latency exceeds threshold  
   **When** guard is triggered  
   **Then** system records guard event with degradation status  
   **And** fallback recommendation is returned.

## Tasks / Subtasks

- [x] Added reproducible retry path
  - [x] `retryEvalRun` reuses reproducibility key + version chain
  - [x] `POST /api/knowledge/evals/runs/[id]/retry`
  - [x] Retry audit action: `RAG_EVAL_RUN_RETRIED`
- [x] Added refresh guard service and APIs
  - [x] Guard event model: `rag_eval_refresh_guard_events`
  - [x] `POST /api/knowledge/evals/refresh-guard`
  - [x] `GET /api/knowledge/evals/refresh-guard`
  - [x] Degrade event audit action: `RAG_EVAL_REFRESH_GUARD_TRIGGERED`
- [x] Dashboard path integrates automatic guard trigger when refresh exceeds SLA

## Test Evidence

- `npx jest --runInBand "src/app/api/knowledge/evals/runs/\\[id\\]/retry/__tests__/route.test.ts"`
- `npm test -- --runInBand src/app/api/knowledge/evals/refresh-guard/__tests__/route.test.ts src/app/api/knowledge/evals/dashboard/__tests__/route.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added retry/recovery endpoint for failed eval runs with metadata continuity.
- 2026-03-19: Added refresh guard eventing and dashboard SLA degradation handling.

### File List

- ai-test-platform/my-app/prisma/schema.prisma
- ai-test-platform/my-app/prisma/migrations/20260319223000_add_rag_eval_ops/migration.sql
- ai-test-platform/my-app/src/lib/ai/rag/eval-service.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/runs/[id]/retry/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/runs/[id]/retry/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/refresh-guard/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/refresh-guard/__tests__/route.test.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/dashboard/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/dashboard/__tests__/route.test.ts
