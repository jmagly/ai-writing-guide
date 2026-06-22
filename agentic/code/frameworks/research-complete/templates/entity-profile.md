---
prof-id: PROF-{TYPE}-{slug}
name: ""
type: person                # person | org | funder | group | source | channel | feed | venue
# NOTE: for type: source (discovery curators, PROF-S-), use the dedicated
# source-profile template — see SOURCE-TRACKING / the discovery subsystem (#1499).
affiliation: ""             # current primary affiliation (PROF-O- slug or free text)
aliases: []                 # name variants: ["A. Smith", "Smith, Andrew"]
corpus-refs: []             # list of REF-XXX identifiers where this entity appears
roles:                      # entity's role in each corpus REF
  REF-XXX: primary-author   # primary-author | co-author | speaker | host | channel | venue | org | funder | mentioned
affiliations: []            # temporal affiliations (person type)
  # - org: PROF-O-slug
  #   start: YYYY
  #   end: null             # null = current
research-areas: []          # AREA-{slug} identifiers
funders: []                 # PROF-F-slug list (for org/person type)
refresh-cadence: semi-annual  # quarterly | semi-annual | annual | on-demand
last-refreshed: YYYY-MM-DD
last-refreshed-by: ""
grade-influence: "—"        # A | B | C | D | — (corpus-local influence grade)
grade-trajectory: unknown   # rising | stable | declining | unknown
sources-searched: []        # semantic-scholar | google-scholar | orcid | arxiv | lab-page | linkedin
---

# {Name} — Entity Profile

**Type**: {Person | Organization | Funder | Group | Channel | Feed | Venue}
**Profile ID**: `{prof-id}`
**Last refreshed**: {YYYY-MM-DD}
**Next refresh due**: {YYYY-MM-DD}

---

## 1. Entity Summary

{One paragraph: who/what this entity is, primary affiliation, research identity. For people: career phase, core expertise, institutional context. For speakers in time-based media, record the verified speaker role and do not infer authorship. For orgs/channels/feeds/venues: publishing identity, host organization, research mission, scale. For funders: scope, primary areas funded.}

**Research Identity**: {One sentence core descriptor.}
**Affiliation**: {Current primary org, with link to PROF-O- profile if exists.}
**Active Since**: {Year of first corpus appearance or founding year.}

---

## 2. Corpus Presence

| REF | Title | Role | Year | GRADE |
|---|---|---|---|---|
| [REF-XXX](../references/REF-XXX-*.md) | {Short title} | primary-author | YYYY | A |
| [REF-YYY](../references/REF-YYY-*.md) | {Media title} | speaker | YYYY | B+ |

**Total corpus appearances**: N
**Date range**: YYYY – YYYY
**Most recent**: REF-XXX ({Year})

For time-based media:
- Speakers reuse `PROF-P-<slug>` with role `speaker`, `host`, `interviewer`, or `panelist`.
- Channels, podcast feeds, conference series, courses, and recording venues may
  use `PROF-O-<slug>` when they are stable organizations or venues.
- Discovery feeds/accounts use the dedicated `PROF-S-<slug>` source profile.

---

## 3. Research Focus Profile

{Weighted topic map derived from §2 paper Document Profiles. List topics by frequency, with paper count.}

| Topic / Area | Papers | Representative REFs |
|---|---|---|
| {Topic} | N | REF-XXX, REF-YYY |

**Primary area**: {Most frequent topic}
**Secondary areas**: {2nd, 3rd most frequent}
**Topic trajectory**: {stable | drifting toward X | pivoting from Y to Z}

---

## 4. Influence Radar

{Quantitative influence metrics. Populated by `/profile` skill analytics or manual computation.}

| Metric | Value | Corpus Rank | Notes |
|---|---|---|---|
| h-index (corpus-local) | — | — | Papers where in-corpus citation count ≥ rank |
| PageRank (citation graph) | — | — | Recursive prestige via citations |
| Mean CD-index | — | — | +1 = fully disruptive, -1 = fully consolidating |
| Novelty score | — | — | Atypicality of reference combinations |
| Eigenvector centrality | — | — | Influence of collaborators |
| Betweenness centrality | — | — | Bridge score: spans research communities |

**Influence Grade**: {A | B | C | D | —}
**Grade Trajectory**: {rising | stable | declining | unknown}
**Grade Rationale**: {1-2 sentences justifying the grade and trajectory.}

---

## 5. Collaboration Network

{Co-authors, partner orgs, funder links. Populated at create/refresh time.}

### Frequent Co-Authors (corpus)

| Researcher | Shared Papers | Profile |
|---|---|---|
| {Name} | N | [PROF-P-slug](../people/PROF-P-slug.md) or — |

### Partner Organizations

| Org | Relationship | Profile |
|---|---|---|
| {Org name} | affiliated-with | [PROF-O-slug](../orgs/PROF-O-slug.md) or — |

**Network position**: {embedded (high clustering, low betweenness) | bridge (low clustering, high betweenness) | hub (high degree) | peripheral}
**Research community**: {Community label from Louvain detection, if available}

---

## 6. Funding & Institutional Context

{Lab affiliation history, grant acknowledgements extracted from paper PDFs, funder lineage.}

### Affiliation History

| Period | Organization | Role |
|---|---|---|
| YYYY – present | {Org} | {researcher/PI/director/etc.} |

### Funding Acknowledgements (corpus papers)

| REF | Funder | Grant ID |
|---|---|---|
| REF-XXX | {Funder} | {grant-id or —} |

---

## 7. Publication Trajectory

{Year-by-year table from corpus appearances. Topic drift computed from Document Profile key topics.}

| Year | Papers | Top Topics | Venues | Co-authors (unique) | Topic Drift |
|---|---|---|---|---|---|
| YYYY | N | {topics} | {venues} | N | — |

**Trajectory annotation**: {Accelerating | stable | decelerating; topic stability note.}
**Hot streak**: {Active since YYYY (N years, M A-grade papers) | None detected}

---

## 8. Active Research Fronts

{Most recent 3–5 REFs with topic tags. Updated at each refresh.}

| REF | Title | Year | Topics | GRADE |
|---|---|---|---|---|
| REF-XXX | {title} | YYYY | {topics} | A |

**Current focus**: {1 sentence on where this entity's work is pointing right now.}

---

## 9. Upcoming Watch Items

{Anticipated papers, conference appearances, lab direction signals, collaboration predictions.}

1. **{Watch item}**: {Description and why it matters.}
2. **Predicted collaboration** (if node2vec similarity available): {Researcher X — 0.NN similarity, shared topics, no current shared papers.}

---

## 10. Notable Works

{Top contributions by different criteria.}

### Highest-GRADE corpus papers
| REF | Title | GRADE | Year |
|---|---|---|---|

### Most-cited in corpus
| REF | Title | In-corpus citations | Year |
|---|---|---|---|

### Landmark contributions
{Free-form description of 1-3 contributions that are objectively significant beyond the corpus.}

---

## 11. Retractions / Concerns

{Track record signals across all affiliated corpus papers. Populated at refresh.}

- **Retraction watch**: {Clean | see REF-XXX}
- **Corrigenda**: {None | see REF-XXX}
- **Ongoing concerns**: {None | description}

---

## 12. External Links

| Resource | URL | Notes |
|---|---|---|
| Lab / Personal site | — | |
| Google Scholar | — | |
| Semantic Scholar | — | |
| ORCID | — | Person only |
| arXiv author page | — | |
| LinkedIn | — | Optional |

---

## 13. Cross-References

**Same lab / parent org**: {link or —}
**Funder**: {link or —}
**Sub-orgs / spin-offs**: {link or —}

### Related Profiles (node2vec similarity)

| Rank | Profile | Similarity | Shared papers | Common topics |
|---|---|---|---|---|
| 1 | — | — | — | — |

---

## 14. Refresh History

| Date | Refreshed by | Grade before → after | Key changes |
|---|---|---|---|
| {YYYY-MM-DD} | {agent/human} | — → {grade} | Initial profile creation. |

---

## 15. Notes

{Free-form observations: known biases in corpus coverage, disambiguation notes, relationship context, anything that doesn't fit the structured sections.}
