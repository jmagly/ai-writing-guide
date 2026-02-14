---
description: Orchestrate end-to-end media curation from analysis through acquisition, tagging, and verification
category: media-curator
argument-hint: "<artist>" [--scope complete|era:NAME|style:NAME] [--output <dir>] [--quality <threshold>] [--export <profile>]
allowed-tools: Bash, Read, Write, Glob, Grep, WebSearch, WebFetch, Task
model: opus
orchestration: true
---

# Curate Media Collection

Main orchestration entry point for end-to-end media curation. Analyzes artist discography, discovers high-quality sources, acquires media, tags metadata, verifies integrity, checks completeness, and optionally exports to platform-specific formats.

## Purpose

Media curation is a multi-phase workflow requiring coordination across analysis, discovery, acquisition, metadata tagging, verification, and export. This command orchestrates the full pipeline, managing dependencies between phases and ensuring quality at each step.

## Parameters

### Required

**`<artist>`** - Artist name to curate. Quoted if contains spaces.

Example: `"Pink Floyd"`

### Optional

**`--scope <complete|era:NAME|style:NAME>`** - Curation scope.

- `complete`: Full discography (all albums, all eras)
- `era:NAME`: Specific era only (e.g., `era:Classic Rock Era (1968-1979)`)
- `style:NAME`: Specific style only (e.g., `style:Progressive Rock`)

Default: `complete`

**`--output <dir>`** - Output directory for curated collection.

Default: `~/Music/Curated/<artist>`

**`--quality <threshold>`** - Minimum quality score (0.0-1.0).

- 0.9-1.0: Audiophile (lossless, verified sources, complete metadata)
- 0.7-0.89: High quality (lossless or high-bitrate lossy, good metadata)
- 0.5-0.69: Standard quality (acceptable lossy formats, basic metadata)
- Below 0.5: Low quality (rejected unless explicitly allowed)

Default: `0.7`

**`--export <profile>`** - Export to platform-specific format after curation.

Options: `plex`, `jellyfin`, `mpd`, `mobile`, `archival`

Default: None (no export)

**`--dry-run`** - Simulate workflow without downloading or modifying files.

**`--resume`** - Resume previous incomplete curation session.

## Orchestration Flow

```
/curate "Pink Floyd" --scope complete --quality 0.8 --export plex

Phase 1: Analysis
├── /analyze-artist "Pink Floyd"
├── Output: Era breakdown, style classification, album list
└── Status: 16 studio albums, 3 eras identified

Phase 2: Discovery
├── /find-sources "Pink Floyd" --scope complete --quality 0.8
├── Searches: MusicBrainz, Archive.org, Discogs, Bandcamp, label sites
├── Output: Ranked source list per album
└── Status: 127 sources found across 16 albums

Phase 3: Acquisition
├── /acquire "Pink Floyd" --quality 0.8
├── Downloads: Top-ranked sources meeting quality threshold
├── Validates: Format, bitrate, checksums
├── Output: Downloaded files in output directory
└── Status: 14/16 albums acquired (2 unavailable at threshold)

Phase 4: Curation
├── /tag-collection ~/Music/Curated/Pink\ Floyd
├── Metadata: Artist, album, track, year, genre, artwork
├── Artwork: Embedded + folder.jpg per album
├── Output: Fully tagged collection
└── /verify-archive ~/Music/Curated/Pink\ Floyd
    ├── Checksums: SHA-256 per file
    ├── Provenance: PROVENANCE.jsonld per album
    ├── Output: SHA256SUMS, PROVENANCE.jsonld
    └── Status: All files verified, provenance recorded

Phase 5: Completeness Analysis
├── /check-completeness ~/Music/Curated/Pink\ Floyd
├── Compares: Collection against canonical discography
├── Output: Gap report (missing albums, tracks, formats)
└── Status: 87.5% complete (2 albums missing)

Phase 6: Export (Optional)
├── /export --profile plex ~/Music/Curated/Pink\ Floyd /media/plex/Music
├── Transcodes: As needed per profile
├── Structure: Artist/Album (Year)/Track - Title.ext
├── Metadata: Embedded + folder.jpg
└── Status: 14 albums exported to Plex
```

## Phase Details

### Phase 1: Analysis

**Command:** `/analyze-artist "<artist>"`

**Purpose:** Understand artist's discography structure, eras, styles, and canonical album list.

**Inputs:**
- Artist name

**Outputs:**
- `.aiwg/media/analysis/<artist>.md`: Era breakdown, style classification
- `.aiwg/media/discography/<artist>.json`: Canonical album list with MusicBrainz IDs

**Success Criteria:**
- All studio albums identified
- Eras defined with year ranges
- Styles classified per album

**Example Output:**
```
Pink Floyd Analysis Complete
- Studio Albums: 16
- Eras: 3 (Psychedelic, Classic Progressive, Post-Waters)
- Styles: Progressive Rock, Psychedelic Rock, Art Rock
- Canonical Discography: .aiwg/media/discography/Pink Floyd.json
```

### Phase 2: Discovery

**Command:** `/find-sources "<artist>" --scope <scope> --quality <threshold>`

**Purpose:** Search multiple sources, rank by quality, filter by threshold.

**Inputs:**
- Artist name
- Scope (complete/era/style)
- Quality threshold

**Outputs:**
- `.aiwg/media/sources/<artist>-sources.json`: Ranked source list per album

**Search Sources:**
1. MusicBrainz (authoritative metadata)
2. Archive.org (public domain, live recordings)
3. Bandcamp (artist-direct, high quality)
4. Discogs (marketplace, quality varies)
5. Label websites (official, often highest quality)

**Ranking Criteria:**
- Format (FLAC > WAV > ALAC > Opus > MP3)
- Bitrate (higher is better for lossy)
- Source reputation (artist-direct > label > verified uploader > unknown)
- Metadata completeness (full tags > partial > missing)
- Artwork availability (embedded + high-res > embedded only > missing)

**Success Criteria:**
- At least one source per album meeting quality threshold
- Sources ranked by quality score

**Example Output:**
```
Discovery Complete: Pink Floyd
- Albums Found: 16/16
- Total Sources: 127
- Sources Meeting Threshold (0.8): 89
- Top Sources: .aiwg/media/sources/Pink Floyd-sources.json
```

### Phase 3: Acquisition

**Command:** `/acquire "<artist>" --quality <threshold>`

**Purpose:** Download top-ranked sources, validate quality, organize files.

**Inputs:**
- Artist name
- Quality threshold
- Source rankings from Phase 2

**Outputs:**
- Downloaded files in `<output_dir>/<artist>/<album>/`
- `.aiwg/media/downloads/<artist>-acquisition.log`: Download log

**Download Strategy:**
1. Select top-ranked source per album
2. Download to temporary location
3. Validate format, bitrate, checksums
4. Move to output directory if valid
5. Retry with next-ranked source on failure

**Validation:**
- Format check: `ffprobe` confirms declared format
- Bitrate check: Meets minimum for quality threshold
- Checksum: If provided by source, verify SHA-256
- File integrity: No corruption, complete download

**Success Criteria:**
- Files downloaded and validated
- Organized in `<artist>/<album>/` structure
- Acquisition log records sources and timestamps

**Example Output:**
```
Acquisition Complete: Pink Floyd
- Albums Acquired: 14/16
- Total Files: 187 tracks, 14 cover images
- Total Size: 4.2 GB
- Failed: 2 albums (no sources meeting threshold 0.8)
- Download Log: .aiwg/media/downloads/Pink Floyd-acquisition.log
```

### Phase 4: Curation

**Subphase 4a: Tagging**

**Command:** `/tag-collection <collection_path>`

**Purpose:** Embed complete metadata and artwork into all files.

**Inputs:**
- Collection directory path
- Canonical discography from Phase 1

**Outputs:**
- Tagged audio files (metadata embedded)
- `folder.jpg` per album directory
- `.aiwg/media/tagging/<artist>-tagging.log`: Tagging log

**Metadata Sources:**
1. MusicBrainz (authoritative)
2. Discogs (supplementary)
3. Embedded tags (if already present)

**Tags Applied:**
- Artist, Album Artist, Album, Track Title, Track Number
- Year, Date, Genre, Style
- MusicBrainz IDs (release, recording, artist)
- Label, Catalog Number

**Artwork Handling:**
- Extract embedded artwork if present
- Search for high-resolution artwork if missing
- Resize to 1500x1500 maximum
- Embed into audio files
- Save as `folder.jpg` in album directory

**Success Criteria:**
- All files have complete metadata
- All albums have artwork (embedded + folder.jpg)

**Example Output:**
```
Tagging Complete: Pink Floyd
- Files Tagged: 187/187
- Metadata Sources: MusicBrainz (primary), Discogs (supplementary)
- Artwork: 14 albums (all with embedded + folder.jpg)
- Tagging Log: .aiwg/media/tagging/Pink Floyd-tagging.log
```

**Subphase 4b: Verification**

**Command:** `/verify-archive <collection_path>`

**Purpose:** Generate checksums and provenance records for archival integrity.

**Inputs:**
- Collection directory path

**Outputs:**
- `SHA256SUMS` per album directory
- `PROVENANCE.jsonld` per album directory
- `.aiwg/media/verification/<artist>-verification.log`: Verification log

**Checksum Generation:**
```bash
cd "$album_dir"
find . -type f -not -name "SHA256SUMS" -exec sha256sum {} \; > SHA256SUMS
```

**Provenance Record (W3C PROV):**
```json
{
  "@context": "https://www.w3.org/ns/prov",
  "entity": "urn:aiwg:media:album:{mbid}",
  "wasGeneratedBy": {
    "activity": "urn:aiwg:activity:curation:{timestamp}",
    "time": "{iso8601_timestamp}",
    "wasAssociatedWith": "urn:aiwg:agent:media-curator"
  },
  "wasDerivedFrom": [
    {
      "entity": "{source_url}",
      "type": "download",
      "time": "{acquisition_date}"
    }
  ]
}
```

**Success Criteria:**
- Checksums generated for all files
- Provenance records created per album

**Example Output:**
```
Verification Complete: Pink Floyd
- Checksums: 14 SHA256SUMS files (201 total hashes)
- Provenance: 14 PROVENANCE.jsonld files
- Verification Log: .aiwg/media/verification/Pink Floyd-verification.log
```

### Phase 5: Completeness Analysis

**Command:** `/check-completeness <collection_path>`

**Purpose:** Compare collection against canonical discography, identify gaps.

**Inputs:**
- Collection directory path
- Canonical discography from Phase 1

**Outputs:**
- `.aiwg/media/reports/<artist>-completeness.md`: Gap report

**Comparison Logic:**
1. Load canonical discography
2. Scan collection directory
3. Match albums by name, year, MusicBrainz ID
4. Identify missing albums, missing tracks, format gaps

**Gap Categories:**
- **Missing Albums**: In canonical discography but not in collection
- **Partial Albums**: Some tracks missing
- **Format Gaps**: Lossy format where lossless exists
- **Metadata Gaps**: Missing tags or artwork

**Success Criteria:**
- Gap report generated
- Completeness percentage calculated

**Example Output:**
```
Completeness Report: Pink Floyd
- Albums: 14/16 (87.5%)
- Missing Albums: 2 (The Division Bell, The Endless River)
- Partial Albums: 0
- Format Gaps: 0
- Metadata Gaps: 0
- Report: .aiwg/media/reports/Pink Floyd-completeness.md
```

### Phase 6: Export (Optional)

**Command:** `/export --profile <profile> <collection_path> <output_path>`

**Purpose:** Transform collection to platform-specific format.

**Inputs:**
- Profile (plex, jellyfin, mpd, mobile, archival)
- Collection directory path
- Output directory path

**Outputs:**
- Platform-specific directory structure
- Transcoded files (if needed)
- Platform-specific metadata files (NFO, checksums, etc.)

**Success Criteria:**
- All files exported to target directory
- Directory structure matches profile specification
- Metadata formatted for target platform

**Example Output:**
```
Export Complete: Plex Profile
- Source: ~/Music/Curated/Pink Floyd
- Destination: /media/plex/Music/Pink Floyd
- Albums Exported: 14
- Total Size: 4.2 GB
- Transcoded: 0 (all FLAC, compatible with Plex)
```

## Progress Reporting

After each phase, report:

1. **Phase Name** and status (Complete/Failed/Partial)
2. **Key Metrics** (albums found, files downloaded, tags applied, etc.)
3. **Output Artifacts** (file paths to generated reports, logs, collections)
4. **Next Steps** (what the next phase will do)

**Example:**

```
Phase 2: Discovery - COMPLETE

Key Metrics:
- Albums Found: 16/16
- Total Sources: 127
- Sources Meeting Threshold (0.8): 89

Output Artifacts:
- Source Rankings: .aiwg/media/sources/Pink Floyd-sources.json

Next Steps:
- Phase 3 will download the top-ranked source for each album
- Quality threshold 0.8 ensures lossless or high-bitrate formats
- Estimated download size: ~4-5 GB
```

## Examples

### Full Orchestration (Complete Discography)

```bash
/curate "Pink Floyd" --scope complete --quality 0.8 --output ~/Music/Curated --export plex
```

**What happens:**
1. Analyze Pink Floyd's full discography
2. Find sources for all albums (quality threshold 0.8)
3. Download top-ranked sources
4. Tag with complete metadata and artwork
5. Verify with checksums and provenance
6. Check completeness against canonical discography
7. Export to Plex format at `/media/plex/Music`

**Output:**
```
Curation Complete: Pink Floyd

Phase 1 (Analysis): 16 studio albums, 3 eras identified
Phase 2 (Discovery): 127 sources found, 89 meeting threshold
Phase 3 (Acquisition): 14/16 albums downloaded (2 unavailable at 0.8)
Phase 4 (Curation): 187 files tagged, 14 albums verified
Phase 5 (Completeness): 87.5% complete (2 albums missing)
Phase 6 (Export): 14 albums exported to Plex

Collection Path: ~/Music/Curated/Pink Floyd
Export Path: /media/plex/Music/Pink Floyd
Completeness Report: .aiwg/media/reports/Pink Floyd-completeness.md
```

### Targeted Era Curation

```bash
/curate "Pink Floyd" --scope "era:Classic Progressive (1973-1979)" --quality 0.9
```

**What happens:**
1. Analyze Pink Floyd discography, filter to Classic Progressive era
2. Find sources for albums in that era only
3. Download with audiophile quality threshold (0.9)
4. Tag and verify
5. Check completeness for era only
6. No export (not specified)

**Output:**
```
Curation Complete: Pink Floyd (Classic Progressive Era)

Phase 1 (Analysis): 4 albums in era (DSOTM, WYWH, Animals, The Wall)
Phase 2 (Discovery): 37 sources found, 31 meeting threshold
Phase 3 (Acquisition): 4/4 albums downloaded
Phase 4 (Curation): 53 files tagged, 4 albums verified
Phase 5 (Completeness): 100% complete for era

Collection Path: ~/Music/Curated/Pink Floyd/Classic Progressive
```

### Style-Based Curation

```bash
/curate "Pink Floyd" --scope "style:Psychedelic Rock" --quality 0.7
```

**What happens:**
1. Analyze Pink Floyd discography, filter to Psychedelic Rock albums
2. Find sources for those albums
3. Download with standard quality threshold (0.7)
4. Tag and verify
5. Check completeness for style only

**Output:**
```
Curation Complete: Pink Floyd (Psychedelic Rock)

Phase 1 (Analysis): 3 albums (The Piper at the Gates of Dawn, A Saucerful of Secrets, Ummagumma)
Phase 2 (Discovery): 24 sources found, 18 meeting threshold
Phase 3 (Acquisition): 3/3 albums downloaded
Phase 4 (Curation): 31 files tagged, 3 albums verified
Phase 5 (Completeness): 100% complete for style

Collection Path: ~/Music/Curated/Pink Floyd/Psychedelic Rock
```

### Dry Run (Simulation)

```bash
/curate "Pink Floyd" --scope complete --quality 0.8 --dry-run
```

**What happens:**
1. All phases execute in simulation mode
2. No downloads occur
3. No files are modified
4. Reports generated showing what WOULD happen

**Output:**
```
Dry Run Complete: Pink Floyd

Phase 1 (Analysis): SIMULATED - 16 albums identified
Phase 2 (Discovery): SIMULATED - 127 sources found
Phase 3 (Acquisition): SIMULATED - Would download 14 albums (~4.2 GB)
Phase 4 (Curation): SIMULATED - Would tag 187 files
Phase 5 (Completeness): SIMULATED - Would achieve 87.5% completeness
Phase 6 (Export): SKIPPED (not requested)

No files were downloaded or modified.
Simulation Report: .aiwg/media/reports/Pink Floyd-dry-run.md
```

### Resume Previous Session

```bash
/curate "Pink Floyd" --resume
```

**What happens:**
1. Load session state from `.aiwg/media/sessions/<artist>-session.json`
2. Skip completed phases
3. Resume from last incomplete phase
4. Continue to completion

**Output:**
```
Resuming Session: Pink Floyd

Session State: .aiwg/media/sessions/Pink Floyd-session.json
Completed Phases: 1, 2, 3, 4a
Resuming from: Phase 4b (Verification)

Phase 4b (Verification): 14 albums verified
Phase 5 (Completeness): 87.5% complete
Phase 6 (Export): SKIPPED (not requested in original session)

Session Complete.
```

## Error Handling

### Phase Failures

If a phase fails:
1. Log error details to `.aiwg/media/errors/<artist>-errors.log`
2. Save session state (completed phases, partial progress)
3. Report failure to user with recovery options
4. Offer `--resume` to continue from last successful phase

### Partial Success

If some albums succeed but others fail:
1. Continue with successful albums
2. Report partial success with failure details
3. Generate completeness report showing gaps
4. Suggest manual intervention for failed albums

### Quality Threshold Not Met

If no sources meet quality threshold:
1. Report missing albums
2. Suggest lowering threshold
3. Offer to search additional sources
4. Continue with available albums

## Session State Persistence

Session state saved to `.aiwg/media/sessions/<artist>-session.json`:

```json
{
  "artist": "Pink Floyd",
  "scope": "complete",
  "quality_threshold": 0.8,
  "output_dir": "~/Music/Curated/Pink Floyd",
  "export_profile": "plex",
  "start_time": "2026-02-14T10:30:00Z",
  "phases": {
    "analysis": "complete",
    "discovery": "complete",
    "acquisition": "complete",
    "tagging": "complete",
    "verification": "in_progress",
    "completeness": "pending",
    "export": "pending"
  },
  "progress": {
    "albums_analyzed": 16,
    "sources_found": 127,
    "albums_downloaded": 14,
    "files_tagged": 187,
    "albums_verified": 8
  }
}
```

## Performance Considerations

- **Parallel Downloads**: Use GNU parallel for multi-source acquisition
- **Caching**: Cache MusicBrainz and Discogs API responses
- **Incremental Progress**: Save state after each phase
- **Resource Limits**: Respect API rate limits, bandwidth constraints
- **Disk Space**: Check available space before downloading

## Quality Assurance

Each phase validates outputs before proceeding:
- Analysis: Canonical discography has MusicBrainz IDs
- Discovery: Source rankings are non-empty
- Acquisition: Downloaded files are valid and complete
- Tagging: All files have required metadata
- Verification: Checksums and provenance records exist
- Completeness: Gap report generated
- Export: Output directory structure is valid
