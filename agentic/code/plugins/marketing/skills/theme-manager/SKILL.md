---
namespace: aiwg
name: theme-manager
platforms: [all]
description: Research, compare, sample, select, persist, adapt, rotate, and archive reusable visual themes and design templates
triggers:
  - "pick a visual theme"
  - "create five hero directions"
  - "manage design templates"
  - "stop repeating the same aesthetic"
  - "choose a theme for this campaign"
  - "adapt this theme across channels"
  - "audit recent themes for repetition"
script:
  entrypoint: scripts/theme-manager.mjs
  runtime: node
  cwd: project-root
commandHint:
  argumentHint: '<project> [--flow choose-theme|theme-from-brand|template-from-theme|refresh-existing-theme|campaign-visual-direction|web-hero|landing-page-visual-system|social-asset-family|presentation-theme|report-publication-theme|design-review|theme-rotation|archive-theme] [--candidates 5] [--interactive]'
  category: design-operations
  orchestration: true
---

# Theme Manager

Manage the full lifecycle of visual themes and structural templates without requiring a design editor or image-generation provider.

## Natural-language routing

Use this skill for requests such as:

- “pick a visual theme”
- “create five hero directions”
- “manage design templates”
- “stop repeating the same aesthetic”
- “adapt this theme for social and presentations”

## Theme versus template

| Theme | Template |
|---|---|
| Visual idea, mood, palette, imagery, texture, typography and motion direction, metaphor, constraints, prohibited motifs | Content slots, hierarchy, responsive layout, safe zones, dimensions, component mapping, exports and channel variants |
| Validated by `schemas/theme.schema.json` | Validated by `schemas/design-template.schema.json` |

## Default workflow: choose-theme

1. Create or inspect `.aiwg/design/` and link any applicable `.aiwg/marketing/` campaign.
2. Capture brand, audience, season, channel, content, accessibility, licensing, production, and “do not repeat” constraints in a theme brief.
3. Read the registry and audit the most recent six uses. Call `auditThemeRotation` from `scripts/theme-manager.mjs` for every candidate.
4. Research timely and evergreen visual evidence. Every research item records URL, publication date when known, access date, evidence type, and license status. Clearly label subjective recommendations.
5. Produce five meaningfully different candidates by default. Keep source copy, content density, dimensions, and sample fidelity constant.
6. Score brand fit, audience fit, channel fit, accessibility, production feasibility, and distinctiveness. Explain trade-offs; do not select solely by numeric rank.
7. Detect provider capability:
   - image tool available: create one comparable sample per candidate plus generation metadata;
   - unavailable: create one production-grade prompt and layout specification per candidate.
8. Present the comparison and pause for human selection or revision. Never infer approval from silence.
9. Persist the chosen theme as JSON plus Markdown, selection decision, sources, accessibility notes, usage boundaries, and registry history.
10. Hand the selected theme to `template-from-theme` or `asset-production`, then run brand, accessibility, licensing, and technical QA.

Detailed state transitions and gates are in `flows/choose-theme.md`.

## Candidate contract

Each candidate must contain:

- stable ID and distinct name;
- visual language and metaphor;
- palette and typography direction;
- imagery, texture, graphic, and motion direction;
- prohibited motifs and usage boundaries;
- applicability and trade-offs;
- research citations with dates;
- comparable sample specification;
- weighted scores and theme-rotation audit.

## Provider fallback

Call `selectSampleMode({ imageGeneration: <capability> })` from the bundled script. Specification-only mode is a complete supported outcome, not an error. Both modes must produce a visual sample specification. Generated samples must disclose that production readiness still requires brand, accessibility, licensing, and technical QA.

## Persistence

Initialize the workspace:

```bash
aiwg run skill theme-manager -- init .
```

Record an approved selection:

```bash
aiwg run skill theme-manager -- record selected-theme.json .
```

Record a structural template separately:

```bash
aiwg run skill theme-manager -- record-template design-template.json .
```

Audit a candidate against recent history:

```bash
aiwg run skill theme-manager -- audit candidate.json .
```

Registry updates are append-only for usage history. Theme IDs are stable; revisions increment semantic versions.

## Web and graphic-production gates

Web deliverables must state breakpoints/reflow, text safe areas, focal-point behavior, 4.5:1 normal-text contrast unless a stricter target applies, non-text contrast, reduced motion, responsive image formats, and performance budgets.

Graphic and print deliverables must state physical/pixel dimensions, RGB/CMYK, resolution, bleed, safe zones, export formats, source format, and naming convention when applicable.

## Flow routing

See `flows/design-operations.md` for all supported flows and explicit mappings to existing roles and `asset-production`.

## Required templates

Use `templates/design-operations/` for the brief, candidate card, comparison matrix, visual sample specification, selected theme card, template specification, cross-channel matrix, QA checklist, and registry/history view.

## Completion

- [ ] Five comparable candidates produced unless the operator changed the count
- [ ] Research claims cited and dated
- [ ] Rotation audit completed
- [ ] Human selection recorded
- [ ] Theme and template persisted separately
- [ ] Provider mode disclosed
- [ ] Brand, accessibility, licensing, and technical QA recorded
- [ ] Usage history updated
