---
ref: REF-XXX
title: "Short title of paper"
type: citations
authors:
  - name: "Lastname, First"
    orcid: "0000-0000-0000-0000"    # add where available
    prof-id: PROF-P-slug             # add where resolved
  - name: "Lastname2, First"
affiliation-primary: PROF-O-slug     # primary author's org (PROF-O- ID or free text)
funders:                             # extracted from paper acknowledgements (omit list if none)
  - id: PROF-F-funder-slug
    grant-id: "AGENCY-GRANT-NUMBER"  # if stated; null if not
status: induction-complete           # optional: placeholder | pending-acquisition | acquisition-deficit
---

# REF-XXX Citation Network

## Outgoing: Papers This Work Cites

| # | Title | Authors | Year | DOI/URL | Inducted REF |
|---|-------|---------|------|---------|--------------|
| 1 | {cited title} | {Lastname et al.} | YYYY | arXiv:NNNN.NNNNN | REF-YYY |
| 2 | {cited title} | {authors} | YYYY | DOI / URL | — |
| ... | ... | ... | ... | ... | ... |

<!--
Outgoing rules:
- One row per distinct cited work in the paper's reference list (cap at ~30 most relevant
  if the paper has 100+ refs; note which references were cut and why in Notes).
- "Inducted REF" column links to corpus REFs when the cited work is in the corpus.
  Mark as "—" (em dash) when the cited work is not (yet) in the corpus.
- Authors column: "Lastname et al." for ≥4 authors; full list for ≤3.
- DOI/URL: prefer arXiv ID format `arXiv:NNNN.NNNNN` for arXiv preprints; DOI for
  peer-reviewed; URL for blog posts / technical reports.
- When an outgoing row points to an inducted REF, that target REF's Incoming table
  MUST contain a corresponding row pointing back here. See bidirectionality below.
-->

## Incoming: Papers That Cite This Work

| # | Title | Authors | Year | DOI/URL | Inducted REF |
|---|-------|---------|------|---------|--------------|
| 1 | {citing paper title} | {Lastname et al.} | YYYY | arXiv:NNNN.NNNNN | REF-ZZZ |
| 2 | ... | ... | ... | ... | ... |

<!--
Incoming rules:
- One row per in-corpus REF that cites this paper (the bidirectional pair to that REF's
  Outgoing table).
- For external (not-yet-inducted) citers, list known notable citations (high-impact
  follow-ups, replications, critiques) with "Inducted REF" marked "—".
- Backfill rule: when REF-A is induced and its Outgoing table lists REF-B (already in
  corpus), REF-B's Incoming table MUST be updated to include REF-A. The Tier-5 backlink
  fan-out (commit 2c5b014) automates this; manual induction follows the same rule.
- Empty state: until the paper accumulates citers, use a single row:
    | — | (none recorded yet; preprint posted YYYY-MM-DD) | — | — | — | — |
-->

## Notes

{Optional free-form notes about the citation network. Common patterns:

- **Hub character**: this paper sits at the center of {cluster name} cluster — note central
  REFs and the cluster's intellectual lineage.
- **Author overlap**: shared authors with REF-AAA, REF-BBB (same lab / research line).
- **Methodological lineage**: this paper extends / contradicts / parallels REF-XXX's approach.
- **External replication state**: known independent replications or rebuttals not yet inducted.
- **Reference list size**: total cited works in PDF vs included here (e.g., "PDF has 87 refs;
  this sidecar includes the 30 most relevant per Outgoing rules").

If acquisition is incomplete, document it here:
- "PDF not acquired (paywall); Outgoing references deferred."
- "Reference list extraction pending."
}

<!--
Format conventions (CLAUDE.md → "Citation Sidecars" section):
- Frontmatter `ref:` field MUST equal `REF-XXX` matching the filename.
- The sidecar pairs with documentation/references/REF-XXX-*.md (the analysis doc) and
  documentation/radar/REF-XXX-radar.md (the radar sidecar). All three share the same REF
  identifier and are kept in sync.
- The 6-column table format (`# | Title | Authors | Year | DOI/URL | Inducted REF`) is
  the canonical structure. A few older sidecars use 3-col or 5-col variants — those are
  accepted-state legacy but new sidecars should use 6-col.
- Bidirectional consistency is enforced by the corpus audit. See `/tmp/full-backlink-fanout.py`
  (audit P3 script) for the automated fan-out pattern when adding new REFs to a cluster.
-->
