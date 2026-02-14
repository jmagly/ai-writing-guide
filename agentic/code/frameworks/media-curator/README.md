# Media Curator Framework

Intelligent media archive management for building, curating, and maintaining comprehensive media collections. Handles discography analysis, source discovery, acquisition, quality assessment, metadata curation, and multi-platform export.

## Quick Start

```bash
# Deploy the framework
aiwg use media-curator

# Analyze an artist's discography
/analyze-artist "Twenty One Pilots"

# Discover sources for specific content
/find-sources "Twenty One Pilots" --scope "complete"

# Acquire content from discovered sources
/acquire --plan sources.yaml

# Tag and organize the collection
/tag-collection /path/to/collection

# Check collection completeness
/check-completeness "Twenty One Pilots"

# Verify archive integrity
/verify-archive /path/to/collection

# Export for a specific platform
/export --profile plex /path/to/collection /path/to/output
```

## Capabilities

| Capability | Agent | Command |
|-----------|-------|---------|
| Discography research and era identification | `discography-analyst` | `/analyze-artist` |
| Multi-platform source discovery | `source-discoverer` | `/find-sources` |
| Download orchestration with format selection | `acquisition-manager` | `/acquire` |
| Audio/video quality scoring and filtering | `quality-assessor` | (integrated) |
| Metadata tagging and artwork embedding | `metadata-curator` | `/tag-collection` |
| Gap analysis and completeness tracking | `completeness-tracker` | `/check-completeness` |
| Narrative and playlist assembly | (integrated) | `/assemble` |
| Multi-platform format export | (integrated) | `/export` |
| SHA-256 integrity verification | (integrated) | `/verify-archive` |

## Architecture

```
media-curator/
├── agents/
│   ├── discography-analyst.md      # Era/project identification
│   ├── source-discoverer.md        # Finding content across platforms
│   ├── acquisition-manager.md      # Download orchestration
│   ├── quality-assessor.md         # Accept/reject criteria
│   ├── metadata-curator.md         # Tagging and organization
│   └── completeness-tracker.md     # Gap analysis
├── commands/
│   ├── curate.md                   # Main orchestration entry point
│   ├── analyze-artist.md           # Discography analysis
│   ├── find-sources.md             # Source discovery
│   ├── acquire.md                  # Download management
│   ├── tag-collection.md           # Metadata application
│   ├── check-completeness.md       # Gap analysis
│   ├── assemble.md                 # Narrative/playlist assembly
│   ├── export.md                   # Multi-platform output
│   └── verify-archive.md           # Integrity verification
├── skills/
│   ├── youtube-acquisition.md      # yt-dlp patterns
│   ├── archive-acquisition.md      # Internet Archive patterns
│   ├── audio-extraction.md         # ffmpeg audio extraction
│   ├── metadata-tagging.md         # opustags/ffmpeg tagging
│   ├── quality-filtering.md        # Accept/reject logic
│   ├── cover-art-embedding.md      # Artwork embedding
│   ├── integrity-verification.md   # SHA-256 manifests
│   ├── gap-documentation.md        # GAP-NOTE.md pattern
│   └── provenance-tracking.md      # W3C PROV-O for media
├── config/
│   └── defaults.yaml               # Default configuration
└── docs/
    ├── overview.md                  # Framework overview
    ├── user-guide.md                # User guide
    └── standards-reference.md       # Standards (PREMIS, PROV, ID3)
```

## User Interaction Patterns

### Complete Collection
```
User: "My favorite band is Radiohead - build me the complete collection"
→ Analyzes eras, discovers sources, acquires systematically, delivers organized collection
```

### Targeted Extraction
```
User: "I love early Metallica - Master of Puppets era"
→ Identifies 1983-1988, finds era-specific content, delivers focused collection
```

### Event/Tour Focus
```
User: "Twenty One Pilots Bandito Tour - everything from that tour"
→ Identifies tour dates/venues, finds pro-shot performances, delivers tour archive
```

## Quality Tiers

| Tier | Sources | Action |
|------|---------|--------|
| 1: Official/Lossless | Bandcamp FLAC, official YouTube | Always accept |
| 2: High Quality | YouTube Music AAC 256, SoundCloud 320 | Accept |
| 3: Standard | YouTube AAC 128-256 | Accept if unique |
| 4: Avoid | Phone recordings, heavy compression | Reject (unless legendary) |

## Standards

| Standard | Usage |
|----------|-------|
| ID3v2.4 / Vorbis Comments | Audio metadata |
| SHA-256 (NIST FIPS 180-4) | Integrity verification |
| PREMIS 3.0 | Preservation fixity metadata |
| W3C PROV-O | Provenance tracking |
| ISO 8601 | Timestamps (UTC, nanosecond precision) |
| MusicBrainz | Canonical discography data |

## Tools Required

| Tool | Purpose | Install |
|------|---------|---------|
| `yt-dlp` | Video/audio acquisition | `pip install yt-dlp` |
| `ffmpeg` | Transcoding, extraction | System package |
| `opustags` | Opus metadata tagging | System package |
| `sha256sum` | Integrity checksums | GNU coreutils |

## Related Issues

- Epic: [#75](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/75)
- Child issues: #76-#83, #253
