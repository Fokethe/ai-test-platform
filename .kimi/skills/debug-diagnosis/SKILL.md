---
name: debug-diagnosis
description: Systematic error analysis and fixing with multiple solutions. Use when user pastes error and says "fix this error", "analyze cause", or "runtime error".
---

# Debug Diagnosis

## Required Info

1. **Description**: One-sentence phenomenon
2. **Error**: ```[full stack trace]```
3. **Code**: ```[relevant snippet]```
4. **Expected**: What should happen
5. **Actual**: What actually happens

## Analysis Steps

1. **Root cause**: Why did this error occur?
2. **Solutions**: What options? Which to recommend?
3. **Fix code**: Complete fixed code
4. **Prevention**: How to avoid similar issues?

## Output Format

```
🔍 Analysis:
- Type: [e.g., TypeError]
- Root cause: [explanation]
- Location: [file:line]

💡 Solutions:
Recommended: [description]
Alternative: [other options]

📝 Fix:
```diff
[diff]
```

🛡️ Prevention:
- [tip 1]
- [tip 2]
```

## Constraints

- No guessing, analyze based on provided info
- Specific line numbers
- Multiple solutions

## Related Skills

- After fix: use `code-review` for quality check
- Use `danger-signals` to detect fix loops
