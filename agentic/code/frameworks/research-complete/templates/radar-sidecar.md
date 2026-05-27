---
ref: REF-XXX
title: "Short title of paper"
type: radar
refresh-cadence: quarterly    # one of: monthly, quarterly, biannual, annual, on-demand
last-refreshed: YYYY-MM-DD
last-refreshed-by: claude-opus | human | radar-init-scaffold
cluster: cluster-tag          # optional — from documentation/radar/clusters.yaml
grade-original: A             # GRADE at induction (A | A- | B | C | D)
grade-current: A              # this refresh's assessment
grade-trajectory: stable      # one of: rising, stable, declining, superseded, retracted
sources-searched: []          # populate on each refresh: semantic-scholar, arxiv, github, retractionwatch, pubpeer, ...
---

# REF-XXX Radar

**Paper**: [citation sidecar](../citations/REF-XXX-citations.md) · [analysis doc](../references/REF-XXX-*.md)
**Title**: {title}
**Last refreshed**: YYYY-MM-DD
**Next refresh due**: — (compute from cadence)
**Refresh rationale**: {why this cadence; what changed since last refresh}

---

## 1. GRADE Re-Assessment

| Attribute | At Induction | Current | Δ |
|---|---|---|---|
| GRADE letter | A | A | — |
| Peer-reviewed | — | — | — |
| Replication status | — | — | — |
| Retraction status | clean | clean | — |
| Author active | — | — | — |

**Rationale**: {1–3 sentences on what changed since induction, or "unchanged".}

## 2. Citation Signals

**As of YYYY-MM-DD:**

| Source | Count | Trend |
|---|---|---|
| Semantic Scholar | — | — |
| Google Scholar | — | — |
| OpenAlex | — | — |

## 3. Implementation / Code Signals

{Repos, reproductions, framework adoption since last refresh.}

## 4. News & Discussion

{HN / Reddit / X / newsletters / talks since last refresh.}

## 5. Retractions / Corrections / Concerns

| Category | Status | Detail |
|---|---|---|
| Retraction Watch | unchecked | — |
| PubPeer | unchecked | — |
| Formal corrigenda | none known | — |
| Methodology critiques | none known | — |
| Reproducibility attempts | — | — |

## 6. Notable Links

**Primary**:
- Analysis doc: [REF-XXX](../references/REF-XXX-*.md)
- Citation sidecar: [REF-XXX-citations.md](../citations/REF-XXX-citations.md)
- PDF: (in `pdfs/full/`)

## 7. Open Questions / Watch Items

{What should we watch for before the next refresh?}

## 8. Refresh History

| Date | Refreshed by | GRADE before → after | Key changes |
|---|---|---|---|
| YYYY-MM-DD | radar-init-scaffold | — → A | Initial scaffold (no signals gathered yet) |
