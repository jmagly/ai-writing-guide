---
namespace: aiwg
platforms: [all]
name: source-types
description: The canonical, extensible source-type registry for a research corpus — paper, preprint, blog, repo, book, chapter, standard, doc, discussion, encyclopedia, expert-material, video, audio, podcast, lecture, internal-review. Replaces the drifting type / source_type / "Source Type" vocabularies with one registry that declares per-type template, required sections, citation format, acquisition method, storage, quality rules, and radar cadence. Surfaced via `aiwg corpus source-types`; consumed by the by-source-type index view, per-type induction audit, and acquisition dispatch.
commandHint:
  argumentHint: "source-types [--json]"
  allowedTools: Read, Bash, Write
  model: haiku
  category: research-foundation
  modelRole: efficiency
  modelTier: economy
---

# Source-Type Registry

A research corpus outgrows "papers" — it catalogs preprints, code repos, blog
posts, lab announcements, vendor docs, books, RFCs, discussions, and more. This
skill is the **canonical, extensible source-type registry** that makes source
type a first-class, config-driven dimension.

## The problem it solves

Corpora accumulate **three drifting type vocabularies**:

| Surface | Example values | Drift |
|---------|---------------|-------|
| frontmatter `type:` | `book`, `reference`, `gap-note`, `internal-research` | mixes source type with doc role |
| frontmatter `source_type:` | `conference-paper` / `conference_paper`, `book_chapter` | hyphen vs underscore |
| body "Source Type" | `paper`, `maintainer-doc`, `discussion` | a third overlapping enum |

The registry folds all three (plus a venue-classification fallback) into **one
canonical source type** per artifact.

## How to use

```bash
# List the registry — canonical types + per-type rules
aiwg corpus source-types
aiwg corpus source-types --json

# The by-source-type index view groups the corpus by normalized type
aiwg index build --graph by-source-type     # → indices/by-source-type.md
```

## What each type declares

Per canonical type: `template`, `required-sections`, `citation-format`,
`acquisition`, `storage`, `quality-rules`, `default-radar-cadence`. Example:

| type | template | citation | acquisition | storage | cadence |
|------|----------|----------|-------------|---------|---------|
| paper | reference-academic | doi-bibtex | pdf-download | sources/pdfs/full | quarterly |
| preprint | reference-academic | arxiv-id | pdf-download | sources/pdfs/full | quarterly |
| blog | reference-web | url-venue-retrieved | web-snapshot | sources/web | biannual |
| repo | reference-repo | repo-url-commit | git-clone | sources/repos | on-demand |
| standard | reference-web | standard-id | web-snapshot | sources/web | annual |
| video | reference-media | timestamp-transcript | media-curator | media/video | on-demand |
| podcast | reference-media | timestamp-transcript | media-curator | media/audio | on-demand |

(17 canonical types ship by default; `aiwg corpus source-types` lists them all.)

## Adding a new source type is config, not code

Create `documentation/source-types.yaml` in your corpus to **replace** the
default registry (include the defaults you keep). Adding a podcast, dataset, or
talk type is a registry entry:

```yaml
version: 1
types:
  podcast:
    description: Podcast episode.
    aliases: [podcast, episode]
    template: reference-media
    required_sections: [Citation, Media Profile, Summary, Key Timestamps]
    citation_format: timestamp-transcript
    acquisition: media-curator
    storage: media/audio
    quality_rules: interview-hedged-grade
    default_radar_cadence: on-demand
venue_fallback: { … }
meta_roles: [redirect, stub, gap-note]
```

## Normalization rules

1. `source_type:` → `type:` → body "Source Type" are checked in that order; the
   first that matches a canonical type or alias wins.
2. Doc-role values (`redirect`, `stub`, `gap-note`, `merged`, `index`) map to
   the **`meta`** pseudo-type (excluded from source-type analytics).
3. If no explicit type matches, the classified **venue** falls back to a type
   (academic venues → `paper`, arXiv → `preprint`, GitHub → `repo`, RFC →
   `standard`, lab/vendor research posts → `blog`, Wikipedia → `encyclopedia`).
4. Otherwise → `other`.

Validated on a real 1,273-ref corpus: the registry normalizes ~93% (paper,
preprint, blog, repo, standard, book, chapter, encyclopedia, internal-review),
with `meta` excluding redirects/stubs and `other` capturing genuinely untyped refs.

## Consumers

The registry is the foundation other subsystems read:

- **by-source-type index view** (this framework) — groups refs by normalized type.
- **Per-type induction audit** (`induction-audit` / #1504) — required-section + depth checks vary by type (don't flag a blog for missing Ablation Studies).
- **Acquisition dispatch** (`research-acquire` / #1507) — PDF download vs web snapshot vs git clone by type.
- **Templates** (#1497) — per-type reference templates selected by source type.
- **Quality/GRADE** — non-peer-reviewed types carry different hedging expectations.

## Triggers

- "source type registry"
- "normalize source types"
- "what source types does the corpus have"
- "add a new source type"
- "by source type"

## Notes

- Authoritative runtime default: `src/artifacts/corpus-tools/source-types.ts`
  (`DEFAULT_SOURCE_TYPES`); human-readable + override form:
  `agentic/code/frameworks/research-complete/config/source-types.yaml`. A drift
  test keeps them in sync.
- The venue fallback reuses the existing `VENUE_PATTERNS` classifier
  (`src/artifacts/corpus-views/taxonomies.ts`).
