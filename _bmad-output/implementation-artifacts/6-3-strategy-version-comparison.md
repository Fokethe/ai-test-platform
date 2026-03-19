# Story 6.3: strategy-version-comparison

Status: review

## Story

As a QA Lead,  
I want to compare strategy versions on the same dataset version,  
so that I can choose the best strategy and detect regressions early.

## Acceptance Criteria

1. **Given** at least two strategy versions have eval runs on same dataset version  
   **When** comparison is requested  
   **Then** quality/cost/stability differences are returned  
   **And** anomalies are highlighted.
2. **Given** comparison indicates significant degradation  
   **When** reading result  
   **Then** rollback suggestion is included.

## Tasks / Subtasks

- [x] Added strategy comparison aggregator
  - [x] Computes summary over latest 3 completed runs per version
  - [x] Computes diff: quality/cost/stability
  - [x] Flags anomalies and rollback suggestion
- [x] Added export capability
  - [x] `toComparisonCsv` builder
  - [x] API `format=csv` returns exportable CSV content payload
- [x] Added comparison API
  - [x] `GET /api/knowledge/evals/compare`
  - [x] Access control + audit log integration

## Test Evidence

- `npm test -- --runInBand src/app/api/knowledge/evals/compare/__tests__/route.test.ts src/lib/ai/rag/__tests__/eval-service.test.ts`

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Implemented strategy version diff + anomaly/rollback recommendation.
- 2026-03-19: Added CSV export payload for comparison reports.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/eval-service.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/compare/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/compare/__tests__/route.test.ts
- ai-test-platform/my-app/src/lib/ai/rag/__tests__/eval-service.test.ts
