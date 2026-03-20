# OW Output - Consulting PPT Workflow Optimization

Date: 2026-03-20

## User Feedback Addressed

1. 风格不够匹配同 PPT 其他页
2. 定制化程度不够，生成前没有主动审问
3. 格式字体不够美观
4. 工作流应从大到小，先收集 5-10 页信息，再浓缩成 2-3 页

## Workflow Changes

- Added a mandatory pre-generation interrogation stage
- Added a native style-match audit against adjacent and sibling slides
- Strengthened style matching by requiring peer service-page comparison across consulting, design, supervision, cost, and testing pages
- Added automatic anchor detection so the workflow first discovers adjacent slides and same-family service pages before asking for manual overrides
- Added a persistent default interrogation profile so known user preferences are prefilled and only delta questions need to be asked
- Added typography and formatting rules to improve elegance without breaking deck consistency
- Changed the generation model from direct summary to:
  - `5-10 page source pool`
  - `2-3 page compression`

## New Reference Files

- `references/mandatory-interrogation-template.md`
- `references/default-user-interrogation-profile.md`
- `references/pre-summary-source-pool-template.md`
- `references/style-match-checklist.md`
- `references/auto-anchor-detection-rules.md`
- `references/typography-format-guidelines.md`

## Expected Behavior After Optimization

- The workflow should ask the user targeted questions before drafting
- The workflow should request enough material for a richer source pool first
- The workflow should infer less and confirm more
- The workflow should produce pages that look closer to the surrounding PPT pages
- The workflow should prefer 2-3 page summaries backed by a larger information base
