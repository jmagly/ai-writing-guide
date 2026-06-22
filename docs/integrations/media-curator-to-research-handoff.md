# Media Curator → Research Complete: Acquisition Handoff

**Status**: Interface specification
**Related issues**: #817 (enforce PDF acquisition), #818 (this handoff)

## Design Principle

**Media curation is upstream. Research is downstream.** Acquisition of files from external sources is media curation's responsibility — research consumes what media curation provides.

This handoff formalizes the boundary that removed ~40 embedded `curl` calls from
research induction agents and eliminated duplicate functionality between
`/research-acquire` and `/acquire`. For time-based media, the same boundary now
extends through `transcribe-media` and `induct-media`: media-curator acquires and
transcribes; research-complete turns the result into citable REF artifacts.

## Responsibilities

### Media Curation (upstream)

- **Discovery**: Finding source candidates (`/find-sources`)
- **Acquisition**: Downloading files from any source (`/acquire`)
- **Format normalization**: Converting to canonical formats (PDF, HTML, MP3, MP4)
- **Storage**: Placing files in canonical locations
- **Metadata extraction**: Pulling title, authors, dates, checksums from the file itself
- **Integrity**: SHA-256 hashing, archival packaging

Media curation answers: **"Given a URL or query, produce a file on disk."**

### Research Complete (downstream)

- **Analysis**: Reading the file and writing 15-section analysis docs (`/induct-research`)
- **Citation extraction**: Parsing references from analyzed papers
- **Indexing**: Building topic/year/author/citation graphs (`/corpus-index-build`)
- **Linking**: Bidirectional citations (`/citation-backfill`), clusters (`/research-gap-detect`)
- **Quality assessment**: GRADE scoring (`/research-quality`), depth audits (`/research-quality-audit`)
- **Reporting**: Corpus snapshots (`/corpus-snapshot`), gap analyses

Research answers: **"Given a file produced by media curation, extract knowledge and integrate it into the corpus."**

For videos, lectures, podcasts, talks, and interviews, research-complete also
answers: **"Given acquired media plus a transcript sidecar, produce a REF,
sidecars, timestamp citations, and searchable corpus metadata."**

## Canonical Storage Locations

Media curation writes to these paths; research reads from them:

```
.aiwg/research/sources/
├── pdfs/
│   ├── full/                    # Full PDF files (primary artifact)
│   │   └── REF-016-autogen.pdf
│   └── preview/                 # Abstract-only PDFs (fallback)
├── web/                         # Saved web pages
│   └── REF-298-blog-post.html
├── text/                        # Extracted plain text (primary input for analysis)
│   └── REF-016.txt
└── metadata/                    # Extracted metadata sidecars
    └── REF-016.yaml
media/
├── video/                       # Copied or LFS-managed video when permitted
├── audio/                       # Copied or LFS-managed audio when permitted
└── transcripts/                 # Timestamped transcript sidecars
```

## Handoff Protocol

### 1. Research requests acquisition

When `/induct-research` encounters a paper URL, it delegates to media curation:

```bash
# Research invokes media-curator's acquire skill:
/acquire --url <paper-url> --format pdf --output .aiwg/research/sources/pdfs/full/ --extract-text

# On success, media curator returns:
{
  "status": "acquired",
  "ref_id": "REF-016",
  "pdf_path": ".aiwg/research/sources/pdfs/full/REF-016-autogen.pdf",
  "text_path": ".aiwg/research/sources/text/REF-016.txt",
  "metadata_path": ".aiwg/research/sources/metadata/REF-016.yaml",
  "checksum": "a1b2c3d4...",
  "size_bytes": 2457600
}

# On failure:
{
  "status": "acquisition-failed",
  "reason": "paywall|dead-link|parse-error|timeout",
  "suggestion": "Try /find-sources for alternative URLs"
}
```

### 2. Research consumes the acquired file

Once acquisition succeeds, research runs its analysis pipeline:

```bash
# Research reads the extracted text and writes analysis:
/induct-research --ref-id REF-016 --source-text .aiwg/research/sources/text/REF-016.txt
```

### 3. Research requests targeted hunting

When research has gap analysis results, it asks media curation to hunt for specific papers:

```bash
# Research generates bridge candidate list from /research-gap-detect
# Media curation finds and acquires them:
/find-sources --query "LLM agent GUI interaction orchestration" --limit 10
/acquire --plan .curator/sources/plan-XXX.yaml
```

### 4. Time-based media induction

When the source is a recording rather than a paper, media-curator produces an
acquisition record and transcript sidecar before research-complete induction:

```bash
# Acquire through media-curator patterns (YouTube, Internet Archive, direct URL).
/acquire --url "https://example.invalid/watch?v=lecture" --format video \
  --output .aiwg/media/acquisitions/

# Produce a research-grade transcript sidecar.
/transcribe-media .aiwg/media/acquisitions/REF-123-lecture.mp4 \
  --source-url "https://example.invalid/watch?v=lecture" \
  --output .aiwg/research/media/transcripts/REF-123-lecture.transcript.json

# Hand off to research-complete.
/induct-media .aiwg/media/acquisitions/REF-123-lecture.metadata.json \
  --transcript .aiwg/research/media/transcripts/REF-123-lecture.transcript.json \
  --source-url "https://example.invalid/watch?v=lecture" \
  --storage hash-only --ref-id REF-123
```

Expected research outputs:

- `.aiwg/research/findings/REF-123.md` from `reference-media.md`
- `.aiwg/research/citations/REF-123-citations.md` with spoken references
- `.aiwg/research/radar/REF-123-radar.md`
- index/search metadata for title, source type, speakers, channel/venue, source
  URL, transcript path, and storage policy

Timestamp citations use the corpus REF and exact transcript quote:

```markdown
@.aiwg/research/findings/REF-123.md @ 00:12:34 - "exact transcript quote"
```

`citation-guard` accepts this form only after the REF and transcript sidecar
exist and the timestamped quote matches the transcript segment. `research-query`
can then ground answers against the REF metadata and transcript text when the
project index includes transcript content.

## Cross-Pollination

The handoff is not one-directional:

| Research signals media curator | Media curator signals research |
|-------------------------------|-------------------------------|
| Gap analysis → acquisition priorities | New acquisitions → induction queue |
| Stub docs with missing PDFs → re-acquire requests | Format availability (PDF vs preview) |
| Bridge candidate searches | Quality indicators from acquisition (paywall, scan quality) |

## Deprecation Path

### `/research-acquire` → delegated to `/acquire`

The existing `/research-acquire` skill is retained as a **thin wrapper** that delegates to `/acquire`:

- `/research-acquire` stays as the entry point for research workflows
- Internally, it calls `/acquire` for the actual download
- Research-specific post-processing (REF assignment, finding doc generation) stays in `/research-acquire`

This preserves backwards compatibility while eliminating the duplicate implementation.

### Embedded `curl` calls → removed

All ~40 embedded `curl`/`wget` calls in research induction agents should be replaced with calls to `/acquire`. This is tracked separately.

## Interface Contract

| Contract element | Value |
|------------------|-------|
| Input protocol | URL, DOI, arXiv ID, or search query |
| Output artifacts | File in canonical location + metadata sidecar + extracted text |
| Failure modes | `acquisition-failed` status with reason + suggestion |
| Idempotency | Re-running `/acquire` on same URL returns cached result unless `--force` |
| Concurrency | Media curator handles rate limiting; research does not need to |
| Checksums | SHA-256, stored in metadata sidecar and corpus fixity manifest |

## Integration Points

| Skill | How it uses the handoff |
|-------|------------------------|
| `/induct-research` | Requests acquisition in Phase 2 (#817) |
| `/research-gap-detect` | Delegates bridge candidate acquisition to `/find-sources` + `/acquire` |
| `/corpus-export` | Reads acquired files from canonical locations for packaging (#819) |
| `/research-quality-audit` | Flags stubs with missing PDFs; triggers re-acquisition |

## References

- `@agentic/code/frameworks/media-curator/skills/acquire/SKILL.md` — Acquisition command
- `@agentic/code/frameworks/media-curator/skills/find-sources/SKILL.md` — Source discovery
- `@agentic/code/frameworks/research-complete/skills/research-acquire/SKILL.md` — Research-specific wrapper
- `@agentic/code/frameworks/research-complete/skills/induct-research/SKILL.md` — Consumes acquired files
- Issue #817 — Enforce PDF acquisition before analysis
- Issue #818 — This handoff specification
