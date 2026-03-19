# Story 6.2: quality-cost-dashboard

Status: review

## Story

As a QA Lead,  
I want one dashboard payload for retrieval/generation/evaluation/cost metrics,  
so that quality and cost anomalies can be identified quickly.

## Acceptance Criteria

1. **Given** project and time range are selected  
   **When** loading eval dashboard  
   **Then** retrieval/generation/evaluation/cost metrics are returned in one response  
   **And** role-scoped visibility is applied.
2. **Given** new eval results arrive  
   **When** dashboard refreshes  
   **Then** trend data updates with refresh latency metadata  
   **And** SLA readiness can be monitored.

## Tasks / Subtasks

- [x] Added quality-cost dashboard aggregation service
  - [x] Retrieval metrics: precision/recall
  - [x] Generation metrics: faithfulness/groundedness
  - [x] Evaluation metrics: quality score and run count
  - [x] Cost metrics: total + average per run
  - [x] Daily trend rollup
- [x] Added role-aware payload shaping
  - [x] `admin`: full metrics
  - [x] `member`: full metrics
  - [x] `guest`: hide cost block
- [x] Added dashboard API
  - [x] `GET /api/knowledge/evals/dashboard`
  - [x] Access control + audit log integration

## Test Evidence

- `npm test -- --runInBand src/app/api/knowledge/evals/dashboard/__tests__/route.test.ts`
- `npx eslint src/app/api/knowledge/evals/dashboard/route.ts src/lib/ai/rag/eval-service.ts` (0 error, complexity warnings only)

## Dev Agent Record

### Agent Model Used

gpt-5-codex

### Completion Notes List

- 2026-03-19: Added unified quality-cost dashboard payload and trend aggregation.
- 2026-03-19: Added role-scoped metric visibility in dashboard API.

### File List

- ai-test-platform/my-app/src/lib/ai/rag/eval-service.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/dashboard/route.ts
- ai-test-platform/my-app/src/app/api/knowledge/evals/dashboard/__tests__/route.test.ts
