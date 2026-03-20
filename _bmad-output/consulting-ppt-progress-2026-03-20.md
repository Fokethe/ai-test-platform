# Consulting PPT Progress

Date: 2026-03-20

## Current Status

- Added the `consulting-ppt-architect` CIS agent and registered it in agent/help catalogs.
- Upgraded the workflow to a customization-first pattern that requests materials before generation and returns a rough PPT outline for confirmation.
- Produced a first updated PPT artifact:
  - `PPT/深圳智信方略工程咨询有限公司-V2026v2.1-第三方检测服务更新.pptx`
- Exported QA preview images for slide 18:
  - `_tmp_slide18_updated/slide18-updated.png`
  - `_tmp_slide18_updated/slide18-updated-v2.png`

## What Was Completed

- Kept the original company PPT intact and wrote changes to a new file.
- Rewrote the third-party testing overview copy to be more proposal-ready.
- Preserved the current template frame, certificate images, and global visual language.
- Ran one fix-and-recheck QA loop after finding lower-right text overflow.
- Added a dedicated intake mode that pauses generation until minimum customization materials are ready.
- Added a reusable customization brief template for asking the user for source materials, audience, emphasis priorities, and style constraints.
- Added a rough two-page PPT outline preview so the user can confirm direction before full copy generation.
- Split the intake flow into four business branches: consulting, design, supervision, and third-party testing.
- Added branch-specific intake templates and rough outline previews so the workflow can ask for more relevant materials before generation.
- Began upgrading the workflow from a direct-summary model to a `5-10 page source pool -> 2-3 page summary` model.
- Added a mandatory pre-generation interrogation layer so the workflow asks targeted questions before drafting.
- Added stronger style-match and typography-control rules to keep generated pages closer to the native PPT family.

## Key Issue Identified

The current one-page layout is too tight for richer third-party testing content.

Observed failure mode:

- lower-right service scope block overflows or wraps awkwardly
- card copy becomes too dense if each card carries both positioning and explanation
- the page is not resilient when adapting content from multiple reference company profiles

## Decision

Move from a single summary page to a two-page mini-section and formalize a reusable workflow with:

- PDF / Word / PPT reading
- large-file sharding and targeted retrieval
- template-first PPT mapping
- card style and text-fit constraints
- mandatory visual QA loop
- generation pause when required materials are missing
- rough template preview before full PPT copy generation
- automatic service-line template selection before intake
- mandatory user questioning before generation
- native deck style-match audit against adjacent and sibling slides
- typography hierarchy and formatting controls

## Recommended Next Output Shape

Page 1:

- positioning statement
- four capability cards
- qualification proof

Page 2:

- service scope matrix
- testing process or delivery flow
- application scenarios / deliverables
- standards / report outputs

## Files To Track Next

- `_bmad/cis/workflows/bmad-cis-consulting-ppt-flow/`
- `_bmad/cis/agents/consulting-ppt-architect.md`
- `_bmad/cis/module-help.csv`
- `_bmad/_config/bmad-help.csv`
