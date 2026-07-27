# Media Curator Framework

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

You're building a media archive — music, film, video, or any other collection. You want complete coverage of an artist or catalog, consistent metadata, proper file organization, and the ability to export to whatever platform you're using (Plex, Jellyfin, Navidrome, etc.).

The media curator framework handles the research, discovery, acquisition, quality filtering, tagging, and export pipeline. It knows what you have, what you're missing, and where to get it.

---

## Deploy it

```bash
npm install -g aiwg
cd /path/to/your/collection
aiwg use media-curator
claude .
```

---

## The curation workflow

```
analyze → discover sources → acquire → assess quality → tag → check completeness → export
```

---

## Researching a catalog

Start by understanding what a complete collection looks like:

```bash
/analyze-artist "Radiohead"
```

The `discography-analyst` agent researches the artist's complete discography — studio albums, EPs, singles, live releases, compilations — identifies creative eras, and recommends how to structure the catalog. You get a canonical reference before you start acquiring anything.

---

## Discovering sources

```bash
/find-sources "Radiohead" --scope "complete"
```

The `source-discoverer` agent searches YouTube, Internet Archive, Bandcamp, and other platforms for available content. It ranks sources by audio/video quality, legitimacy, and completeness. You get a prioritized source list with format information before downloading anything.

Filter by format or quality threshold:

```bash
/find-sources "Radiohead - OK Computer" --min-quality "lossless"
```

---

## Acquiring content

```bash
/acquire --plan sources.yaml
```

The `acquisition-manager` orchestrates parallel downloads with format selection — picks the best available quality for each item. Progress is tracked, errors are recovered automatically, and the download plan is logged for reproducibility.

Acquire a specific item:

```bash
/acquire "https://archive.org/details/..." --format flac
```

---

## Quality assessment

Every acquired file gets scored across audio quality, completeness, and uniqueness dimensions:

```bash
/quality-assess /path/to/collection --threshold 0.85
```

Files below the threshold are flagged for replacement. The `quality-assessor` agent compares against other copies in your collection and against source metadata to detect encoding artifacts, clipping, and truncation.

---

## Metadata and tagging

```bash
/tag-collection /path/to/collection
```

The `metadata-curator` agent applies consistent metadata tags, embeds artwork, enforces your naming conventions, and organizes files into the directory structure you specify. Works from MusicBrainz and your discography analysis — not guesses.

Enforce a specific naming convention:

```bash
/tag-collection /path/to/collection --convention "artist/year - album/track - title"
```

---

## Checking completeness

```bash
/check-completeness "Radiohead"
```

Compares your collection against the canonical discography to identify gaps. Shows what you have, what's missing, and what's available to acquire. The `completeness-tracker` prioritizes gaps by significance — studio albums before obscure B-sides.

---

## Verifying integrity

```bash
/verify-archive /path/to/collection
```

SHA-256 integrity verification across the entire collection. Detects corruption, identifies files that have changed unexpectedly, and reports anything that doesn't match acquisition records.

---

## Exporting to a platform

```bash
/export --profile plex /path/to/collection /path/to/output
/export --profile jellyfin /path/to/collection /path/to/output
/export --profile navidrome /path/to/collection /path/to/output
```

Each export profile applies the metadata structure and directory organization that the target platform expects. The `asset-manager` handles the transformation without touching your source collection.

---

## Full orchestration

Run the entire pipeline from scratch:

```bash
/curate "Radiohead" --output /path/to/collection --quality lossless
```

This runs analyze → discover → acquire → assess → tag → verify in sequence, pausing for confirmation at key decision points. At the end you have a complete, properly tagged, integrity-verified collection.

---

## Key references

- `/check-completeness` — Collection gap analysis
- `/verify-archive` — Integrity verification
- `@agentic/code/frameworks/media-curator/README.md` — Full framework documentation
