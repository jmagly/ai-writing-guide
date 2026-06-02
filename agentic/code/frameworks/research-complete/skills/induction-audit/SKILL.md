---
namespace: aiwg
platforms: [all]
name: induction-audit
description: Audit research-corpus induction quality — depth bands (stub/compact/good/full/deep), structural integrity (analysis doc + sidecar + PDF, honoring audit-exclude conventions), and per-source-type required sections (a blog isn't flagged for missing Benchmark Results). Plus additive frontmatter backfill for legacy docs. Runs via `aiwg corpus induction-audit` / `aiwg corpus frontmatter-backfill`.
commandHint:
  argumentHint: "induction-audit [--start N --end N | --ref REF-XXX]  |  frontmatter-backfill [--write]"
  allowedTools: Read, Bash, Write
  model: sonnet
  category: research-validation
---

# Induction Audit & Frontmatter Backfill

Quality + depth audit for inducted references, and an additive frontmatter
backfill for legacy analysis docs. The audit is **source-type-aware**: required
sections come from the source-type registry (`source-types` skill / #1509), so a
blog is checked for "Practical Relevance" and a repo for "Architecture", not for
"Benchmark Results".

## How to run

```bash
# Audit a REF range
aiwg corpus induction-audit --start 599 --end 635

# Audit one REF
aiwg corpus induction-audit --ref REF-394

# Audit the whole corpus
aiwg corpus induction-audit

# Backfill minimal frontmatter (ref_id/title/year/pdf_hash) into legacy docs
aiwg corpus frontmatter-backfill            # dry-run
aiwg corpus frontmatter-backfill --write    # write (additive; skips docs that already have frontmatter)
```

## What the audit reports

- **Structural issues** (the actionable failures): `MISSING-ANALYSIS-DOC`,
  `MISSING-SIDECAR`, `MISSING-PDF` (honoring `audit-exclude-missing-pdf` + legacy
  excluded types redirect/gap-note/chapter), `PDF-PRESENT-BUT-MARKED-EXCLUDED`,
  `below-80-line-stub-threshold`.
- **Depth bands** by analysis line count: STUB (<80), compact (80–149),
  good (150–249), full (250–399), deep (400+).
- **Per-type section completeness** (informational): for each ref's normalized
  source type, which of that type's required sections are absent. This is a
  completeness signal, not a hard issue — the registry's required set is the
  type's full template, which real inductions don't always fill.

## Reconciliation with the quality skills

| Skill | Question it answers |
|-------|---------------------|
| `induction-audit` (this) | Is the induction structurally complete + deep enough, with the sections its **source type** expects? |
| `research-quality-audit` | How strong is the **evidence** (GRADE)? |
| `best-practices-audit` | Does the corpus follow framework best practices broadly? |
| `sidecar-lint` | Are the **citation sidecars** structurally valid? |

They compose; none duplicates the others. Run `induction-audit` after a batch
induction to catch stubs/missing artifacts and per-type section gaps; run the
quality skills to assess evidence strength.

## Triggers

- "audit inductions"
- "check induction depth / quality"
- "find stub inductions"
- "backfill frontmatter"
- "induction audit"

## Notes

- TS-native (`src/artifacts/corpus-tools/induction-audit.ts`) — port of section9
  `audit_inductions.py` + `backfill_frontmatter.py`.
- The per-type required sections come from the source-type registry
  (`aiwg corpus source-types`); override types per-corpus at
  `documentation/source-types.yaml`.
