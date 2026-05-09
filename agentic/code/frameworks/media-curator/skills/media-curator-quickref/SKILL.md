---
name: media-curator-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Media-curator framework quick reference — discography analysis, source discovery, acquisition, quality filtering, metadata tagging, and archive integrity
---

# Media Curator Framework — Quick Reference

You are operating in a project that has the AIWG **media-curator** framework installed. This skill is your always-loaded directory for media archive curation. The full skill catalog is reachable through the AIWG artifact index.

## What this framework is for

End-to-end media archive management: discover sources across YouTube/Internet Archive/Bandcamp, acquire with `yt-dlp`-based patterns, score quality, embed cover art, apply consistent metadata, generate gap notes for missing content, verify integrity with SHA-256, and export to platform-specific formats (Plex, Jellyfin, MPD, mobile, archival).

## When to reach for which skill

| Need | Skill | How to invoke |
|---|---|---|
| Plan an artist's catalog | `analyze-artist` | "analyze artist X" |
| End-to-end curation orchestration | `curate` | "curate this artist" |
| Discover sources for content | `find-sources` | "find sources for X" |
| Download discovered sources | `acquire` | "download these" |
| Assemble compilations / playlists | `assemble` | "make a [theme] compilation" |
| Apply metadata tags to files | `tag-collection` | "tag these files" |
| Check collection completeness | `check-completeness` | "what's missing from my X collection?" |
| Document a gap | `gap-documentation` | "note that [release] is missing" |
| Verify archive integrity | `verify-archive` | "verify the archive" |
| Export for a target platform | `export` | "export to plex" |
| Audio extraction / transcoding | `audio-extraction` | (ffmpeg patterns) |
| Cover art embedding | `cover-art-embedding` | (image embed patterns) |
| Metadata tagging (opustags/ffmpeg) | `metadata-tagging` | (low-level patterns) |
| YouTube acquisition (yt-dlp) | `youtube-acquisition` | (yt-dlp patterns) |
| Internet Archive acquisition | `archive-acquisition` | (archive.org patterns) |
| Quality scoring & filter | `quality-filtering` | "filter low-quality results" |
| Provenance for derivation chains | `provenance-tracking` | "track derivation" |
| Integrity verification (SHA-256) | `integrity-verification` | "verify checksums" |

This framework ships **18 skills**. The above are the operator-facing entries; pattern skills (`metadata-tagging`, `youtube-acquisition`, etc.) are library references rather than top-level workflows.

## Workflow shape

```
analyze-artist (catalog plan) →
  find-sources (discovery) →
    quality-filtering (accept/reject) →
      acquire (download) →
        tag-collection (metadata) →
          verify-archive (integrity) →
            export (target platform)
```

`gap-documentation` and `check-completeness` run cross-cutting at any stage.

## Artifact directory layout

Curation artifacts go under `.aiwg/media/`:

```
.aiwg/media/
├── catalogs/         # Per-artist canonical discographies
├── sources/          # Discovery output (ranked candidates)
├── acquisitions/     # Acquired files + checksums
├── gaps/             # GAP-NOTE markers for missing content
├── exports/          # Platform-specific export bundles
└── verify/           # Integrity reports
```

## Finding the right skill when this quickref doesn't list it

```bash
aiwg discover "<phrase>"
```

For unusual asks (e.g., "merge two artists' catalogs", "deduplicate by acoustic fingerprint") — query the index. Pattern skills (`youtube-acquisition`, `metadata-tagging`) describe ffmpeg/yt-dlp patterns rather than full workflows; reach for them when the operator wants the recipe, not the orchestration.

## Common multi-skill flows

- **New artist, full ingestion**: `analyze-artist` → `find-sources` → `quality-filtering` → `acquire` → `tag-collection` → `verify-archive`
- **Compilation build**: `assemble` → `tag-collection` → `cover-art-embedding` → `export`
- **Gap-driven acquisition**: `check-completeness` → `gap-documentation` → `find-sources` → `acquire`
- **Quarterly archive verification**: `verify-archive` → `integrity-verification` → `provenance-tracking`

## Don't list from this skill — query the index

If a user asks "what media skills are available?", **do not enumerate from memory**. Run `aiwg discover --type skill --graph framework "media"`. This skill exists to orient.
