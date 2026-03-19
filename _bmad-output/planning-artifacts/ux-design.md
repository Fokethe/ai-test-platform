# UX Design - ai-test-platform-1

**Date:** 2026-03-19  
**Scope:** MVP + near-term implementation guidance

## 1. UX Goals

- Keep core quality workflow within 5 steps for primary roles.
- Ensure evidence traceability is visible and understandable.
- Reduce cognitive load in RAG-heavy flows through progressive disclosure.
- Meet baseline accessibility requirements aligned with WCAG 2.1 AA.

## 2. Primary Roles

- QA Engineer: creates and executes test assets quickly.
- QA Lead: compares strategy quality and controls risk/cost.
- Platform Admin: manages workspace, access, and governance setup.
- PM / Engineering Lead: reviews coverage risk and release readiness.

## 3. Key Journeys

### J1: Requirement to Test Assets

1. Ingest requirement text/document.
2. Review extracted test points.
3. Generate and refine CASE/SUITE/FOLDER assets.
4. Save and publish to project workspace.

### J2: Execution to Issue Closure

1. Start run from selected test scope.
2. Track execution status and failures.
3. Create issue from failed execution with context.
4. Link regression result and close issue lifecycle.

### J3: RAG Quality Operations

1. Select strategy/version and dataset.
2. Run evaluation batch.
3. Compare quality/cost metrics.
4. Adjust strategy and re-run.

### J4: Cross-role Release Gate

1. PM checks requirement coverage and risk.
2. Engineering Lead checks issue/regression trends.
3. Both review gate thresholds on shared dashboard.
4. Approve or block release with audit evidence.

## 4. Information Architecture (MVP)

- Dashboard
- Workspaces / Projects
- Requirements
- Tests
- Runs
- Issues
- AI Generate / AI Metrics
- Integrations / Notifications
- Settings (Auth, Roles, Prompt/Strategy controls)

## 5. Page-level UX Requirements

### Requirements Page

- Must support upload and paste input paths.
- Show extraction progress and editable grouped test points.
- Include requirement-to-testpoint trace links.

### Tests Page

- Support type-based creation (CASE/SUITE/FOLDER).
- Provide filter + search + pagination in one consistent control zone.
- Show source metadata (manual/AI/imported) visibly in list and detail.

### Runs Page

- Real-time status progression and retry/error indicators.
- Fast jump from failed execution to issue creation.

### Issues Page

- Show lifecycle states clearly (open -> in progress -> resolved -> closed).
- Provide regression linkage in issue detail timeline.

### AI Metrics Page

- Display retrieval, generation, evaluation, and cost in one unified view.
- Provide strategy version compare mode with explicit time range and dataset.

## 6. Interaction and Feedback Patterns

- Standard async states on all core pages:
  - loading
  - empty
  - error
  - data
- Destructive actions require confirmation with contextual impact text.
- Long-running tasks must provide progress and non-blocking background status.
- Failures must return actionable messages, not generic error text.

## 7. Accessibility Baseline

- Keyboard reachable for all primary actions.
- Visible focus indicators on interactive elements.
- Semantic headings and labels for forms/tables/dialogs.
- Color contrast consistent with WCAG 2.1 AA baseline.
- Status and errors announced in text, not color alone.

## 8. Responsive and Layout Rules

- Desktop-first data-dense layouts; mobile keeps critical actions first.
- Breakpoints:
  - Mobile: <= 767px
  - Tablet: 768-1023px
  - Desktop: >= 1024px
- On small screens, move secondary filters/settings into collapsible panels.

## 9. Design Constraints for Implementation

- Preserve existing design system and component patterns where present.
- Avoid introducing new visual frameworks for MVP stories.
- Prioritize consistency in navigation, table controls, and form behavior.

## 10. UX Acceptance Checklist (for stories)

- Journey step count remains within target where applicable.
- New UI includes loading/empty/error/data states.
- Keyboard and focus behavior verified for new interactions.
- Error copy provides user-actionable guidance.
- Cross-role dashboard views remain consistent in metric meaning.
