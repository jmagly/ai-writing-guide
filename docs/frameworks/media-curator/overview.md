# Media Curator Framework Overview

## What It Does

The Media Curator framework enables AI agents to build, curate, and maintain comprehensive media collections. It handles the full lifecycle from artist or collection research through acquisition, organization, transcript sidecars, verification, and multi-platform export.

## Design Philosophy

### Issue-Driven Development

This framework emerged from a real prototype: cataloging Twenty One Pilots' complete discography (1,109 files, 94GB). Every agent, workflow, and skill reflects patterns that were field-tested in production.

### Quality Over Quantity

Not all media is worth collecting. The framework applies multi-dimensional quality scoring (audio, video, uniqueness) with configurable thresholds. Phone recordings are rejected by default, but historically significant or only-known recordings can bypass quality gates when provenance explains the exception.

### Classification by Production Context

A key field-test learning: classify media by how it was produced (studio, live, broadcast), not how it sounds (acoustic, electric). A stripped-down studio recording is still a studio recording.

### Integrity First

Every archive includes self-verifying SHA-256 checksums and W3C PROV-compliant provenance tracking. Transcript sidecars record source hashes, transcript hashes, timestamped segments, and source metadata so downstream research workflows can cite exact media state.

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

### Workflows (10)

| Workflow | Purpose |
|---------|---------|
| `/curate` | End-to-end orchestration |
| `/analyze-artist` | Discography or collection analysis |
| `/find-sources` | Source discovery |
| `/acquire` | Download management |
| `/transcribe-media` | Timestamped transcript sidecars for acquired audio/video |
| `/tag-collection` | Metadata application |
| `/check-completeness` | Gap analysis |
| `/assemble` | Narrative/playlist assembly |
| `/export` | Multi-platform output |
| `/verify-archive` | Integrity verification |

### Skills (19)

| Skill | Purpose |
|-------|---------|
| Media Curator Quickref | Discovery routing and framework orientation |
| Curate | End-to-end workflow orchestration |
| Analyze Artist | Artist or collection analysis |
| Find Sources | Multi-platform source discovery |
| Acquire | Download/session management |
| YouTube Acquisition | yt-dlp patterns |
| Archive Acquisition | Internet Archive patterns |
| Audio Extraction | ffmpeg audio extraction |
| Transcribe Media | Transcript sidecars with timestamps and hashes |
| Metadata Tagging | opustags/ffmpeg tagging |
| Tag Collection | Metadata application workflow |
| Quality Filtering | Accept/reject logic |
| Cover Art Embedding | Artwork embedding |
| Assemble | Thematic compilation assembly |
| Export | Plex, Jellyfin, MPD, mobile, and archival export |
| Verify Archive | Archive verification workflow |
| Integrity Verification | SHA-256 manifests |
| Gap Documentation | GAP-NOTE.md pattern |
| Provenance Tracking | W3C PROV-O for media |

## Pipeline Overview

```
analyze-artist -> find-sources -> acquire -> transcribe-media -> tag-collection -> verify-archive -> check-completeness
                                                                                                      |
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
| whisper-cpp, whisper, or vosk-transcriber | Local speech-to-text for generated transcripts | No; missing tools produce a degraded plan |

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
├── transcripts/
│   └── {source-id}.transcript.json
├── .curator/
│   ├── manifest.json
│   ├── sources.json
│   └── gaps.json
├── CHECKSUMS.sha256
├── VERIFY.md
└── PROVENANCE.jsonld
```

Project-local AIWG state also records transcript sidecars under `.aiwg/media/transcripts/` when the framework is deployed.

## Related

- Epic issue: #75
- Time-based research media bridge: #1234
- Prototype: Twenty One Pilots collection (1,109 files, 94GB)
- Standards: ID3v2.4, SHA-256, PREMIS 3.0, W3C PROV-O, ISO 8601, timestamped transcript sidecars
