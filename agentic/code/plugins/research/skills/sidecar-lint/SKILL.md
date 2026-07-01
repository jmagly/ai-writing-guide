---
namespace: aiwg
platforms: [all]
name: sidecar-lint
description: Lint and repair citation sidecars in a research corpus — structural integrity (missing Outgoing/Incoming sections, missing frontmatter ref/title/type, doubled-append duplicate table headers), zero-edge orphan detection, (see REF doc) author backfill from the analysis citation block, and affiliation-primary canonicalization to PROF-O slugs. Runs via `aiwg corpus sidecar-lint` / `aiwg corpus sidecar-repair`.
commandHint:
  argumentHint: "sidecar-lint [--orphans] | sidecar-repair [--authors-only|--affiliations-only] [--write]"
  allowedTools: Read, Bash, Write
  model: sonnet
  category: research-validation
---

# Sidecar Lint & Repair

Citation-sidecar hygiene for a research corpus. Two read-only diagnostics
(`sidecar-lint`, `sidecar-lint --orphans`) and two repair tools
(`sidecar-repair`) that backfill authors and canonicalize affiliations.

These operate on `documentation/citations/REF-*-citations.md` under the
resolved corpus root (`AIWG_CORPUS_ROOT` env > `research.corpusRoot` in
`.aiwg/aiwg.config` > cwd).

## How to run

```bash
# Structural lint — missing sections/frontmatter, duplicate table headers
aiwg corpus sidecar-lint

# Zero-edge orphans (no incoming AND no outgoing edges), titled from the analysis doc
aiwg corpus sidecar-lint --orphans

# Repair: backfill (see REF doc) authors + normalize affiliations — DRY-RUN
aiwg corpus sidecar-repair

# Repair for real
aiwg corpus sidecar-repair --write

# Restrict to one repair
aiwg corpus sidecar-repair --authors-only --write
aiwg corpus sidecar-repair --affiliations-only --write

# Write a report to a file (resolved against the corpus root)
aiwg corpus sidecar-lint --out reports/sidecar-lint.txt
```

## What `sidecar-lint` checks

| Issue | Meaning |
|-------|---------|
| `missing-frontmatter` / `malformed-frontmatter` | No `---` block, or no closing `---` |
| `frontmatter-missing-{ref,title,type}` | Required sidecar frontmatter field absent |
| `missing-outgoing-section` / `missing-incoming-section` | No Outgoing/Incoming H2 (merge-redirects with `status: merged` / `MERGED INTO` are exempt) |
| `duplicate-table-headers-count=N` | Two `\| # \| Title` headers under one sub-header — the doubled-append signature |

`--orphans` lists sidecars with **zero** REF edges in either section (lenient
scan: any `REF-NNN` token in an Outgoing/Incoming section counts as an edge,
regardless of table-column naming).

## What `sidecar-repair` does

- **Authors** — for sidecars whose `authors:` still contains `(see REF doc)`,
  parse the analysis doc's `## Citation` block and write structured
  `authors: - name:` entries. Handles `Last, F. M.` initials, `&`/`and`
  separators, `et al.` truncation, and institutional single-authors.
- **Affiliations** — normalize `affiliation-primary` to a canonical
  `PROF-O-{slug}` when unambiguous; multi-org / parenthetical / unknown values
  are left untouched and reported as ambiguous. The canonical map ships as a
  default and is **overridable per-corpus** via
  `documentation/profiles/orgs/affiliation-map.yaml` (slug → variant names).

Both default to **dry-run**; nothing is written without `--write`.

## Reconciliation with `research-lint`

This is the **sidecar-structural** layer. The `research-lint` skill runs the
generic `aiwg lint --ruleset research` over `.aiwg/research/` (note-level
frontmatter, REF-id uniqueness, citation-resolves, note orphans). Those checks
do not look inside citation-sidecar structure. Use:

- **`research-lint`** for note/corpus-wide referential integrity and the lint ruleset engine.
- **`sidecar-lint`** for the citation-sidecar internals (Outgoing/Incoming sections, edge tables, author/affiliation metadata) and edge-graph orphans.

They compose; neither duplicates the other.

## Triggers

- "lint the citation sidecars"
- "find orphaned sidecars"
- "fix (see REF doc) authors"
- "normalize affiliations to PROF-O"
- "sidecar lint" / "sidecar repair"

## Notes

- All four operations are TS-native (`src/artifacts/corpus-tools/sidecar-lint.ts`,
  `sidecar-repair.ts`) — ports of section9 `lint_sidecars.py`, `find_orphans.py`,
  `fix_broken_authors.py`, `normalize_affiliation.py`.
- Author backfill matches the source's trailing-dot handling (a final initial
  like `Hinton, G.` is stored `Hinton, G`) for idempotency against corpora
  already processed by the original script.
