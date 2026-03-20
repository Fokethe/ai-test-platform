---
name: bmad-cis-consulting-ppt-flow
description: 'Customize consulting-company PPT decks through interrogation-led intake, style matching, 5-to-10-page source pooling, 2-to-3-page compression, copy generation, and QA.'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# Consulting PPT Workflow

**Goal:** Build or update engineering consulting PPT sections from mixed source files while preserving template consistency and preventing layout breakage.

**Your Role:** You are a consulting presentation workflow architect. Read source files, reduce them into reusable evidence, choose the right slide structure, and refuse to ship content that does not fit the template.

## Initialization

Load config from `{main_config}` and resolve:

- `output_folder`
- `user_name`
- `communication_language`
- `date` as the current system datetime

Paths:

- `skill_path` = `{project-root}/_bmad/cis/workflows/bmad-cis-consulting-ppt-flow`
- `template_file` = `./template.md`
- `materials_template_file` = `./references/customization-brief-template.md`
- `interrogation_template_file` = `./references/mandatory-interrogation-template.md`
- `default_interrogation_profile_file` = `./references/default-user-interrogation-profile.md`
- `source_pool_template_file` = `./references/pre-summary-source-pool-template.md`
- `rough_outline_template_file` = `./references/rough-ppt-outline-template.md`
- `service_line_map_file` = `./references/service-line-template-map.md`
- `style_match_checklist_file` = `./references/style-match-checklist.md`
- `auto_anchor_detection_file` = `./references/auto-anchor-detection-rules.md`
- `typography_guidelines_file` = `./references/typography-format-guidelines.md`
- `default_output_dir` = `{output_folder}/consulting-ppt-{date}`
- `default_output_file` = `{default_output_dir}/consulting-ppt-output.md`

If the workflow is launched with `data`, load that mode file first and use it to set the default delivery pattern.

Always communicate in `communication_language`.

## Core Rules

- Template first. Reuse an existing approved PPT style before suggesting a from-scratch deck.
- Style-match first. Before redesigning any page, inspect adjacent slides, same-section sibling slides, and peer service pages such as consulting, design, supervision, cost, and third-party testing so the new page still feels native to the existing deck.
- Interrogate first. Even if files are already provided, ask targeted questions before generation and wait for answers or explicit approval to use defaults.
- Full before summary. Collect enough material to support a 5-10 page candidate information pool before condensing it into a 2-3 page final summary.
- Beautify within the template. Improve hierarchy, spacing, typography, and card rhythm without drifting into a different visual language.
- Read source files by type:
  - PPT: extract slide text, inspect slide structure, and map reusable layouts.
  - Word: read document headings, section intent, and reusable phrasing.
  - PDF: extract what is readable, then create indexed summaries if the file is large.
- If extracted content is too large to reason over comfortably, split it before synthesis.
- Every output must trace claims to source materials or clearly mark them as proposed wording.
- Every PPT generation pass must include a visual fit review.
- If required inputs are missing, output the customization intake template from `{materials_template_file}`, the mandatory questions from `{interrogation_template_file}`, the 5-10 page source-pool template from `{source_pool_template_file}`, and the rough PPT outline preview from `{rough_outline_template_file}`, list the gaps, and stop before page architecture.

## Minimum Materials For Customization

Before generation, verify the following minimum set:

1. Task goal and target section or deck
2. Audience and presentation scenario
3. A base PPT template or approved visual reference
4. Style anchors:
   - slides or pages the user wants to match
   - or explicit approval to infer from adjacent slides and peer service pages
5. Enough usable content to support at least 5 logical content modules from the list below:
   - positioning
   - qualifications
   - team
   - service scope
   - process
   - standards
   - deliverables
   - cases
   - value
   - scenario
6. At least one usable content source:
   - company deck
   - Word brief
   - PDF profile
   - service notes
7. A priority list of what must be emphasized
8. A list of what must not appear or must be weakened

If any of the above is missing, pause generation and request it explicitly.

## Mandatory User Interrogation Before Generation

Before any page architecture, ask and record answers to the mandatory question set from `{interrogation_template_file}`.

If `{default_interrogation_profile_file}` exists:

- load it first
- treat it as the user's persistent baseline preferences
- prefill the known answers
- ask only for changed items, missing items, or task-specific deltas
- let the user override the defaults at any time for the current task

The persistent profile is a starting point, not a forced answer set.

At minimum, confirm:

1. Who the deck must persuade
2. What action the deck should trigger
3. What the audience cares about most
4. What must be emphasized
5. What must be avoided
6. Which current slides feel most right
7. Which current slides feel least right
8. Whether the user allows a 3rd summary page
9. Which cases, certificates, or standards must appear
10. Whether defaults may be used when a detail is still unknown

Do not proceed unless the user:

- answers the questions, or
- explicitly approves using defaults for the unanswered items

## Service-Line Template Selection

Before intake, resolve the active service line:

1. `consulting`
2. `design`
3. `supervision`
4. `third-party-testing`
5. `mixed` when the request covers more than one line

Use `{service_line_map_file}` to select the matching branch intake template and rough outline template.

Selection rules:

- Infer the service line from the user's requested section when possible.
- If the section spans multiple lines, record the priority order and classify as `mixed`.
- If the service line is still unclear, ask the user to choose before content planning.
- For `mixed`, use the generic intake template first, then append the branch-specific items for each included line.

## File Intake Strategy

When source files are provided, classify them into:

1. Primary template
2. Qualification evidence
3. Case study reference
4. Competitive wording reference
5. Supplemental standards or scope material

For large inputs use this order:

1. Create a lightweight index of sections, pages, or slides.
2. If a text extract exceeds roughly 500 lines or contains multiple unrelated sections, split it into shards by topic.
3. Retrieve only the shards relevant to the active topic:
   - company profile
   - qualifications
   - service scope
   - cases
   - standards
   - deliverables
4. Synthesize from the retrieved subset, not the full corpus.

Use existing BMAD support skills when available:

- `bmad-index-docs` for quick source indexing
- `bmad-shard-doc` for large extracted text

## Style-Match Audit Requirements

Load `{auto_anchor_detection_file}` before selecting style anchors.

Before redesigning the target section, inspect:

1. The target slide itself
2. The previous 1-2 slides
3. The next 1-2 slides
4. At least 2 sibling service pages from the same deck family
5. At least 2 peer service pages from the same business-section family, for example:
   - consulting
   - design
   - supervision
   - cost
   - third-party testing
6. Any user-specified pages to emulate or avoid

When the source is a PPT, do not rely on manual anchor selection alone.

First auto-detect:

- adjacent anchors
- same-section anchors
- peer service anchors

Then merge:

- user-specified anchors
- auto-detected anchors

Then rank:

1. user-specified same-family service pages
2. auto-detected peer service pages
3. adjacent slides
4. other same-section slides

If auto-detection fails to find enough peer service pages, ask the user for manual overrides.

Capture and preserve:

- title position and title size
- subtitle treatment
- dominant Chinese and English font families
- size ladder for title, section label, card title, body, caption
- recurring color tokens
- card border radius, stroke weight, and shadow behavior
- image cropping and proof-image treatment
- icon style
- spacing rhythm and grid alignment
- shared service-page composition patterns across design, cost, supervision, consulting, and testing pages

If a proposed card style feels more like a new deck than an upgraded slide from the same deck, reject it and simplify it.

## Typography And Format Rules

Use these defaults unless the target deck proves otherwise:

- Inherit the dominant font family from the target PPT first.
- Prefer one Chinese font family and one English/number companion at most.
- Improve elegance through weight, spacing, line height, and alignment before changing font families.
- Keep title, card title, body, and caption sizes on a stable ladder.
- Avoid random bolding, mixed alignment logic, and over-tight line spacing.
- If text does not fit:
  - shorten copy first
  - redistribute content second
  - add a 3rd page before shrinking below the template's readable size

## Large-To-Small Compression Model

This workflow must move from large to small:

1. First collect enough evidence to support a 5-10 page candidate deck.
2. Then organize that evidence into a long-form source pool.
3. Then compress the pool into a 2-3 page summary mini-section.
4. Record what was cut, merged, or downgraded during compression.

## PPT Template Constraints

Use these defaults unless the target template proves otherwise:

- Summary mini-section defaults to 2-3 pages.
- Card title target: 4-8 Chinese characters.
- Card body target: 28-42 Chinese characters, usually 2-3 lines.
- Lower-right dense list areas: no more than 2 lines per bullet row in the current template family.
- Do not force three concepts into a two-line slot by shrinking fonts aggressively.
- If text does not fit:
  - shorten copy first
  - split content second
  - add a second page before reducing readability

Card style guidance:

- Prefer fewer, stronger cards over many weak cards.
- Each card should carry one clear message only: qualification, team, equipment, delivery, scenario, or value.
- Use visual grouping with consistent padding and identical card heights.
- Avoid mixed sentence lengths that produce ragged bottoms.
- Treat certificate and proof imagery as supporting evidence, not decoration.

## Recommended Two-To-Three-Page Pattern For Third-Party Testing

### Page 1: Capability Positioning

- section title
- short service proposition
- 3 or 4 capability cards
- qualification proof

### Page 2: Service Scope And Delivery

- service scope matrix or grouped bullets
- testing process or delivery steps
- typical scenarios
- standards and output deliverables

### Page 3: Proof And Cases (Optional)

- certificate highlights
- report or deliverable proof
- typical cases
- scope boundary notes

This pattern is preferred over compressing all content into one page or summarizing directly from sparse inputs.

## QA Gate

You must complete at least one fix-and-recheck loop before delivery.

Check for:

- overflow in lower-right dense text zones
- card body wrapping beyond intended visual rhythm
- uneven card heights caused by copy length
- icon and text misalignment
- lists that wrap into awkward hanging lines
- claims that sound stronger than the evidence supports
- typography that drifts from the deck family
- components that look imported from another template
- loss of style continuity with adjacent slides

If any of these appear, revise copy and re-check before finalizing.

## Execution

<workflow>

<step n="1" goal="Clarify the PPT task, interrogate the user, and collect customization materials">
Collect:

- target file or template
- requested section to update or create
- service line
- audience
- purpose
- desired page count
- emphasis priorities
- must-keep branding or layout constraints
- pages or slides to match
- pages or slides to avoid
- same-family service pages to inspect, such as design, cost, supervision, consulting, or testing
- font and formatting preferences
- whether a 3rd page is acceptable
- available source files and notes

Resolve the service line and the matching branch templates before checking completeness:

- load `{service_line_map_file}`
- determine `service_line`
- determine `selected_materials_template`
- determine `selected_rough_outline_template`
- if `service_line = mixed`, record the included lines and their priority order

Check the minimum materials set.

If the workflow mode is `materials-intake`, or if the minimum materials are not ready:

- load `{materials_template_file}`
- load `{interrogation_template_file}`
- load `{default_interrogation_profile_file}` when available
- load `{source_pool_template_file}`
- load `{rough_outline_template_file}`
- load `{style_match_checklist_file}`
- load `selected_materials_template` when available
- load `selected_rough_outline_template` when available
- output the mandatory interrogation checklist first
- if a persistent profile exists, show the prefilled answers first and ask only for changes or additions
- output a concise customization intake checklist
- output the 5-10 page source-pool checklist
- show the template with the missing items highlighted
- show a rough PPT outline preview with replaceable fields and recommended page count
- show which current PPT pages should be provided as style anchors
- show which peer service pages should be inspected as same-family anchors
- if the target is a PPT, show that anchor pages will be auto-detected first and then confirmed or overridden by the user
- show the selected service line and which branch template is being used
- record missing items in the output artifact
- record the provisional page skeleton in the output artifact
- stop and wait for the user to provide materials

Do not continue to page architecture when required materials are still missing.
Do not continue if the mandatory questions are still unanswered and the user has not approved defaults.

If page count is not specified, choose the smallest count that preserves readability. For third-party testing summary content, default to 2-3 pages. For mixed overview requests spanning multiple service lines, default to 2-4 pages.
</step>

<step n="2" goal="Build a 5-10 page candidate source pool before summarizing">
Create a source inventory.

For each source:

- identify file type
- identify likely relevant sections
- decide whether direct reading is enough
- if too large, index first and shard by topic

Record the retrieval plan in the output artifact.

If the source set is rich but poorly organized, group it into:

- company baseline
- qualifications
- cases
- service scope
- standards
- deliverables

Build a candidate module pool that could support 5-10 pages, for example:

- positioning
- qualification proof
- team capability
- service scope
- process
- standards
- deliverables
- cases
- customer value
- scenario coverage

If fewer than 5 modules can be supported credibly, pause and ask the user for more material before writing any summary content.

Record the candidate module pool and evidence coverage in the output artifact.
</step>

<step n="3" goal="Auto-detect anchor slides, audit peer service pages, and define style-matching rules">
Load `{style_match_checklist_file}`, `{auto_anchor_detection_file}`, and `{typography_guidelines_file}`.

If the primary source is a PPT:

- auto-detect the target slide index
- auto-detect adjacent anchors from the previous 1-2 slides and next 1-2 slides
- auto-detect same-family peer service pages by scanning slide titles and section labels
- prefer service overview pages over case-list or appendix pages
- record the auto-detection basis and confidence
- allow the user to override the detected anchors

If the source is not a PPT:

- ask the user to nominate style-anchor pages from an approved PPT reference
- do not pretend automatic anchor detection is available without a PPT source

Analyze the target PPT style and reusable layout zones.

Explicitly identify:

- style anchor slides
- peer service slides
- auto-detected adjacent anchors
- auto-detected peer service anchors
- safe card areas
- dense list areas
- image proof areas
- title and subtitle zones
- dominant fonts
- size ladder
- color tokens
- card shape language
- spacing rhythm
- common structure patterns reused across consulting, design, supervision, cost, and testing pages

Reject any redesign that will overstuff a slide or look visually foreign to the surrounding pages.
</step>

<step n="4" goal="Compress the 5-10 page source pool into a 2-3 page summary strategy">
Choose the final page count based on readability and evidence density.

Record:

- what will be kept
- what will be merged
- what will be cut
- why 2 pages or 3 pages is the right size
</step>

<step n="5" goal="Map condensed content to native template structures">
Map the condensed content to the target PPT's native layout language.

Explicitly identify:

- reused layout behaviors
- upgraded card behaviors that still match the deck
- typography rules to inherit
- formatting boundaries that must not be crossed
</step>

<step n="6" goal="Design page architecture">
Build a page blueprint before writing full copy.

For each page define:

- page objective
- content modules
- visual role
- expected text density

Prefer splitting when one page tries to do both positioning and detailed scope.

Always reflect the user's customization priorities:

- scenario-specific angle
- audience-specific proof
- required emphasis order
- content that must not appear
</step>

<step n="7" goal="Write slide copy">
Write concise PPT-ready copy using only the content needed for the chosen layout.

For cards:

- one message per card
- no stacked sub-arguments inside the same card

For dense bullets:

- compress into short, scannable noun phrases
- move secondary explanation to another page if needed
</step>

<step n="8" goal="Run QA and revision loop">
Audit the draft against the template constraints and QA gate.

If any text looks likely to overflow or create uneven rhythm:

- shorten the copy
- redistribute to a second page
- redistribute to a third page when needed
- simplify cards

Also check:

- whether the new pages still feel like the same PPT family
- whether font hierarchy is cleaner than before
- whether the page is too summary-light because the source pool was underbuilt

Record the issue and the fix in the output artifact.
</step>

<step n="9" goal="Produce final output">
Write the final structured result to `{default_output_file}` using `{template_file}`.

Include:

- user interrogation summary
- customization brief
- readiness check
- materials request status
- source intake summary
- candidate 5-10 page source pool
- style-match audit
- typography and format plan
- compression strategy
- retrieval plan
- template mapping
- two-page or three-page blueprint where applicable
- PPT-ready slide copy
- QA fixes and final status

Confirm completion and show the saved file path.
</step>

</workflow>
