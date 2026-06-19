# Media Curator Framework Overview

## What It Does

The Media Curator framework enables AI agents to build, curate, and maintain comprehensive media collections. It handles the full lifecycle from artist research through acquisition, organization, verification, and multi-platform export.

## Design Philosophy

### Issue-Driven Development

This framework emerged from a real prototype: cataloging Twenty One Pilots' complete discography (1,109 files, 94GB). Every agent, command, and skill reflects patterns that were field-tested in production.

### Quality Over Quantity

Not all media is worth collecting. The framework applies multi-dimensional quality scoring (audio, video, uniqueness) with configurable thresholds. Phone recordings are rejected by default, but "legendary" content (historically significant, only known recording) bypasses quality gates.

### Classification by Production Context

A key field-test learning: classify media by how it was produced (studio, live, broadcast), not how it sounds (acoustic, electric). A stripped-down studio recording is still a studio recording.

### Integrity First

Every archive includes self-verifying SHA-256 checksums and W3C PROV-compliant provenance tracking. Bit rot detection is built in, not bolted on.

## Framework Components

### Agents (6)

| Agent | Purpose |
|-------|---------|
| Discography Analyst | Research eras, map catalog structure |
| Source Discoverer | Find content across platforms |
| Acquisition Manager | Orchestrate downloads |
| Quality Assessor | Score and filter content |
| Metadata Curator | Tag, name, organize |
| Completeness Tracker | Gap analysis and prioritization |

### Commands (9)

| Command | Purpose |
|---------|---------|
| `/curate` | End-to-end orchestration |
| `/analyze-artist` | Discography analysis |
| `/find-sources` | Source discovery |
| `/acquire` | Download management |
| `/tag-collection` | Metadata application |
| `/check-completeness` | Gap analysis |
| `/assemble` | Narrative/playlist assembly |
| `/export` | Multi-platform output |
| `/verify-archive` | Integrity verification |

### Skills (9)

| Skill | Purpose |
|-------|---------|
| YouTube Acquisition | yt-dlp patterns |
| Archive Acquisition | Internet Archive patterns |
| Audio Extraction | ffmpeg audio extraction |
| Metadata Tagging | opustags/ffmpeg tagging |
| Quality Filtering | Accept/reject logic |
| Cover Art Embedding | Artwork embedding |
| Integrity Verification | SHA-256 manifests |
| Gap Documentation | GAP-NOTE.md pattern |
| Provenance Tracking | W3C PROV-O for media |

## Pipeline Overview

```
analyze-artist → find-sources → acquire → tag-collection → verify-archive → check-completeness
                                                                              ↓
                                                                    assemble / export
```

## Tools Required

| Tool | Purpose | Required |
|------|---------|----------|
| yt-dlp | Video/audio download | Yes |
| ffmpeg/ffprobe | Transcoding, extraction, analysis | Yes |
| opustags | Opus metadata tagging | Yes |
| sha256sum | Integrity checksums | Yes (GNU coreutils) |
| wget/curl | Direct file download | Yes |

## Archive Structure

```
{artist}/
├── albums/{album_name}/
│   ├── audio/
│   └── video/
├── singles/
├── sessions/
│   ├── radio/
│   ├── interviews/
│   └── tv/
├── unofficial/
│   ├── live-performances/
│   └── rare-versions/
├── artwork/
│   ├── albums/
│   ├── artists/
│   ├── live/
│   ├── logos/
│   └── promotional/
├── lyrics/
├── .curator/
│   ├── manifest.json
│   ├── sources.json
│   └── gaps.json
├── CHECKSUMS.sha256
├── VERIFY.md
└── PROVENANCE.jsonld
```

## Related

- Epic issue: #75
- Prototype: Twenty One Pilots collection (1,109 files, 94GB)
- Standards: ID3v2.4, SHA-256, PREMIS 3.0, W3C PROV-O, ISO 8601
