---
name: media-curator-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: AUTO-INVOKE when user mentions media curation, discography, archive, music collection, source acquisition, metadata tagging, Plex, Jellyfin, MPD. Media-curator framework quick reference — discovery phrases for discography analysis, source discovery, acquisition, quality filtering, metadata, archive integrity.
---

# Media Curator Framework — Quick Reference

This is your always-loaded directory for the AIWG **media-curator** framework. It does **not** list every skill. Instead, it teaches the framework's mental model and gives you **curated search phrases** that map to `aiwg discover` lookups.

## Canonical access pattern: discover → show

When you find a candidate via `aiwg discover`, fetch its body with `aiwg show <type> <name>`. **Never** use `find`, `ls`, `Glob`, or direct `Read` on `<provider>/skills/` paths — those reflect the kernel-pivot deploy state, not the full surface.

```bash
aiwg discover "<phrase>"             # find — returns ranked candidates
aiwg show skill <name>               # fetch — streams the SKILL.md body
```

If your platform's Skill tool errors on a non-kernel skill (expected — most aren't kernel), the fallback is `aiwg show`, never filesystem browsing. Last-resort if `aiwg` itself is broken: read directly from `$AIWG_ROOT/agentic/code/...` (the canonical corpus, always present).

## How to use this quickref

1. Identify the **capability domain** the user's need belongs to
2. Pick a **curated phrase** from that domain (or paraphrase the user's words)
3. Run `aiwg discover "<phrase>"` and surface the top match (or top-3) to the user

**Do not enumerate skills from memory.** Discovery is the lookup surface.

## What this framework is for

End-to-end media archive management: discover sources across YouTube/Internet Archive/Bandcamp, acquire with `yt-dlp`-based patterns, score quality, embed cover art, apply consistent metadata, generate gap notes for missing content, verify integrity with SHA-256, and export to platform-specific formats (Plex, Jellyfin, MPD, mobile, archival).

## Capability domains

| Domain | Covers |
|---|---|
| **Catalog planning** | Artist discography analysis, canonical catalog structure |
| **Discovery & acquisition** | Find sources, download with quality scoring, yt-dlp / Internet Archive patterns |
| **Metadata & assembly** | Tag files, embed cover art, assemble compilations |
| **Completeness & gaps** | Audit collection completeness, document missing content |
| **Integrity & export** | SHA-256 verification, platform-specific export bundles |
| **Provenance** | Track derivation chains for media files |

## Curated discovery phrases

### Catalog planning

```bash
aiwg discover "analyze artist discography"     # → analyze-artist
```

### Discovery & acquisition

```bash
aiwg discover "find media sources"             # → find-sources
aiwg discover "acquire media"                  # → acquire
aiwg discover "youtube acquisition"            # → youtube-acquisition (pattern reference)
aiwg discover "archive acquisition"            # → archive-acquisition (pattern reference)
aiwg discover "audio extraction"               # → audio-extraction (pattern reference)
aiwg discover "quality filter media"           # → quality-filtering
```

### Metadata & assembly

```bash
aiwg discover "tag media collection"           # → tag-collection
aiwg discover "metadata tagging"               # → metadata-tagging (pattern reference)
aiwg discover "cover art embedding"            # → cover-art-embedding (pattern reference)
aiwg discover "assemble compilation"           # → assemble
```

### Completeness & gaps

```bash
aiwg discover "check collection completeness"  # → check-completeness
aiwg discover "gap documentation"              # → gap-documentation
```

### Integrity & export

```bash
aiwg discover "verify archive integrity"       # → verify-archive (score 0.73)
aiwg discover "integrity verification"         # → integrity-verification
aiwg discover "export media collection"        # → export (score 1.00)
```

### Orchestration & provenance

```bash
aiwg discover "curate"                         # → curate (end-to-end orchestrator)
aiwg discover "provenance tracking"            # → provenance-tracking
```

## Workflow shape

```
analyze-artist (catalog plan)  →
  find-sources (discovery)  →
    quality-filtering (accept/reject)  →
      acquire (download)  →
        tag-collection (metadata)  →
          verify-archive (integrity)  →
            export (target platform)
```

`gap-documentation` and `check-completeness` run cross-cutting at any stage.

## Artifact directory layout

```
.aiwg/media/
├── catalogs/         # Per-artist canonical discographies
├── sources/          # Discovery output (ranked candidates)
├── acquisitions/     # Acquired files + checksums
├── gaps/             # GAP-NOTE markers for missing content
├── exports/          # Platform-specific export bundles
└── verify/           # Integrity reports
```

## When the curated phrases don't fit

```bash
aiwg discover "<your need, paraphrased>" --limit 5
```

## Anti-pattern: don't enumerate

If a user asks "what media skills are available?", **do not list from this skill**. Run:

```bash
aiwg discover --type skill --limit 20 "<their interest area>"
```
