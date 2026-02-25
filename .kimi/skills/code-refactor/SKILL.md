---
name: code-refactor
description: Safe code refactoring with backward compatibility. Use when the user says "refactor", "optimize code", "refactor {filename}", or "organize project structure".
---

# Code Refactor

## Strategy

1. **Dependency analysis**: Use Read/Glob to analyze file relationships
   - utils (bottom) → services (middle) → components (top)
2. **Batch modification**: Max 3 closely related files per batch
3. **Safety principles**:
   - Keep function signatures backward compatible
   - Output diff before modifying
   - Suggest `git add .` before applying changes

## Output Format

```
🔧 Refactor Plan: {module}
├── File 1: {name} - Change: {brief}
├── File 2: {name} - Change: {brief}
└── Dependency check: {affected files?}

[diff]
```

## Constraints

- Never auto-execute rm/drop commands
- Must ask "Apply these changes?" after modifications

## Related Skills

- Use `code-review` before refactoring
- Use `git-commit` after refactoring
