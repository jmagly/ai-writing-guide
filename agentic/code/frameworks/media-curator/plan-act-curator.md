# Plan-Act: Media Curator

## When to Use This Framework

Use the Media Curator framework when:
- Building a comprehensive media collection for an artist or subject
- Organizing and curating existing media archives
- Verifying archive integrity and completeness
- Exporting collections for specific platforms (Plex, Jellyfin, MPD, mobile)

## Orchestration Flow

```
/curate "Artist Name" --scope complete
    │
    ├── Phase 1: Analysis
    │   └── /analyze-artist → era breakdown, catalog structure
    │
    ├── Phase 2: Discovery
    │   └── /find-sources → ranked source list per track/album
    │
    ├── Phase 3: Acquisition
    │   └── /acquire → download with format selection, quality filtering
    │
    ├── Phase 4: Curation
    │   ├── /tag-collection → metadata, artwork, naming
    │   └── /verify-archive → SHA-256 checksums, provenance
    │
    ├── Phase 5: Analysis
    │   └── /check-completeness → gap report, upgrade opportunities
    │
    └── Phase 6: Export (optional)
        ├── /assemble → playlists, compilations, narratives
        └── /export → platform-specific output
```

## Agent Coordination

| Phase | Primary Agent | Supporting Skills |
|-------|--------------|-------------------|
| Analysis | `discography-analyst` | MusicBrainz lookup |
| Discovery | `source-discoverer` | YouTube, Archive, Bandcamp search |
| Acquisition | `acquisition-manager` | yt-dlp, wget, audio extraction |
| Quality | `quality-assessor` | Quality filtering, scoring |
| Metadata | `metadata-curator` | Tagging, artwork, organization |
| Tracking | `completeness-tracker` | Gap documentation, inventory |

## Key Patterns

### Parallel Acquisition
Launch multiple download agents targeting different content areas simultaneously, each writing to separate directories to avoid conflicts.

### Quality Override
"Legendary" content (historically significant, only known recording) bypasses quality thresholds. Rarity trumps fidelity for unique content.

### Network Mount Safety
Never do bulk operations directly on network mounts. Pull to local storage, process, push back.

### Classification by Production Context
Classify media by production context (studio/live/broadcast), not sonic character (acoustic/electric). A stripped-down studio recording is still a studio recording.
