---
name: workflow
description: 4-step standardized development workflow: Inquiry → Decomposition → Implementation → Acceptance. Use during development, or when user says "start dev", "enter workflow".
---

# Workflow (4-Step)

## Step 1: Inquiry (5-10 min)

- **Goal**: Turn vague ideas into concrete requirements
- **Method**: Socratic questioning (`socratic-inquiry`)
- **Output**: Clarified requirements doc

## Step 2: Decomposition (Documentation)

- **Goal**: Create executable dev checklist
- **Output**:
  - **PRD**: Features, user stories, acceptance criteria
  - **Tech spec**: Data models, APIs, routes
  - **Plan**: 5-8 dependency-ordered steps

## Step 3: Implementation (Iterative)

- **Goal**: Small steps, one feature at a time
- **Session template**:
  ```
  Read KIMI.md and progress.txt.
  
  Today's goal: [feature]
  
  Constraints:
  - Follow plan.md step X
  - TypeScript types first
  - Then component logic
  - Styles last
  - Confirm after each part
  ```

## Step 4: Acceptance (Checklist)

- **Goal**: Ensure quality, update progress
- **Checks**:
  1. Code review: Bugs, types, performance
  2. Spec check: KIMI.md rules compliance
  3. Validation: 3 test cases
  4. Update progress.txt

## Constraints

- No skipping steps
- Confirm before next step
- Return to current step if deviated

## Related Skills

- Step 1 → `socratic-inquiry`
- Step 2 → `task-planner` + `doc-system`
- Step 3 → `code-refactor` + `visual-coding`
- Step 4 → `code-review` + `debug-diagnosis`
