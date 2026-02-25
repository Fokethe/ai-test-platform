---
name: code-review
description: Systematic code quality review covering readability, performance, and security. Use when the user says "review code", "review", "check this code", or "what's wrong with this".
---

# Code Review

## Checklist

- [ ] **Readability**: Semantic variable names? Functions < 50 lines?
- [ ] **Duplication**: Extractable common logic?
- [ ] **Error handling**: Async errors, nulls, edge cases handled?
- [ ] **Performance**: Nested loops, repeated calculations?
- [ ] **Security**: SQL injection, XSS, hardcoded secrets?
- [ ] **Type safety**: TypeScript `any` abuse?

## Output Format

```
🔍 Review: {filename}
Risk: 🔴 High / 🟡 Medium / 🟢 Low

Issues:
1. [Issue] - Suggest: [fix]

Optimizations:
- Extract function: {name} (repeated at X,Y lines)
- Rename: {old} → {new}

✅ Keep: {well-written parts}
```

## Best Practices

- Review before committing
- Review before refactoring
- Combine with `danger-signals` for potential issues
