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
discovery:                           # optional source-tracking block (see discovery subsystem)
  date: YYYY-MM-DD
  surface: x-search                  # x-account|x-search|rss|newsletter|web|referral|direct|...
  via: "source handle or URL"
  curator-id: PROF-S-slug            # PROF-S backlink; omit/null if no curator
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
- One row per distinct cited work in the paper's reference list (cap at ~30 most
  relevant if the paper has 100+ refs; note which were cut, and why, in Notes).
- "Inducted REF" links to corpus REFs when the cited work is in the corpus; "—"
  (em dash) when it is not (yet).
- Authors: "Lastname et al." for ≥4 authors; full list for ≤3.
- DOI/URL: prefer `arXiv:NNNN.NNNNN` for preprints; DOI for peer-reviewed; URL otherwise.
- Bidirectionality: when an Outgoing row points to an inducted REF, that target REF's
  Incoming table MUST contain a corresponding row pointing back here.
-->

## Incoming: Papers That Cite This Work

| # | Title | Authors | Year | DOI/URL | Inducted REF |
|---|-------|---------|------|---------|--------------|
| 1 | {citing paper title} | {Lastname et al.} | YYYY | arXiv:NNNN.NNNNN | REF-ZZZ |
| 2 | ... | ... | ... | ... | ... |

<!--
Incoming rules:
- One row per in-corpus REF that cites this paper (the bidirectional pair to that
  REF's Outgoing table).
- For external (not-yet-inducted) citers, list notable ones (high-impact follow-ups,
  replications, critiques) with "Inducted REF" marked "—".
- Backfill rule: when REF-A is induced and its Outgoing lists REF-B (already in corpus),
  REF-B's Incoming MUST be updated to include REF-A.
- Empty state until the paper accumulates citers:
    | — | (none recorded yet; preprint posted YYYY-MM-DD) | — | — | — | — |
-->

## Outgoing: Spoken References and Informal Mentions

| # | Reference / mention text | Timestamp | Quote | Type | Inducted REF |
|---|--------------------------|-----------|-------|------|--------------|
| 1 | "{verbal reference as spoken}" | HH:MM:SS | "{exact transcript quote}" | informal | REF-YYY |
| 2 | "{paper, project, person, or idea named verbally}" | HH:MM:SS | "{exact transcript quote}" | formal-citation | — |

<!--
Time-based media rules:
- Use this table for talks, podcasts, interviews, lectures, and videos where a
  speaker references work verbally instead of through a formal reference list.
- Timestamp MUST point into the transcript sidecar.
- Quote MUST match the transcript exactly.
- Type values: formal-citation, informal, project, person, venue, unclear.
- "Inducted REF" links to a corpus REF when the mentioned work is already in
  the corpus; use "—" when the mention is unresolved or not yet inducted.
- Do not force DOI/paper metadata for informal spoken references.
-->

## Notes

{Optional free-form notes about the citation network. Common patterns:
- **Hub character**: central REFs and intellectual lineage of the cluster this sits in.
- **Author overlap**: shared authors with REF-AAA, REF-BBB (same lab / research line).
- **Methodological lineage**: extends / contradicts / parallels REF-XXX's approach.
- **External replication state**: known replications or rebuttals not yet inducted.
- **Reference list size**: total cited works in PDF vs included here.

If acquisition is incomplete, document it: "PDF not acquired (paywall); Outgoing deferred."}

<!--
Format conventions:
- Frontmatter `ref:` MUST equal `REF-XXX` matching the filename.
- The sidecar pairs with documentation/references/REF-XXX-*.md (analysis doc) and
  documentation/radar/REF-XXX-radar.md (radar sidecar) — all three share the REF id.
- The 6-column table (`# | Title | Authors | Year | DOI/URL | Inducted REF`) is canonical.
- Bidirectional consistency is enforced by the corpus audit (research-lint).
- The spoken-reference table is additive for time-based media and does not
  change existing paper citation sidecars.
-->
