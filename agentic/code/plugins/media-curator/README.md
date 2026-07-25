# AIWG Media Curator

Media archive management framework with 7 specialized agents.

## Features

- **Discography Analysis**: Era identification, catalog structure
- **Source Discovery**: Multi-platform ranking (YouTube, Internet Archive, Bandcamp)
- **Acquisition**: yt-dlp patterns, archive download, format selection
- **Quality Filtering**: Audio/video quality scoring, accept/reject thresholds
- **Metadata Curation**: opustags / ffmpeg patterns, cover art embedding
- **Transcription**: executable local WhisperX transcript sidecars
- **Speaker Diarization**: anonymous speaker clustering with pyannote via WhisperX
- **Provenance Tracking**: W3C PROV-O derivation chains
- **Export**: Plex / Jellyfin / MPD / archival formats

## Quick Start

```bash
# Full curation workflow
/curate

# Acquire from sources
/acquire

# Tag a collection
/tag-collection

# Generate a transcript sidecar
/transcribe-media

# Generate an anonymous speaker-diarized transcript sidecar
/diarize-media

# Verify archive integrity
/verify-archive
```

## Documentation

- Full guide: https://docs.aiwg.io/media-curator
- Discord: https://discord.gg/BuAusFMxdA
