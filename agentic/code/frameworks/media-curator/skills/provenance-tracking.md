---
name: Provenance Tracking
description: W3C PROV-O patterns for tracking media derivation chains and production history
category: media-curator
---

# Provenance Tracking

W3C PROV-compliant provenance tracking for media archives using the Entity-Activity-Agent model in JSON-LD format.

## PROV Model for Media

### Entity (prov:Entity)
A media file — the thing being tracked.

### Activity (prov:Activity)
A transformation — download, transcode, tag, extract audio.

### Agent (prov:Agent)
A tool or person — yt-dlp, ffmpeg, opustags, the curator.

## Derivation Chains

Media files often go through multiple transformations:

```
YouTube video (Entity)
  → downloaded by yt-dlp (Activity, Agent: yt-dlp)
  → raw .mkv file (Entity)
    → audio extracted by ffmpeg (Activity, Agent: ffmpeg)
    → raw .opus file (Entity)
      → tagged by opustags (Activity, Agent: opustags)
      → final .opus file (Entity)
```

Each step is recorded with timestamps, tool versions, and parameters.

## PROVENANCE.jsonld Template

```json
{
  "@context": {
    "prov": "http://www.w3.org/ns/prov#",
    "schema": "http://schema.org/",
    "premis": "http://www.loc.gov/premis/rdf/v3/",
    "dc": "http://purl.org/dc/terms/",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@graph": [
    {
      "@id": "urn:archive:entity:collection",
      "@type": "prov:Collection",
      "dc:title": "Artist Name - Complete Collection",
      "prov:generatedAtTime": "2026-01-26T01:33:51.302755851Z",
      "schema:numberOfItems": 1109,
      "schema:size": "94GB",
      "premis:hasFixity": {
        "@type": "premis:Fixity",
        "premis:messageDigestAlgorithm": {
          "@id": "http://id.loc.gov/vocabulary/preservation/cryptographicHashFunctions/sha256"
        },
        "premis:messageDigestOriginator": "sha256sum (GNU coreutils)",
        "schema:url": "CHECKSUMS.sha256",
        "schema:numberOfItems": 1109
      }
    },
    {
      "@id": "urn:archive:activity:acquisition",
      "@type": "prov:Activity",
      "prov:startedAtTime": "2026-01-24T15:00:00.000000000Z",
      "prov:endedAtTime": "2026-01-26T01:33:51.302755851Z",
      "prov:wasAssociatedWith": [
        {"@id": "urn:archive:agent:yt-dlp"},
        {"@id": "urn:archive:agent:ffmpeg"},
        {"@id": "urn:archive:agent:opustags"}
      ],
      "prov:generated": {"@id": "urn:archive:entity:collection"}
    },
    {
      "@id": "urn:archive:agent:yt-dlp",
      "@type": ["prov:SoftwareAgent", "prov:Agent"],
      "schema:name": "yt-dlp",
      "schema:softwareVersion": "2024.12.23",
      "schema:description": "Video/audio downloader"
    },
    {
      "@id": "urn:archive:agent:ffmpeg",
      "@type": ["prov:SoftwareAgent", "prov:Agent"],
      "schema:name": "ffmpeg",
      "schema:softwareVersion": "7.1",
      "schema:description": "Audio/video transcoder"
    },
    {
      "@id": "urn:archive:agent:opustags",
      "@type": ["prov:SoftwareAgent", "prov:Agent"],
      "schema:name": "opustags",
      "schema:softwareVersion": "1.9.0",
      "schema:description": "Opus metadata tagger"
    }
  ]
}
```

## Per-File Provenance

For detailed tracking, record provenance per file:

```json
{
  "@id": "urn:archive:entity:car-radio-opus",
  "@type": "prov:Entity",
  "dc:title": "Car Radio",
  "schema:encodingFormat": "audio/opus",
  "prov:wasDerivedFrom": {
    "@id": "urn:archive:entity:car-radio-mkv"
  },
  "prov:wasGeneratedBy": {
    "@id": "urn:archive:activity:extract-audio-001",
    "@type": "prov:Activity",
    "prov:used": {"@id": "urn:archive:entity:car-radio-mkv"},
    "prov:wasAssociatedWith": {"@id": "urn:archive:agent:ffmpeg"},
    "prov:startedAtTime": "2026-01-25T10:15:30.000000000Z",
    "schema:description": "ffmpeg -i car-radio.mkv -vn -acodec libopus -b:a 128k car-radio.opus"
  }
}
```

## Timestamp Standard

All timestamps MUST use ISO 8601 UTC with nanosecond precision:

```
Format: YYYY-MM-DDTHH:MM:SS.NNNNNNNNNZ
Example: 2026-01-26T01:33:51.302755851Z
Command: date -u +%Y-%m-%dT%H:%M:%S.%NZ
```

- Always UTC (Z suffix), never local timezone
- 9 decimal places (nanosecond precision)

## Generation Commands

### Get Tool Versions
```bash
yt-dlp --version
ffmpeg -version | head -1 | awk '{print $3}'
opustags --version 2>&1 | head -1
```

### Generate Timestamp
```bash
date -u +%Y-%m-%dT%H:%M:%S.%NZ
```

### Count Files
```bash
find . -type f ! -name "CHECKSUMS.sha256" ! -name "PROVENANCE.jsonld" | wc -l
```

### Calculate Total Size
```bash
du -sh . | cut -f1
```

## Standards Reference

| Standard | Version | Usage |
|----------|---------|-------|
| W3C PROV-O | 2013-04-30 | Provenance ontology |
| PREMIS | 3.0 | Preservation fixity metadata |
| Dublin Core | 1.1 | Descriptive metadata |
| Schema.org | Latest | Structured data |
| JSON-LD | 1.1 | Serialization format |
| ISO 8601 | 2019 | Timestamps |
