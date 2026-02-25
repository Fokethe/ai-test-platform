---
name: task-planner
description: Complex task decomposition and planning. Use when the user says "implement", "develop", "build a system", "add feature", or "from scratch" with multi-step requirements.
---

# Task Planner

## Steps

1. **Pause coding**: Don't write code immediately
2. **Output plan**:
   ```
   📋 Execution Plan: {task}
   Est. total cost: ${cost} | ~{n} rounds
   
   Phase 1: Preparation & Research
   - Analyze existing code structure
   - Identify dependencies
   
   Phase 2: Implementation
   - {step1} → Output: {file}
   - {step2} → Output: {file}
   
   Phase 3: Verification
   - Run tests / check errors
   ```
3. **Wait for confirmation**: "Execute this plan? Or adjustments?"
4. **Phase execution**: Output progress after each phase, ask "Continue to next phase?"

## Commands

- `/next` - Continue to next phase
- `/plan` - Regenerate task plan
