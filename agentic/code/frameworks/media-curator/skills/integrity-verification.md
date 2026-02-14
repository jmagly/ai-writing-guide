---
name: Integrity Verification
description: SHA-256 checksum manifest generation, self-verification, and PREMIS fixity patterns
category: media-curator
---

# Integrity Verification

Cryptographic checksum verification patterns for detecting bit rot, tampering, and transfer errors in media archives. Implements self-verifying manifests with PREMIS fixity metadata.

## Manifest Generation Script

Complete bash implementation for generating self-verifying checksum manifests:

```bash
#!/bin/bash
set -euo pipefail

# Archive Checksum Manifest Generator
# Generates self-verifying SHA-256 checksum manifest
# Usage: ./generate-checksums.sh /path/to/archive

ARCHIVE_PATH="${1:-.}"
CHECKSUM_FILE="CHECKSUMS.sha256"
TEMP_FILE="/tmp/checksums-$$.tmp"

# Validate archive exists
if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "Error: Archive directory not found: $ARCHIVE_PATH" >&2
  exit 1
fi

cd "$ARCHIVE_PATH"

echo "Generating checksums for: $ARCHIVE_PATH"

# Find all files, exclude checksum manifest itself
# Use null-terminated strings for handling filenames with spaces
find . -type f ! -name "$CHECKSUM_FILE" -print0 | \
  sort -z | \
  xargs -0 sha256sum > "$TEMP_FILE"

# Count files
FILE_COUNT=$(wc -l < "$TEMP_FILE")
echo "Found $FILE_COUNT files"

# Compute manifest hash (hash of the checksum content)
MANIFEST_HASH=$(sha256sum "$TEMP_FILE" | awk '{print $1}')

# Generate timestamp (ISO 8601 UTC with nanosecond precision)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)

# Write final manifest with self-verifying header
{
  echo "# MANIFEST_HASH: $MANIFEST_HASH"
  echo "# Generated: $TIMESTAMP"
  echo "# Verify with: tail -n +4 $CHECKSUM_FILE | sha256sum"
  cat "$TEMP_FILE"
} > "$CHECKSUM_FILE"

# Clean up
rm "$TEMP_FILE"

echo "✓ Generated $CHECKSUM_FILE"
echo "  Manifest hash: $MANIFEST_HASH"
echo "  Timestamp: $TIMESTAMP"
echo "  Files: $FILE_COUNT"
```

**Key features**:
- Handles filenames with spaces via null-terminated strings (`-print0`, `-z`, `-0`)
- Deterministic output (sorted by path)
- Self-verifying header with manifest hash
- ISO 8601 UTC timestamps with nanosecond precision
- Exit on error (`set -euo pipefail`)

## Verification Commands

### Quick Manifest Integrity Check

Verify manifest has not been tampered with (sub-second):

```bash
#!/bin/bash
# Quick verification - manifest integrity only

CHECKSUM_FILE="CHECKSUMS.sha256"

if [ ! -f "$CHECKSUM_FILE" ]; then
  echo "✗ Checksum manifest not found: $CHECKSUM_FILE" >&2
  exit 1
fi

# Extract expected hash from header
EXPECTED=$(grep '^# MANIFEST_HASH:' "$CHECKSUM_FILE" | awk '{print $3}')

if [ -z "$EXPECTED" ]; then
  echo "✗ Manifest header missing or malformed" >&2
  exit 1
fi

# Compute actual hash of manifest content (lines 4+)
ACTUAL=$(tail -n +4 "$CHECKSUM_FILE" | sha256sum | awk '{print $1}')

# Compare
if [ "$EXPECTED" = "$ACTUAL" ]; then
  echo "✓ Manifest integrity verified"
  echo "  Hash: $EXPECTED"
  exit 0
else
  echo "✗ Manifest has been tampered with" >&2
  echo "  Expected: $EXPECTED" >&2
  echo "  Actual:   $ACTUAL" >&2
  exit 1
fi
```

**Use case**: Daily automated checks. Fast execution regardless of archive size.

**Exit codes**:
- `0` - Manifest integrity verified
- `1` - Manifest corrupted or tampered

### Full File Verification

Verify all files match their checksums:

```bash
#!/bin/bash
# Full verification - manifest integrity + all files

CHECKSUM_FILE="CHECKSUMS.sha256"

# Step 1: Verify manifest integrity
echo "Step 1: Verifying manifest integrity..."
EXPECTED=$(grep '^# MANIFEST_HASH:' "$CHECKSUM_FILE" | awk '{print $3}')
ACTUAL=$(tail -n +4 "$CHECKSUM_FILE" | sha256sum | awk '{print $1}')

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "✗ Manifest integrity check failed - stopping" >&2
  exit 1
fi

echo "✓ Manifest integrity verified"

# Step 2: Verify all files
echo "Step 2: Verifying all files..."
if tail -n +4 "$CHECKSUM_FILE" | sha256sum -c; then
  echo "✓ All files verified successfully"
  exit 0
else
  echo "✗ One or more files failed verification" >&2
  exit 1
fi
```

**Output format** (from `sha256sum -c`):
```
./audio/episode-001.opus: OK
./audio/episode-002.opus: OK
./video/recording.mp4: FAILED
sha256sum: WARNING: 1 computed checksum did NOT match
```

**Exit codes**:
- `0` - All files verified successfully
- `1` - Verification failed (manifest or files)

### Quiet Mode

Show only failures:

```bash
#!/bin/bash
# Quiet verification - only show failures

CHECKSUM_FILE="CHECKSUMS.sha256"

# Quick manifest check (silent)
EXPECTED=$(grep '^# MANIFEST_HASH:' "$CHECKSUM_FILE" | awk '{print $3}')
ACTUAL=$(tail -n +4 "$CHECKSUM_FILE" | sha256sum | awk '{print $1}')

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "MANIFEST: FAILED" >&2
  exit 1
fi

# Verify files (quiet mode - only show failures)
tail -n +4 "$CHECKSUM_FILE" | sha256sum -c --quiet

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  # Silent success
  exit 0
else
  # sha256sum already printed failures to stderr
  exit 1
fi
```

**Use case**: Cron jobs, automated monitoring, CI/CD pipelines.

**Output**: Nothing on success, only failed files on failure.

## Regeneration After Changes

Script for regenerating manifest after archive modifications:

```bash
#!/bin/bash
set -euo pipefail

# Regenerate checksum manifest after archive changes
# Usage: ./fix-checksums.sh /path/to/archive

ARCHIVE_PATH="${1:-.}"
CHECKSUM_FILE="CHECKSUMS.sha256"
BACKUP_FILE="CHECKSUMS.sha256.bak"
TEMP_FILE="/tmp/checksums-$$.tmp"

cd "$ARCHIVE_PATH"

# Backup existing manifest
if [ -f "$CHECKSUM_FILE" ]; then
  cp "$CHECKSUM_FILE" "$BACKUP_FILE"
  echo "Backed up existing manifest to $BACKUP_FILE"
fi

# Generate new manifest
echo "Regenerating checksums..."
find . -type f ! -name "$CHECKSUM_FILE" ! -name "$BACKUP_FILE" -print0 | \
  sort -z | \
  xargs -0 sha256sum > "$TEMP_FILE"

FILE_COUNT=$(wc -l < "$TEMP_FILE")
MANIFEST_HASH=$(sha256sum "$TEMP_FILE" | awk '{print $1}')
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)

{
  echo "# MANIFEST_HASH: $MANIFEST_HASH"
  echo "# Generated: $TIMESTAMP"
  echo "# Verify with: tail -n +4 $CHECKSUM_FILE | sha256sum"
  cat "$TEMP_FILE"
} > "$CHECKSUM_FILE"

rm "$TEMP_FILE"

# Detect changes
if [ -f "$BACKUP_FILE" ]; then
  echo ""
  echo "Changes detected:"

  # Extract file paths from old and new manifests
  tail -n +4 "$BACKUP_FILE" | awk '{print $2}' | sort > /tmp/old-files-$$.txt
  tail -n +4 "$CHECKSUM_FILE" | awk '{print $2}' | sort > /tmp/new-files-$$.txt

  # Added files
  ADDED=$(comm -13 /tmp/old-files-$$.txt /tmp/new-files-$$.txt)
  if [ -n "$ADDED" ]; then
    echo "  Added:"
    echo "$ADDED" | sed 's/^/    /'
  fi

  # Removed files
  REMOVED=$(comm -23 /tmp/old-files-$$.txt /tmp/new-files-$$.txt)
  if [ -n "$REMOVED" ]; then
    echo "  Removed:"
    echo "$REMOVED" | sed 's/^/    /'
  fi

  # Modified files (different hash for same path)
  # This requires comparing hashes, not just paths
  COMMON_FILES=$(comm -12 /tmp/old-files-$$.txt /tmp/new-files-$$.txt)
  if [ -n "$COMMON_FILES" ]; then
    while IFS= read -r file; do
      OLD_HASH=$(grep -F "$file" "$BACKUP_FILE" | awk '{print $1}')
      NEW_HASH=$(grep -F "$file" "$CHECKSUM_FILE" | awk '{print $1}')
      if [ "$OLD_HASH" != "$NEW_HASH" ]; then
        echo "  Modified: $file"
      fi
    done <<< "$COMMON_FILES"
  fi

  rm /tmp/old-files-$$.txt /tmp/new-files-$$.txt
fi

echo ""
echo "✓ Generated new $CHECKSUM_FILE"
echo "  Manifest hash: $MANIFEST_HASH"
echo "  Files: $FILE_COUNT"
```

**Features**:
- Backs up existing manifest to `.bak` file
- Regenerates checksums for all current files
- Reports added, removed, and modified files
- Preserves backup for comparison

## VERIFY.md Template

Human-readable instructions placed in archive root:

```markdown
# Archive Integrity Verification

This archive contains a self-verifying checksum manifest (`CHECKSUMS.sha256`) for detecting corruption, tampering, or transfer errors.

## Archive Information

- **Generated**: {TIMESTAMP}
- **Total files**: {FILE_COUNT}
- **Total size**: {TOTAL_SIZE}
- **Manifest hash**: {MANIFEST_HASH}

## Quick Verification (30 seconds)

Verify the manifest has not been tampered with:

\`\`\`bash
EXPECTED=$(grep '^# MANIFEST_HASH:' CHECKSUMS.sha256 | awk '{print $3}')
ACTUAL=$(tail -n +4 CHECKSUMS.sha256 | sha256sum | awk '{print $1}')
[ "$EXPECTED" = "$ACTUAL" ] && echo "✓ Verified" || echo "✗ Tampered"
\`\`\`

## Full Verification (10-60 minutes)

Verify all files match their checksums:

\`\`\`bash
tail -n +4 CHECKSUMS.sha256 | sha256sum -c
\`\`\`

## Recommended Schedule

| Frequency | Verification Type | Purpose |
|-----------|-------------------|---------|
| Daily | Quick (manifest only) | Detect tampering |
| Weekly | Full (all files) | Detect bit rot |
| After transfer | Full | Verify transfer integrity |
| Before backup | Full | Ensure source integrity |

## Automated Monitoring

Add to crontab for daily verification:

\`\`\`cron
# Daily quick check at 2am
0 2 * * * cd /path/to/archive && tail -n +4 CHECKSUMS.sha256 | sha256sum -c --quiet || echo "Verification failed" | mail -s "Archive Alert" admin@example.com
\`\`\`

## If Verification Fails

### Manifest Integrity Failure

The manifest itself has been corrupted or tampered with.

**Recovery**:
1. Restore `CHECKSUMS.sha256` from backup
2. If no backup, regenerate manifest (see below)

### File Verification Failure

One or more files have been corrupted or modified.

**Identify failures**:
\`\`\`bash
tail -n +4 CHECKSUMS.sha256 | sha256sum -c 2>&1 | grep FAILED
\`\`\`

**Recovery**:
1. Restore failed files from backup
2. If intentional modification, regenerate manifest

## Regenerate Manifest

After making changes to the archive (add/remove/modify files):

\`\`\`bash
# Backup existing manifest
cp CHECKSUMS.sha256 CHECKSUMS.sha256.bak

# Regenerate
find . -type f ! -name "CHECKSUMS.sha256" -print0 | \\
  sort -z | \\
  xargs -0 sha256sum > /tmp/checksums.tmp

MANIFEST_HASH=$(sha256sum /tmp/checksums.tmp | awk '{print $1}')
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)

{
  echo "# MANIFEST_HASH: $MANIFEST_HASH"
  echo "# Generated: $TIMESTAMP"
  echo "# Verify with: tail -n +4 CHECKSUMS.sha256 | sha256sum"
  cat /tmp/checksums.tmp
} > CHECKSUMS.sha256

rm /tmp/checksums.tmp
\`\`\`

## Technical Details

- **Hash algorithm**: SHA-256 (NIST FIPS 180-4)
- **Timestamp format**: ISO 8601 UTC with nanosecond precision
- **Self-verification**: Manifest hash prevents undetected tampering
- **Coverage**: All files except `CHECKSUMS.sha256` itself

## Support

For questions or issues:
- Documentation: https://aiwg.io/media-curator
- Issues: https://github.com/jmagly/aiwg/issues
- Command reference: `aiwg verify-archive --help`

---

*Generated by AIWG Media Curator v{VERSION}*
```

**Template variables**:
- `{TIMESTAMP}` - ISO 8601 generation timestamp
- `{FILE_COUNT}` - Number of files in manifest
- `{TOTAL_SIZE}` - Archive size (e.g., "4.2 GB")
- `{MANIFEST_HASH}` - SHA-256 hash of manifest
- `{VERSION}` - AIWG version

## Scheduled Verification

### Cron Pattern for Daily Checks

```cron
# Quick verification daily at 2am
0 2 * * * cd /media/archives/podcast && /usr/local/bin/aiwg verify-archive . --verify --quiet || echo "Archive verification failed: $(pwd)" | mail -s "Archive Alert" admin@example.com

# Full verification weekly on Sunday at 3am
0 3 * * 0 cd /media/archives/podcast && /usr/local/bin/aiwg verify-archive . --verify 2>&1 | mail -s "Weekly Archive Verification" admin@example.com
```

### Systemd Timer

**Service file** (`/etc/systemd/system/archive-verify.service`):

```ini
[Unit]
Description=Verify media archive checksums
After=network.target

[Service]
Type=oneshot
User=media
WorkingDirectory=/media/archives/podcast
ExecStart=/usr/local/bin/aiwg verify-archive . --verify --quiet
StandardOutput=journal
StandardError=journal
```

**Timer file** (`/etc/systemd/system/archive-verify.timer`):

```ini
[Unit]
Description=Daily archive verification

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable timer**:
```bash
sudo systemctl enable archive-verify.timer
sudo systemctl start archive-verify.timer
```

### Monitoring Integration

**Prometheus exporter pattern**:

```bash
#!/bin/bash
# Export verification status as Prometheus metrics

CHECKSUM_FILE="CHECKSUMS.sha256"
METRICS_FILE="/var/lib/prometheus/node_exporter/archive_integrity.prom"

# Quick verification
EXPECTED=$(grep '^# MANIFEST_HASH:' "$CHECKSUM_FILE" | awk '{print $3}')
ACTUAL=$(tail -n +4 "$CHECKSUM_FILE" | sha256sum | awk '{print $1}')

if [ "$EXPECTED" = "$ACTUAL" ]; then
  MANIFEST_OK=1
else
  MANIFEST_OK=0
fi

# Write metrics
cat > "$METRICS_FILE" <<EOF
# HELP archive_manifest_integrity Archive manifest integrity status (1=ok, 0=failed)
# TYPE archive_manifest_integrity gauge
archive_manifest_integrity{path="$PWD"} $MANIFEST_OK

# HELP archive_manifest_check_timestamp Unix timestamp of last verification
# TYPE archive_manifest_check_timestamp gauge
archive_manifest_check_timestamp{path="$PWD"} $(date +%s)
EOF
```

**Grafana alert rule**:
```yaml
groups:
  - name: archive_integrity
    interval: 5m
    rules:
      - alert: ArchiveManifestCorrupted
        expr: archive_manifest_integrity == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Archive manifest integrity check failed"
          description: "Archive at {{ $labels.path }} has corrupted or tampered manifest"
```

## Standards Reference

| Standard | Specification | Purpose |
|----------|---------------|---------|
| **SHA-256** | NIST FIPS 180-4 | Cryptographic hash function for file integrity |
| **PREMIS 3.0** | Library of Congress | Preservation metadata for digital objects |
| **W3C PROV-O** | W3C Recommendation 2013 | Provenance ontology for tracking derivation |
| **ISO 8601** | ISO 8601:2019 | Date and time format (UTC timestamps) |
| **JSON-LD 1.1** | W3C Recommendation 2020 | Linked data format for provenance records |

### SHA-256 (NIST FIPS 180-4)

**Properties**:
- 256-bit hash output (64 hexadecimal characters)
- Collision resistance: 2^128 operations
- Pre-image resistance: 2^256 operations
- Deterministic: same input always produces same output

**Command**: `sha256sum <file>`

**Format**: `<64-char-hex>  <path>`

### PREMIS 3.0 Fixity

**Purpose**: Record fixity information for digital preservation.

**Key elements**:
- `messageDigest` - Hash value with algorithm prefix (e.g., `sha256:abc123...`)
- `messageDigestAlgorithm` - Algorithm name (`SHA-256`)
- `messageDigestOriginator` - Software that computed hash
- `fixityCheckDateTime` - When fixity was verified

**Use case**: Long-term digital preservation requiring audit trails.

### W3C PROV-O

**Entity-Activity-Agent model**:
- **Entity**: Archive or checksum manifest
- **Activity**: Checksum generation or verification
- **Agent**: Software (AIWG Media Curator) that performed activity

**Key relationships**:
- `wasGeneratedBy` - Entity generated by activity
- `used` - Activity used entity
- `wasAssociatedWith` - Activity performed by agent
- `wasAttributedTo` - Entity attributed to agent

### ISO 8601 Timestamps

**Format**: `YYYY-MM-DDTHH:MM:SS.NNNNNNNNNZ`

**Requirements**:
- Always UTC (trailing `Z`)
- Nanosecond precision (9 decimal places)
- Monotonic (lexicographically sortable)

**Bash command**: `date -u +%Y-%m-%dT%H:%M:%S.%NZ`

**Example**: `2026-02-14T18:45:22.387654321Z`

## Performance Characteristics

| Operation | Time Complexity | Example Duration (100 GB archive) |
|-----------|-----------------|-----------------------------------|
| Quick verify (manifest only) | O(1) | < 1 second |
| Full verify (all files) | O(n × file_size) | 10-60 minutes (disk-bound) |
| Generate manifest | O(n × file_size) | 10-60 minutes (disk-bound) |

**Optimization tips**:
- Use SSD storage for faster checksumming
- Enable parallel hashing for multi-core systems (GNU parallel)
- Quick verification detects 99% of tampering instantly
- Schedule full verification during off-peak hours

## Error Scenarios

| Error | Cause | Recovery |
|-------|-------|----------|
| Manifest integrity failure | Manifest file corrupted/tampered | Restore from backup or regenerate |
| File verification failure | File corrupted or modified | Restore file from backup |
| Missing manifest | New archive or manifest deleted | Generate new manifest |
| Permission denied | Cannot read files | Fix permissions, run as appropriate user |
| Disk full | Cannot write manifest | Free disk space |
| Hash mismatch | File changed since manifest generated | Regenerate manifest if intentional |

## Integration Examples

### Git Pre-Commit Hook

Verify archive integrity before committing:

```bash
#!/bin/bash
# .git/hooks/pre-commit

if [ -f CHECKSUMS.sha256 ]; then
  echo "Verifying archive integrity..."
  if ! aiwg verify-archive . --verify --quiet; then
    echo "Error: Archive verification failed" >&2
    echo "Run 'aiwg verify-archive . --fix' to regenerate checksums" >&2
    exit 1
  fi
  echo "✓ Archive integrity verified"
fi
```

### CI/CD Pipeline

GitHub Actions workflow:

```yaml
name: Verify Archive Integrity
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install AIWG
        run: npm install -g aiwg
      - name: Verify archive
        run: aiwg verify-archive media/archives/podcast --verify
```

### Backup Verification

Verify backup integrity after rsync:

```bash
#!/bin/bash
# Backup and verify script

SOURCE="/media/source/podcast"
DEST="/media/backup/podcast"

# Sync files
rsync -av --delete "$SOURCE/" "$DEST/"

# Verify destination
cd "$DEST"
if aiwg verify-archive . --verify --quiet; then
  echo "✓ Backup verified successfully"
else
  echo "✗ Backup verification failed" >&2
  exit 1
fi
```
