---
prof-id: PROF-S-{slug}
name: ""                       # display name of the curator/account
type: source                   # person | org | funder | group | source
platform: x                    # x | rss | newsletter | web | other
handle: "@{handle}"            # account handle / feed id
url: ""                        # canonical URL of the curator
operator: ""                   # PROF-P-/PROF-O- slug if the curator maps to a known person/org
corpus-refs: []                # inducted REF-XXX surfaced via this curator (NOT candidates)
surfaces: []                   # discovery surfaces this curator maps to: x-account, x-search, ...
focus-areas: []                # AREA-{slug} / free-text topical focus
signal-quality: "—"            # observed density of useful sources: A | B | C | D | —
grade-trajectory: unknown      # rising | stable | declining | unknown
revisit-cadence: weekly        # daily | weekly | biweekly | monthly | on-demand
last-harvested: YYYY-MM-DD
last-harvested-by: ""
candidate-yield: 0             # # of candidate sources surfaced (pre-induction), this curator
---

# {Name} — Source / Curator Profile

**Type**: Source / Curator
**Profile ID**: `{prof-id}`
**Platform**: {x | rss | …} · **Handle**: {@handle}
**Signal quality**: {A–D} · **Revisit cadence**: {daily | weekly | …}
**Last harvested**: {YYYY-MM-DD}

---

## 1. Curator Summary

{One paragraph: who/what this account is, what they post, why they're worth tracking. Note posting style — e.g. "paper-per-post with arXiv IDs", "weekly roundup", "news + occasional papers".}

**Posting profile**: {paper-per-post | daily list | weekly roundup | mixed paper/commentary | …}
**Best for**: {topics this curator reliably surfaces}
**Caveats**: {e.g. heavy promo/reposts; sparse recently; spam-adjacent}

---

## 2. Sources Surfaced

### Inducted (in corpus)
| REF | Title | Surfaced | GRADE |
|---|---|---|---|
| [REF-XXX](../../references/REF-XXX-*.md) | {short title} | YYYY-MM-DD | A |

**Inducted via this curator**: {N} · **Avg GRADE**: {—} · **Most recent**: {REF-XXX (date)}

### Candidate Sources Surfaced (not yet inducted)
_Seeded from harvest working files; promote into the table above as they induct._
| Candidate | Surfaced | Harvest batch | Working file |
|---|---|---|---|
| {short title} | YYYY-MM-DD | {batch} | {.aiwg/working/…} |

---

## 3. Yield & Signal Radar

| Metric | Value |
|---|---|
| Inducted REFs | {N} |
| Candidate yield (lifetime) | {N} |
| Avg surfaced GRADE | {—} |
| Signal quality | {A–D} |
| Trajectory | {rising/stable/declining} |
| Revisit cadence | {daily/weekly/…} |
| Next sweep due | {YYYY-MM-DD} |

**"Return-to" score**: {inducted-ref-count × avg-GRADE} — used to rank curators (see `aiwg corpus curator-status`).

---

## 4. Harvest History

| Date | By | Surface | Candidates | Notable |
|---|---|---|---|---|
| YYYY-MM-DD | {agent} | {x-account} | {N} | {one-line} |

---

## 5. Notes

{Anything notable: handle changes, affiliation to a lab/org, relationship to other curators, when they go quiet, etc.}
