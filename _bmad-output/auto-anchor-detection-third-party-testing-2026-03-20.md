# Auto Anchor Detection - 第三方检测服务

Date: 2026-03-20

## Target

- PPT: `PPT/深圳智信方略工程咨询有限公司-V2026v2.1（带水印）.pptx`
- Target slide: `18`
- Target title: `第三方检测服务`

## Detection Basis

- Adjacent slides: previous `1-2` pages and next `1-2` pages
- Same-section service pages: `主营业务` 到 `第三方检测服务`
- Peer service pages: `全过程管理 / 咨询设计 / 工程监理 / 造价咨询`
- Exclusion rule:
  - case pages
  - list pages
  - appendix-like pages

## Auto-Detected Adjacent Anchors

### Accepted

1. Slide `17` - `造价咨询`
   - Reason:
     - directly adjacent to target slide
     - belongs to the same service-page family
     - uses a `title + service proposition + visual proof + right-side content` pattern
   - What to borrow:
     - title area proportion
     - service proposition placement
     - left proof image with right content balance
     - bottom supplemental strip logic
   - Confidence: `high`

2. Slide `16` - `工程监理`
   - Reason:
     - previous 2nd slide in the same service block
     - belongs to the same service-page family
     - has strong top-band + mid-content + bottom-band sectioning
   - What to borrow:
     - large service statement band
     - vertical zoning rhythm
     - chapter-family spacing
   - Confidence: `medium-high`

### Rejected

1. Slide `19` - `案例业绩`
   - Rejected because:
     - chapter switched from service summary to case section
     - not a service overview page
     - would distort the style family if used as a primary anchor

2. Slide `20` - `业绩清单-咨询设计`
   - Rejected because:
     - list page rather than summary page
     - table/list logic is not suitable for the target service overview layout

## Auto-Detected Peer Service Anchors

### Primary

1. Slide `17` - `造价咨询`
   - Why selected:
     - strongest structural similarity to target
     - same chapter, same granularity, same one-page service topic
   - Recommended use:
     - strongest peer anchor

2. Slide `16` - `工程监理`
   - Why selected:
     - same service section family
     - clear top/middle/bottom composition rhythm
   - Recommended use:
     - secondary anchor for zoning and weight distribution

3. Slide `15` - `咨询设计`
   - Why selected:
     - same service section family
     - same chapter-level role
   - Recommended use:
     - family-level anchor for title zone and general service-page tone

### Secondary

4. Slide `14` - `全过程管理`
   - Why selected:
     - same service family
     - useful for observing how the deck handles broader service introduction pages
   - Recommended use:
     - optional reference for section-level scale and visual weight

5. Slide `13` - `主营业务`
   - Why selected:
     - business-section overview page
     - useful for understanding the service chapter hierarchy
   - Recommended use:
     - chapter entry reference only, not a direct layout anchor

## Recommended Anchor Priority

1. Slide `17` - `造价咨询`
2. Slide `16` - `工程监理`
3. Slide `15` - `咨询设计`
4. Slide `14` - `全过程管理`
5. Slide `13` - `主营业务`

## Shared Service-Page Patterns Observed

- title stays in a stable top area across service pages
- service pages tend to keep one dominant message block rather than multiple unrelated zones
- proof imagery and explanatory content are often split into distinct left/right or top/bottom regions
- the service chapter uses strong banding and grouped content instead of dense paragraph stacking
- case and list pages begin immediately after the service block, so they should be excluded from visual anchoring

## Recommended Workflow Output For This Deck

- `auto_detected_adjacent_anchors`:
  - `17, 16`
- `auto_detected_peer_service_anchors`:
  - `17, 16, 15, 14, 13`
- `manual_override_needed`:
  - `optional`
- `manual_override_reason`:
  - only needed if the user wants to force stronger alignment to a specific service page
