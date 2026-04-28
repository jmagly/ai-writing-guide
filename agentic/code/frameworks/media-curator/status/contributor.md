---
kind: status
domain: Media Library
description: Reports media archive size, organization, and missing-metadata signals
detect:
  glob:
    - "media/**/*.{mp3,flac,opus,m4a,wav,aac,ogg}"
    - "media/**/*.{mp4,mkv,webm,mov,avi}"
    - "media/**/*.{jpg,jpeg,png,webp,heic}"
    - ".aiwg/media/**/*.md"
  minCount: 1
---

# Media Library Status Contributor

Reports observed state of a media archive curated with the `media-curator`
framework. Activates when media files exist in canonical paths, not merely
because the framework is installed — many projects ship the framework but
never curate media.

## What This Contributor Reports

When media files are detected, the aggregator should produce a media library
status block covering:

### 1. Archive Size

- Total file count by extension family (audio / video / image)
- Total bytes (rounded to GB)
- Number of top-level archive directories

### 2. Organization

- Subdirectory depth distribution (flat vs deeply nested)
- Files at the root with no subdirectory classification (orphans)
- Naming convention adherence — count of files matching the configured
  pattern in `.aiwg/media/curation-rules.md` if that file exists

### 3. Missing Metadata

For each media kind, count files missing the required metadata tags
(per `.aiwg/media/metadata-policy.md` if present, else conservative defaults):

- Audio: artist, album, title, year, genre
- Video: title, year, container codec
- Image: capture date, geolocation (where opt-in)

Surface as `<N> of <total> files missing metadata`.

### 4. Recent Curation Activity

Most recent change in `.aiwg/media/` (file mtime + filename). Indicates
how active the curator is.

### 5. Tooling Health (best-effort)

If `.aiwg/media/last-curation-run.md` exists, surface its timestamp and
summary. If it's stale (>30 days) flag as a stale-archive signal.

## Output Format Guidance

```
├─ Media Library: <N> files (<X> GB), <K> missing metadata, last curated <date>
```

Detail under the block:

```
├─ Media Library
│  ├─ Files: 4,217 (audio: 3,902 / video: 248 / image: 67)
│  ├─ Size: 184 GB across 12 top-level directories
│  ├─ Missing metadata: 51 audio (1.3%)
│  └─ Last curation: 2026-04-12 (15 days ago)
```

## Anti-Pattern Reminders

- Do not enumerate every file in the report. Counts and categorical breakdowns
  are sufficient — full inventories belong in `aiwg-status` or a dedicated
  curation report, not in `project-status`.
- Do not read media file contents to compute the report. Filename + extension
  + filesystem mtime + presence of `.aiwg/media/*.md` policy files is
  enough.
- Do not flag missing metadata as a blocker. Curation is opt-in; the
  contributor surfaces the count, the user decides whether to act.
