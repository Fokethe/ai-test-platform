# Service Line Template Map

Use this map during step 1 to resolve which branch template kit should be used before PPT generation.

| Service line | Typical keywords | Intake template | Rough outline template | Default page guidance |
|---|---|---|---|---|
| consulting | 咨询, 顾问, 可研, 策划, 前期研究, 决策支持 | `./references/service-lines/consulting-intake.md` | `./references/service-lines/consulting-outline.md` | 2 pages |
| design | 设计, 方案设计, 初设, 施工图, BIM, 专项设计 | `./references/service-lines/design-intake.md` | `./references/service-lines/design-outline.md` | 2 pages |
| supervision | 监理, 项目管理, 驻场, 质量控制, 进度控制, 安全管理 | `./references/service-lines/supervision-intake.md` | `./references/service-lines/supervision-outline.md` | 2 pages |
| third-party-testing | 第三方检测, 第三方测评, 检测, 测试, 评估, CMA, CNAS | `./references/service-lines/third-party-testing-intake.md` | `./references/service-lines/third-party-testing-outline.md` | 2 pages |
| mixed | 概括页, 综合介绍, 多业务线, 咨询+设计, 设计+监理 | `./references/customization-brief-template.md` | `./references/rough-ppt-outline-template.md` | 2-4 pages |

## Selection Notes

- Prefer the most specific line that matches the requested section title.
- If the user asks for a combined overview page covering multiple lines, classify it as `mixed`.
- If a section belongs to one line but borrows proof from another, keep the primary line and note the borrowed proof source in the output artifact.
