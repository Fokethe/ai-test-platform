---
name: visual-coding
description: Pixel-perfect design-to-code conversion with responsive derivation. Use when user uploads image/screenshot and says "implement this design", "replicate this UI", or "screenshot to code".
---

# Visual Coding

## Process

1. **Structure analysis**: "What page is this, what modules?"
2. **Pixel-perfect**:
   - Colors: Exact match
   - Spacing: Tailwind scale
   - Fonts: Size and weight match
   - Radius: Match border-radius
3. **Layout**: Flex/Grid, no absolute positioning (except floating buttons)
4. **Responsive**: Derive mobile from desktop, explain fold/stack strategy
5. **Interaction**: All buttons have hover/active states
6. **Componentization**: Header/Content/Sidebar etc.

## Output Format

```
📐 Structure:
- Page type: [e.g., dashboard]
- Modules: [list]

🎨 Design Specs:
- Primary: [color]
- Spacing: [e.g., 16px base]
- Typography: [size hierarchy]

💻 Implementation:
[code]
```

## Constraints

- Analyze before coding
- Ask when uncertain
- Complex UI: output components separately
