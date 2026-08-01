# Design Operations Flow Catalog

All flows are orchestrated by Template & Theme Manager and preserve the distinction between theme (visual language) and template (structure).

| Flow | Implementation | Composes with | Required result |
|---|---|---|---|
| `choose-theme` | Full flow in `choose-theme.md` | Market Researcher, Art Director, Graphic Designer, Accessibility Checker, Brand Guardian | research -> five candidates -> samples/specs -> human selection -> theme card |
| `theme-from-brand` | Apply brand invariants as hard constraints, derive expressive variables, rotation-audit, then persist | Brand Guardian, Art Director | theme card without changing core identity |
| `template-from-theme` | Translate a selected theme into slots, hierarchy, grid, safe zones, responsive rules, component mapping, exports, and variants | Graphic Designer, asset-production | design-template record and QA handoff |
| `refresh-existing-theme` | Freeze recognizable invariants, identify dated elements, produce controlled revisions, compare, version | Art Director, Brand Guardian | semver revision and migration notes |
| `campaign-visual-direction` | Run choose-theme, establish mood board and hero, then define supporting asset family | Creative Director, asset-production | approved campaign direction linked to campaign record |
| `web-hero` | Candidate composition -> responsive breakpoints/reflow -> text/focal safe areas -> contrast/motion -> AVIF/WebP/SVG export budget | Graphic Designer, Accessibility Checker | responsive hero template and sample/spec |
| `landing-page-visual-system` | Extend web-hero through section rhythm, imagery rules, data/illustration direction, and component mapping | Graphic Designer, Product Designer | page-level theme/template system |
| `social-asset-family` | Preserve theme invariants across landscape, square, portrait and 9:16; define platform UI safe zones | Social Media Specialist, Graphic Designer | channel adaptation matrix and exports |
| `presentation-theme` | Define masters, title/content/data layouts, type scale, charts, imagery and accessible reading order | Graphic Designer, Accessibility Checker | presentation template record |
| `report-publication-theme` | Define cover, dividers, table/chart styles, accessible PDF/HTML behavior and print production | Reporting Specialist, Graphic Designer | publication template record |
| `design-review` | Run brand, hierarchy, contrast, legibility, reflow, licensing, dimensions, color mode, resolution, bleed, safe-zone, format and naming QA | Brand Guardian, Accessibility Checker, Quality Controller | signed review checklist |
| `theme-rotation` | Compare candidates against the last six registry events using weighted motif/palette/type/imagery overlap | Template & Theme Manager | repetition warning and differentiated recommendation |
| `archive-theme` | Set archived state and package source links, prompts, decisions, licenses, exports and reuse restrictions | Asset Manager | immutable archive manifest; usage history retained |

Campaign artifacts store links under `.aiwg/marketing/`; design records remain under `.aiwg/design/`.

