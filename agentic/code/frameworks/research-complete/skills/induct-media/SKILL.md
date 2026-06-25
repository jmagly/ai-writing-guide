---
namespace: aiwg
platforms: [all]
name: induct-media
description: Induct acquired audio/video, transcript sidecars, and source metadata from media-curator into research-complete REF artifacts with timestamp citations and storage policy records
userInvocable: true
triggers:
  - "induct media research source"
  - "video audio research induction"
  - "media research handoff"
  - "timestamp citation transcript"
  - "media REF template"
  - "turn acquired media into research corpus REF"
commandHint:
  argumentHint: "<media-metadata.json|media-path> --transcript <path> --source-url <url> [--storage copied|lfs|object-storage|hash-only] [--ref-id REF-XXX] [--dry-run]"
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: research
---

# Induct Media

Create research-complete artifacts from media-curator acquisitions: a media REF,
citation sidecar, radar sidecar, index/search metadata notes, and optional
profile backlinks. This is the media-curator to research handoff for videos,
lectures, podcasts, talks, and interviews.

## Triggers

- "induct media research source"
- "video audio research induction"
- "media research handoff"
- "timestamp citation transcript"
- "media REF template"
- "turn acquired media into research corpus REF"

## Inputs

Required:
- Acquired media metadata or local media path from media-curator.
- Transcript sidecar path from `transcribe-media`.
- Source URL.

Optional:
- `--ref-id REF-XXX` to use an assigned identifier.
- `--storage copied|lfs|object-storage|hash-only` to choose archive policy.
- Title, platform, duration, publication/upload date, speakers, channel/venue,
  license, acquisition ID, media hash, transcript hash.
- Existing citation mentions extracted from the transcript.

## Storage Policies

Choose one policy and record it in the REF frontmatter:

| Policy | Use when | Required record |
|---|---|---|
| `copied` | File is small enough for normal corpus storage | `media/video/` or `media/audio/` path and SHA-256 |
| `lfs` | Git LFS is enabled for large binaries | LFS path, pointer committed, SHA-256 |
| `object-storage` | S3/WebDAV/object backend stores binaries | Object URI, backend name, SHA-256 |
| `hash-only` | Corpus cannot store or redistribute the media | Source URL, media SHA-256 when locally available, acquisition note |

Never copy media when license or platform terms do not allow redistribution.
Hash-only records are valid when source integrity and transcript provenance are
enough for corpus analysis.

## Output Artifacts

Write or update:
- `.aiwg/research/findings/REF-XXX.md` from `templates/reference-media.md`
- `.aiwg/research/citations/REF-XXX-citations.md` from `templates/citation-sidecar.md`
- `.aiwg/research/radar/REF-XXX-radar.md` from `templates/radar-sidecar.md`
- `.aiwg/research/index.md` or the configured index/search metadata
- Speaker/channel/venue profile backlinks when profiles already exist

Recommended media layout:
- `media/video/REF-XXX-speaker-year-short-title.mp4`
- `media/audio/REF-XXX-speaker-year-short-title.mp3`
- `media/transcripts/REF-XXX-speaker-year-short-title.transcript.json`

## Execution Flow

1. Read acquisition metadata and transcript sidecar.
2. Verify the transcript sidecar has `schema: aiwg.media.transcript.v1`,
   `segments[]`, `source.sha256`, and `transcript.sha256`.
3. Resolve or assign `REF-XXX`.
4. Determine source type (`video`, `audio`, `podcast`, `lecture`, `interview`,
   or `talk`) and select `reference-media.md`.
5. Apply the selected storage policy. Compute missing SHA-256 values when the
   local file is readable.
6. Generate the media REF with source URL, platform, duration, upload date,
   speakers, channel/venue, transcript path/hash, media storage, and license.
7. Generate citation sidecar:
   - normal paper-style outgoing/incoming tables when formal references exist
   - spoken-reference table for timestamped verbal mentions and unresolved
     informal references
8. Generate radar sidecar with media-specific GRADE rationale.
9. Update index/search metadata so `research-query` can find the REF by title,
   speakers, source URL, channel/venue, source type, and transcript text when
   available.
10. Report verification limits and required human review before publication
    quotes are used.

## Citation Rules

Timestamp citations use:

```text
@.aiwg/research/findings/REF-XXX.md @ HH:MM:SS - "exact transcript quote"
```

The timestamp MUST exist in the transcript sidecar, and the quote MUST exactly
match the transcript text. Keep spoken references distinct from formal paper
citations; unresolved verbal mentions remain valid sidecar rows with
`Inducted REF` set to `-`.

## Worked Fixture

Minimal media-curator output:

```json
{
  "schema": "aiwg.media.acquisition.v1",
  "title": "Example Lecture",
  "source_url": "https://example.invalid/watch?v=lecture",
  "platform": "YouTube",
  "media_path": ".aiwg/media/acquisitions/example-lecture.mp4",
  "sha256": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "duration": "00:42:00",
  "speakers": [{"name": "Doe, Jane"}],
  "license": "platform ToS only"
}
```

Transcript from `transcribe-media`:

```json
{
  "schema": "aiwg.media.transcript.v1",
  "source": {
    "path": ".aiwg/media/acquisitions/example-lecture.mp4",
    "url": "https://example.invalid/watch?v=lecture",
    "sha256": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "transcript": {
    "sha256": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "language": "en",
    "tool": "human",
    "quality": {"limitations": []}
  },
  "segments": [
    {"id": "seg-000001", "start": "00:00:05", "end": "00:00:12", "speaker": "SPEAKER_00", "text": "Exact words from the lecture."}
  ]
}
```

Expected research outputs:
- `REF-XXX.md` records source URL, platform, duration, speaker, transcript hash,
  media hash, license posture, and key timestamps.
- `REF-XXX-citations.md` includes any formal references plus timestamped spoken
  mentions.
- `REF-XXX-radar.md` records media GRADE and refresh cadence.
- Index/search metadata includes source type, speaker, channel/venue, source
  URL, transcript path, and storage policy.

A complete, runnable worked example — `sample.acquisition.json` (from
media-curator `/acquire`) and `sample.transcript.json` (from `/transcribe-media`)
plus the three expected output artifacts — lives in `examples/`. See
`examples/README.md`. The acquisition fixture is byte-identical to
media-curator's `acquire/examples/sample.acquisition.json`, so the input contract
is exercised end to end.

## References

- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/transcribe-media/SKILL.md
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/templates/reference-media.md
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/templates/citation-sidecar.md
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/templates/radar-sidecar.md
