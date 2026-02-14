---
description: Verify archive integrity with self-verifying SHA-256 checksums, generate VERIFY.md, and optionally create W3C PROV provenance
category: media-curator
argument-hint: <archive_path> [--generate] [--verify] [--provenance] [--fix]
allowed-tools: Bash, Read, Write, Glob, Grep
model: sonnet
---

# verify-archive

Detect bit rot, tampering, and transfer errors in media archives through cryptographic checksum verification. Maintain provenance records and fixity information for long-term preservation.

## Purpose

Media archives degrade over time through:
- **Bit rot**: Silent data corruption in storage media
- **Transfer errors**: Corruption during network transfer or backup
- **Tampering**: Unauthorized modifications
- **Media failure**: Gradual deterioration of physical storage

This command generates self-verifying checksum manifests, performs integrity verification, and optionally creates W3C PROV provenance records with PREMIS fixity metadata.

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `archive_path` | Yes | Path to media archive directory |
| `--generate` | No | Generate new CHECKSUMS.sha256 manifest |
| `--verify` | No | Verify existing manifest against files |
| `--provenance` | No | Generate PROVENANCE.jsonld with PREMIS fixity |
| `--fix` | No | Regenerate manifest after archive changes |

**Mutually exclusive modes**: Use `--generate` for initial setup, `--verify` for routine checks, `--fix` after making changes.

## CHECKSUMS.sha256 Format

Self-verifying manifest with cryptographic integrity protection:

```
# MANIFEST_HASH: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
# Generated: 2026-02-14T18:45:22.387654321Z
# Verify with: tail -n +4 CHECKSUMS.sha256 | sha256sum
1a2b3c4d...  ./audio/episode-001.opus
5e6f7g8h...  ./audio/episode-002.opus
9i0j1k2l...  ./video/recording-2026-02-14.mp4
3m4n5o6p...  ./playlists/favorites.m3u
7q8r9s0t...  ./README.md
```

**Format specification**:
- **Line 1**: `# MANIFEST_HASH: <sha256>` - SHA-256 hash of manifest content (lines 4+)
- **Line 2**: `# Generated: <timestamp>` - ISO 8601 UTC timestamp with nanosecond precision
- **Line 3**: `# Verify with: tail -n +4 CHECKSUMS.sha256 | sha256sum` - Self-verification command
- **Lines 4+**: `<hash>  <path>` - File checksums in sha256sum format

**Self-verification property**: Modifying any hash entry invalidates the manifest hash. The manifest is tamper-evident.

**Coverage**: ALL files in the archive are checksummed:
- Audio files (opus, mp3, flac, m4a, aac)
- Video files (mp4, mkv, webm, avi)
- Images (jpg, png, webp, svg)
- Text files (md, txt, srt, vtt)
- Playlists (m3u, m3u8, pls)
- Scripts and metadata (json, yaml, sh)

**Exclusions**: Only `CHECKSUMS.sha256` itself is excluded to prevent circular dependency.

## Verification Procedures

### Quick Verification (Manifest Integrity)

Verify manifest has not been tampered with (sub-second):

```bash
cd /path/to/archive

# Extract manifest hash from header
EXPECTED=$(grep '^# MANIFEST_HASH:' CHECKSUMS.sha256 | awk '{print $3}')

# Compute hash of manifest content (lines 4+)
ACTUAL=$(tail -n +4 CHECKSUMS.sha256 | sha256sum | awk '{print $1}')

# Compare
if [ "$EXPECTED" = "$ACTUAL" ]; then
  echo "✓ Manifest integrity verified"
else
  echo "✗ Manifest has been tampered with"
  exit 1
fi
```

**Use case**: Daily automated checks to detect manifest corruption without verifying all files.

### Full Verification (All Files)

Verify all files match their checksums (minutes to hours depending on archive size):

```bash
cd /path/to/archive

# First verify manifest integrity
EXPECTED=$(grep '^# MANIFEST_HASH:' CHECKSUMS.sha256 | awk '{print $3}')
ACTUAL=$(tail -n +4 CHECKSUMS.sha256 | sha256sum | awk '{print $1}')

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "✗ Manifest integrity check failed - stopping"
  exit 1
fi

echo "✓ Manifest integrity verified"

# Then verify all files
tail -n +4 CHECKSUMS.sha256 | sha256sum -c
```

**Use case**: Weekly/monthly deep verification to detect bit rot.

### Quiet Mode (Failures Only)

Show only files that failed verification:

```bash
cd /path/to/archive
tail -n +4 CHECKSUMS.sha256 | sha256sum -c --quiet
```

**Exit codes**:
- `0` - All files verified successfully
- `1` - One or more files failed verification

**Use case**: Cron jobs and automated monitoring.

## Timestamp Standard

All timestamps use ISO 8601 UTC with nanosecond precision:

**Format**: `YYYY-MM-DDTHH:MM:SS.NNNNNNNNNZ`

**Example**: `2026-02-14T18:45:22.387654321Z`

**Generation command**:
```bash
date -u +%Y-%m-%dT%H:%M:%S.%NZ
```

**Requirements**:
- Always UTC (trailing `Z`), never local timezone
- Nanosecond precision (9 decimal places)
- ISO 8601 compliant
- Monotonic (later timestamps are lexicographically greater)

## Workflow

### Initial Setup (--generate)

```bash
aiwg verify-archive /path/to/archive --generate
```

**Steps**:
1. Find all files recursively (excluding `CHECKSUMS.sha256`)
2. Compute SHA-256 hash for each file
3. Sort results by path (deterministic order)
4. Generate timestamp in ISO 8601 UTC format
5. Write checksums to temporary file
6. Compute SHA-256 of checksum content
7. Add self-verifying header with manifest hash
8. Write final `CHECKSUMS.sha256`
9. Generate `VERIFY.md` with human-readable instructions

**Bash implementation**:
```bash
ARCHIVE_PATH="/path/to/archive"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)

cd "$ARCHIVE_PATH"

# Generate checksums (exclude manifest itself)
find . -type f ! -name "CHECKSUMS.sha256" -print0 | \
  sort -z | \
  xargs -0 sha256sum > /tmp/checksums.tmp

# Compute manifest hash
MANIFEST_HASH=$(sha256sum /tmp/checksums.tmp | awk '{print $1}')

# Write final manifest with self-verifying header
{
  echo "# MANIFEST_HASH: $MANIFEST_HASH"
  echo "# Generated: $TIMESTAMP"
  echo "# Verify with: tail -n +4 CHECKSUMS.sha256 | sha256sum"
  cat /tmp/checksums.tmp
} > CHECKSUMS.sha256

rm /tmp/checksums.tmp

echo "✓ Generated CHECKSUMS.sha256 with $MANIFEST_HASH"
```

### Routine Verification (--verify)

```bash
aiwg verify-archive /path/to/archive --verify
```

**Steps**:
1. Read `MANIFEST_HASH` from header
2. Compute hash of manifest content (lines 4+)
3. Compare hashes (quick integrity check)
4. If manifest is intact, verify all files against checksums
5. Report any mismatches or missing files

### Regeneration After Changes (--fix)

```bash
aiwg verify-archive /path/to/archive --fix
```

**Use case**: After adding/removing/modifying files in the archive.

**Steps**:
1. Backup existing `CHECKSUMS.sha256` to `CHECKSUMS.sha256.bak`
2. Regenerate manifest (same as `--generate`)
3. Report changes: added files, removed files, modified files
4. Keep backup for comparison

**Example output**:
```
Backed up existing manifest to CHECKSUMS.sha256.bak
Regenerating checksums...
Changes detected:
  Added: ./audio/episode-003.opus
  Modified: ./README.md (hash changed)
  Removed: ./audio/episode-001-draft.opus
✓ Generated new CHECKSUMS.sha256
```

## VERIFY.md Template

Human-readable verification instructions placed in archive root:

```markdown
# Archive Integrity Verification

This archive contains a self-verifying checksum manifest for detecting corruption, tampering, or transfer errors.

## Quick Verification (Manifest Integrity)

Verify the manifest has not been tampered with (sub-second):

\`\`\`bash
cd "$(dirname "$0")"
EXPECTED=$(grep '^# MANIFEST_HASH:' CHECKSUMS.sha256 | awk '{print $3}')
ACTUAL=$(tail -n +4 CHECKSUMS.sha256 | sha256sum | awk '{print $1}')
[ "$EXPECTED" = "$ACTUAL" ] && echo "✓ Manifest integrity verified" || echo "✗ Manifest tampered"
\`\`\`

## Full Verification (All Files)

Verify all files match their checksums:

\`\`\`bash
cd "$(dirname "$0")"
tail -n +4 CHECKSUMS.sha256 | sha256sum -c
\`\`\`

## Archive Information

- **Generated**: {TIMESTAMP}
- **File count**: {FILE_COUNT}
- **Total size**: {TOTAL_SIZE}
- **Manifest hash**: {MANIFEST_HASH}

## Recommended Verification Schedule

- **Daily**: Quick manifest integrity check
- **Weekly**: Full file verification
- **After transfer**: Full verification immediately after copying/downloading
- **Before backup**: Verify source integrity before creating backup

## If Verification Fails

1. **Manifest integrity failure**: Manifest has been tampered with or corrupted. Regenerate from source.
2. **File verification failure**: File has been corrupted or modified. Restore from backup or regenerate.

## Regeneration

After making changes to the archive, regenerate the manifest:

\`\`\`bash
aiwg verify-archive . --fix
\`\`\`

---

*Self-verifying checksums using SHA-256 (NIST FIPS 180-4)*
```

**Template variables**:
- `{TIMESTAMP}` - ISO 8601 generation timestamp
- `{FILE_COUNT}` - Number of files in manifest
- `{TOTAL_SIZE}` - Total archive size in human-readable format
- `{MANIFEST_HASH}` - SHA-256 hash of manifest content

## PROVENANCE.jsonld Integration

W3C PROV-O format with PREMIS fixity metadata:

```json
{
  "@context": {
    "prov": "http://www.w3.org/ns/prov#",
    "premis": "http://www.loc.gov/premis/rdf/v3/",
    "schema": "http://schema.org/",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "@graph": [
    {
      "@id": "urn:uuid:ARCHIVE_UUID",
      "@type": ["prov:Entity", "premis:IntellectualEntity"],
      "prov:generatedAtTime": {
        "@type": "xsd:dateTime",
        "@value": "2026-02-14T18:45:22.387654321Z"
      },
      "premis:hasFixity": {
        "@type": "premis:Fixity",
        "premis:hasMessageDigest": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "premis:hasMessageDigestAlgorithm": "SHA-256",
        "premis:hasMessageDigestOriginator": "aiwg verify-archive v2026.2.6",
        "premis:fixityCheckDateTime": {
          "@type": "xsd:dateTime",
          "@value": "2026-02-14T18:45:22.387654321Z"
        }
      },
      "schema:contentUrl": "./CHECKSUMS.sha256"
    },
    {
      "@id": "urn:uuid:ACTIVITY_UUID",
      "@type": "prov:Activity",
      "prov:startedAtTime": {
        "@type": "xsd:dateTime",
        "@value": "2026-02-14T18:45:20.123456789Z"
      },
      "prov:endedAtTime": {
        "@type": "xsd:dateTime",
        "@value": "2026-02-14T18:45:22.387654321Z"
      },
      "prov:wasAssociatedWith": {
        "@id": "urn:aiwg:agent:media-curator"
      }
    },
    {
      "@id": "urn:aiwg:agent:media-curator",
      "@type": "prov:SoftwareAgent",
      "schema:name": "AIWG Media Curator",
      "schema:softwareVersion": "2026.2.6"
    }
  ]
}
```

**Key relationships**:
- `premis:hasFixity` - Links entity to fixity information
- `premis:hasMessageDigest` - SHA-256 hash with `sha256:` prefix
- `premis:fixityCheckDateTime` - When verification was performed
- `prov:wasAssociatedWith` - Agent that performed verification

**Use case**: Long-term digital preservation requiring audit trails and provenance chains.

## Standards Compliance

| Standard | Purpose | Reference |
|----------|---------|-----------|
| SHA-256 | Cryptographic hash function | NIST FIPS 180-4 |
| ISO 8601 | Timestamp format | ISO 8601:2019 |
| PREMIS 3.0 | Preservation metadata | Library of Congress |
| W3C PROV-O | Provenance ontology | W3C Recommendation 2013 |
| JSON-LD 1.1 | Linked data format | W3C Recommendation 2020 |

## Error Handling

**Missing archive**: Exit with error if archive path does not exist.

**No CHECKSUMS.sha256**: For `--verify`, exit with error. For `--generate`, create new manifest.

**Hash mismatch**: Report which files failed, exit code 1.

**Permission errors**: Report files that cannot be read, continue verification for accessible files.

**Corrupt manifest**: If manifest cannot be parsed, exit with error and suggest regeneration.

## Deliverables

When running `--generate` or `--fix`:

1. **CHECKSUMS.sha256** - Self-verifying checksum manifest
2. **VERIFY.md** - Human-readable verification instructions

When running `--provenance`:

3. **PROVENANCE.jsonld** - W3C PROV-O provenance record with PREMIS fixity

## Examples

**Initial setup**:
```bash
aiwg verify-archive ~/media/podcast-archive --generate
```

**Routine verification**:
```bash
aiwg verify-archive ~/media/podcast-archive --verify
```

**After adding new episodes**:
```bash
aiwg verify-archive ~/media/podcast-archive --fix
```

**Generate with provenance**:
```bash
aiwg verify-archive ~/media/podcast-archive --generate --provenance
```

**Automated monitoring** (cron):
```bash
0 2 * * * aiwg verify-archive /media/archives/podcast --verify --quiet || echo "Archive verification failed" | mail -s "Alert" admin@example.com
```
