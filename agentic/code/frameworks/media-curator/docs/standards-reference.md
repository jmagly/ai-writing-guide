# Standards Reference

Standards used by the Media Curator framework for metadata, integrity, provenance, and interoperability.

## Metadata Standards

### ID3v2.4 (Audio - MP3)
- **Specification**: id3.org v2.4.0
- **Usage**: Tagging MP3 files with title, artist, album, artwork
- **Key frames**: TIT2 (title), TPE1 (artist), TALB (album), TRCK (track), TDRC (year), APIC (picture)

### Vorbis Comments (Audio - Opus, FLAC, OGG)
- **Specification**: xiph.org Vorbis Comment
- **Usage**: Tagging Opus and FLAC files
- **Key fields**: TITLE, ARTIST, ALBUM, TRACKNUMBER, DATE, GENRE
- **Tool**: `opustags` for Opus files

### MP4 Metadata (Video)
- **Specification**: ISO/IEC 14496-12 (MPEG-4 Part 12)
- **Usage**: Tagging MP4 video files via ffmpeg
- **Key atoms**: title, artist, album, year, description

## Integrity Standards

### SHA-256 (NIST FIPS 180-4)
- **Specification**: NIST Federal Information Processing Standard 180-4
- **Usage**: File integrity verification via CHECKSUMS.sha256
- **Tool**: `sha256sum` (GNU coreutils)
- **Digest length**: 256 bits (64 hex characters)

### Self-Verifying Manifest
- **Pattern**: MANIFEST_HASH header containing SHA-256 of manifest content
- **Verification**: `tail -n +4 CHECKSUMS.sha256 | sha256sum`
- **Purpose**: Detect tampering of the manifest itself

## Provenance Standards

### W3C PROV-O (Provenance Ontology)
- **Specification**: W3C Recommendation 2013-04-30
- **URI**: http://www.w3.org/ns/prov#
- **Core model**: Entity-Activity-Agent
- **Usage**: Tracking derivation chains (source → download → transcode → tag)
- **Serialization**: JSON-LD in PROVENANCE.jsonld

### PREMIS 3.0 (Preservation Metadata)
- **Specification**: Library of Congress PREMIS 3.0
- **URI**: http://www.loc.gov/premis/rdf/v3/
- **Usage**: Fixity metadata linking provenance to integrity verification
- **Key properties**: premis:hasFixity, premis:messageDigestAlgorithm

### Dublin Core 1.1
- **Specification**: DCMI Metadata Terms
- **URI**: http://purl.org/dc/terms/
- **Usage**: Descriptive metadata (title, creator, date, format)

## Data Sources

### MusicBrainz
- **API**: https://musicbrainz.org/ws/2/
- **Format**: JSON (append `&fmt=json`)
- **Rate limit**: 1 request per second
- **Usage**: Canonical discography data, release verification, cover art
- **Cover Art**: https://coverartarchive.org/

### Discogs
- **API**: https://api.discogs.com/
- **Usage**: Physical releases, variants, pressings
- **Rate limit**: 60 requests per minute (authenticated)

### Internet Archive
- **API**: https://archive.org/advancedsearch.php
- **Usage**: Archival audio/video sources
- **Format**: JSON output with `&output=json`

### fanart.tv
- **API**: https://webservice.fanart.tv/v3/music/
- **Usage**: Album artwork, artist images
- **Requires**: API key

## Timestamp Standard

### ISO 8601 with Nanosecond Precision
- **Format**: `YYYY-MM-DDTHH:MM:SS.NNNNNNNNNZ`
- **Example**: `2026-01-26T01:33:51.302755851Z`
- **Command**: `date -u +%Y-%m-%dT%H:%M:%S.%NZ`
- **Rules**:
  - Always UTC (Z suffix)
  - Never local timezone
  - 9 decimal places (nanosecond precision)
  - Used in PROVENANCE.jsonld, CHECKSUMS.sha256, manifest.json

## File Format Preferences

### Audio (ordered by preference)
1. **FLAC** - Lossless, archival quality
2. **Opus** - Best lossy codec, small files, excellent quality at 128kbps
3. **M4A/AAC** - Good compatibility, Apple ecosystem
4. **MP3** - Maximum compatibility, larger files

### Video (ordered by preference)
1. **MKV** - Best container for preservation, supports all codecs
2. **MP4** - Best compatibility across players
3. **WebM** - Web-optimized, VP9/AV1 codecs

### Image (for artwork)
1. **JPEG** - Universal compatibility, embedded in ID3
2. **WebP** - Smaller size, embedded via opustags
3. **PNG** - Lossless, for logos/graphics
4. **SVG** - Vector, for logos only
