---
name: media-curator-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: AUTO-INVOKE when user mentions media curation, discography, archive, music collection, video/audio collection, source acquisition, metadata tagging, transcript, Plex, Jellyfin, MPD. Media-curator framework quick reference — discovery phrases for collection assessment, source discovery, acquisition, transcription, quality filtering, metadata, archive integrity, and research handoff.
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

End-to-end media archive management for audio, video, and other curated asset collections. It can inspect the requested collection type, plan a workflow, discover sources across YouTube/Internet Archive/Bandcamp or other relevant surfaces, acquire with proven tools, score quality, apply consistent metadata, generate gap notes for missing content, verify integrity with SHA-256, transcribe acquired audio/video, and export to platform-specific formats (Plex, Jellyfin, MPD, mobile, archival).

## Capability domains

| Domain | Covers |
|---|---|
| **Assess & plan** | Inspect arbitrary collection requests, examples, filenames, metadata, source URLs, and select workflow/tooling |
| **Catalog planning** | Artist discography analysis, canonical catalog structure |
| **Discovery & acquisition** | Find sources, download with quality scoring, yt-dlp / Internet Archive patterns |
| **Transcription** | Timestamped transcript sidecars for acquired audio/video |
| **Metadata & assembly** | Tag files, embed cover art, assemble compilations |
| **Completeness & gaps** | Audit collection completeness, document missing content |
| **Integrity & export** | SHA-256 verification, platform-specific export bundles |
| **Provenance** | Track derivation chains, source, license, and integrity records for curated assets |
| **Research handoff** | Pass acquired media plus transcripts into research-complete `induct-media` |

## Curated discovery phrases

### Catalog planning

```bash
aiwg discover "curate arbitrary media collection" # → curate
aiwg discover "assess unsupported media type"      # → curate / provenance-tracking
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

### Transcription & research handoff

```bash
aiwg discover "transcribe media"               # → transcribe-media
aiwg discover "speaker diarization audio"      # → diarize-media
aiwg discover "media research handoff"         # → induct-media (research-complete)
aiwg discover "video audio research induction" # → transcribe-media / diarize-media / induct-media
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
assess request and examples  →
analyze-artist or type-specific plan  →
  find-sources (discovery)  →
    quality-filtering (accept/reject)  →
      acquire (download)  →
        tag-collection (metadata)  →
          verify-archive (integrity)  →
            export (target platform)
```

`gap-documentation` and `check-completeness` run cross-cutting at any stage.

For unknown or lightly supported asset types, first inspect available examples,
filenames, metadata, source URLs, and user intent. Prefer established libraries
or tools; create narrow custom tooling only when necessary. If specialized
handling is missing, produce a concrete plan, collect safe metadata/provenance
and integrity records, and identify the follow-up tool or plugin needed.

## Artifact directory layout

```
.aiwg/media/
├── catalogs/         # Per-artist canonical discographies
├── sources/          # Discovery output (ranked candidates)
├── acquisitions/     # Acquired files + checksums
├── transcripts/      # Transcript sidecars for acquired audio/video
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
