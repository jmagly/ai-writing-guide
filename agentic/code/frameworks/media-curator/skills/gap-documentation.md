# GAP-NOTE Documentation Skill

A systematic approach to documenting missing content in media archives using standardized gap markers that guide acquisition, measure completeness, and enable parallel collection workflows.

## Overview

GAP-NOTE.md files serve as placeholders in directories where content is expected but not yet acquired. They transform empty directories from ambiguous voids into actionable instructions, creating a clear separation between "not yet collected" and "intentionally excluded."

This pattern emerged from field testing during music archive curation (issue #81), where agents needed explicit guidance on acquisition priorities and strategies without requiring central coordination.

## The GAP-NOTE.md Template

### Standard Structure

```markdown
# GAP-NOTE: {Directory Purpose}

## Expected Content
{What should be here}

## Acquisition Strategy
{How to obtain it}

## Priority
{HIGH | MEDIUM | LOW}

## Sources
- {Source 1}
- {Source 2}
```

### Field Descriptions

**Title Line (`# GAP-NOTE: ...`)**
- Brief description of directory purpose
- Helps agents understand context at a glance
- Example: `# GAP-NOTE: BBC Radio Sessions (1990-1995)`

**Expected Content**
- Specific description of missing content
- Include formats, quality expectations, metadata requirements
- Be concrete enough to validate completion
- Example: "Lossless audio (FLAC/ALAC) of all BBC Radio 1 sessions, with broadcast date, presenter name, and tracklisting"

**Acquisition Strategy**
- Step-by-step instructions for obtaining content
- Include API endpoints, web scrapers, manual download URLs
- Specify required credentials, rate limits, legal considerations
- Example: "Use BBC Sounds API → filter by artist → download via yt-dlp → transcode to FLAC"

**Priority**
- Standardized levels: HIGH, MEDIUM, LOW
- Determines resource allocation for parallel workflows
- See Priority Scoring section below

**Sources**
- URLs, API endpoints, contact information
- Structured as bulleted list for easy parsing
- Include backup sources where available
- Example: `- https://www.bbc.co.uk/sounds/brand/b006wkqb`

## Lifecycle Management

### 1. Creation

Created when establishing directory structure but before content acquisition:

```bash
# Create directory and gap marker
mkdir -p "Artist Name/Radio Sessions/BBC Radio 1"
cat > "Artist Name/Radio Sessions/BBC Radio 1/GAP-NOTE.md" <<'INNER_EOF'
# GAP-NOTE: BBC Radio 1 Sessions

## Expected Content
Lossless audio recordings of all BBC Radio 1 sessions (1990-1995)
with metadata: broadcast date, presenter, tracklist, duration

## Acquisition Strategy
1. Query BBC Sounds API for artist sessions
2. Download via yt-dlp with metadata extraction
3. Transcode to FLAC if necessary
4. Extract and verify tracklist from audio

## Priority
HIGH

## Sources
- https://www.bbc.co.uk/sounds/brand/b006wkqb
- https://archive.org/details/bbcradio1sessions
INNER_EOF
```

### 2. Active Use

Agents read GAP-NOTE.md as instructions during acquisition:

```bash
# Find high-priority gaps
find . -name "GAP-NOTE.md" -exec grep -l "^## Priority$" {} \; | \
  xargs grep -A1 "^## Priority$" | grep "HIGH" | cut -d: -f1

# Read acquisition strategy
grep -A20 "^## Acquisition Strategy$" "path/to/GAP-NOTE.md"
```

### 3. Completion and Removal

Once content acquired, GAP-NOTE.md is removed or replaced:

```bash
# Option 1: Remove when content present
rm "Artist Name/Radio Sessions/BBC Radio 1/GAP-NOTE.md"

# Option 2: Replace with catalog
mv "Artist Name/Radio Sessions/BBC Radio 1/GAP-NOTE.md" \
   "Artist Name/Radio Sessions/BBC Radio 1/CATALOG.md"
```

## Priority Scoring

### HIGH Priority

**Criteria:**
- Core content essential to collection purpose
- Readily available from reliable sources
- Legal and ethical to acquire
- Low technical complexity

**Examples:**
- Radio sessions from major broadcasters (BBC, NPR)
- Album artwork from official label websites
- Press photos from artist official sites
- Lyrics from licensed databases

**Expected timeframe:** Hours to days

### MEDIUM Priority

**Criteria:**
- Supplementary content enhancing collection
- Requires moderate effort or coordination
- May involve multiple sources or processing steps
- Quality/completeness trade-offs acceptable

**Examples:**
- Concert bootlegs from trading communities
- Artist photos from Wikimedia Commons requiring attribution
- Interviews transcribed from audio/video
- Fan-created setlists cross-referenced with recordings

**Expected timeframe:** Days to weeks

### LOW Priority

**Criteria:**
- Nice-to-have content, non-essential
- Difficult to source or verify
- May require manual intervention
- Uncertain availability or legal status

**Examples:**
- Pre-label era demo recordings
- Rare promotional materials
- Personal photos from fan archives
- Unverified session information

**Expected timeframe:** Weeks to months (or indefinite)

## Completeness Measurement

### Gap Inventory

Count remaining gaps to measure collection progress:

```bash
# Total gap count
find . -name "GAP-NOTE.md" | wc -l

# Gaps by priority
echo "=== Collection Gaps by Priority ==="
echo -n "HIGH:   "
grep -r "^## Priority" --include="GAP-NOTE.md" . | grep -A1 "^## Priority$" | grep -c "HIGH"
echo -n "MEDIUM: "
grep -r "^## Priority" --include="GAP-NOTE.md" . | grep -A1 "^## Priority$" | grep -c "MEDIUM"
echo -n "LOW:    "
grep -r "^## Priority" --include="GAP-NOTE.md" . | grep -A1 "^## Priority$" | grep -c "LOW"
```

### Completeness Percentage

Calculate completion based on gap ratio:

```bash
#!/bin/bash
# Calculate archive completeness

TOTAL_DIRS=$(find . -type d | wc -l)
GAP_DIRS=$(find . -name "GAP-NOTE.md" | wc -l)
COMPLETE_DIRS=$((TOTAL_DIRS - GAP_DIRS))
PERCENT=$((COMPLETE_DIRS * 100 / TOTAL_DIRS))

echo "Archive Completeness: $PERCENT%"
echo "  Complete: $COMPLETE_DIRS/$TOTAL_DIRS directories"
echo "  Gaps remaining: $GAP_DIRS"
```

### Gap Report

Generate structured report for review:

```bash
#!/bin/bash
# Generate gap report with locations and priorities

echo "# Archive Gap Report"
echo "Generated: $(date -I)"
echo ""

for priority in HIGH MEDIUM LOW; do
  echo "## $priority Priority"
  find . -name "GAP-NOTE.md" -print0 | while IFS= read -r -d '' file; do
    if grep -A1 "^## Priority$" "$file" | grep -q "$priority"; then
      dir=$(dirname "$file")
      title=$(grep "^# GAP-NOTE:" "$file" | sed 's/# GAP-NOTE: //')
      echo "- **$dir**"
      echo "  $title"
    fi
  done
  echo ""
done
```

## Parallel Gap Fill Pattern

Multiple agents can work on gaps simultaneously by claiming GAP-NOTE files:

### 1. Claim a Gap

```bash
# Add agent claim to gap note
echo "" >> "path/to/GAP-NOTE.md"
echo "## Claimed By" >> "path/to/GAP-NOTE.md"
echo "Agent: $AGENT_ID" >> "path/to/GAP-NOTE.md"
echo "Timestamp: $(date -Iseconds)" >> "path/to/GAP-NOTE.md"
```

### 2. Execute Acquisition

Follow the acquisition strategy documented in the GAP-NOTE:

```bash
# Read strategy section
STRATEGY=$(sed -n '/^## Acquisition Strategy$/,/^##/p' "path/to/GAP-NOTE.md" | \
           grep -v "^##")

# Execute steps (example)
while IFS= read -r step; do
  echo "Executing: $step"
  # ... implement step execution ...
done <<< "$STRATEGY"
```

### 3. Validate and Close

```bash
# Verify content acquired
if [ -f "expected-content-file.flac" ]; then
  # Move GAP-NOTE to completion log
  mkdir -p .archive-logs/completed-gaps
  mv "path/to/GAP-NOTE.md" ".archive-logs/completed-gaps/$(date -I)-gap-filled.md"
  echo "Gap filled successfully"
else
  # Update GAP-NOTE with failure info
  echo "" >> "path/to/GAP-NOTE.md"
  echo "## Acquisition Attempt" >> "path/to/GAP-NOTE.md"
  echo "Failed: $(date -Iseconds)" >> "path/to/GAP-NOTE.md"
  echo "Reason: Content not available from listed sources" >> "path/to/GAP-NOTE.md"
fi
```

## Real-World Examples

### Example 1: Radio Sessions

```markdown
# GAP-NOTE: BBC Radio 1 Sessions (1990-1995)

## Expected Content
Lossless audio recordings (FLAC/ALAC) of all BBC Radio 1 sessions
between 1990-1995, including:
- Full session audio
- Broadcast date and presenter name
- Complete tracklist with song titles
- Duration and audio quality metadata

## Acquisition Strategy
1. Query BBC Sounds API: `https://api.bbc.co.uk/sounds/search?q={artist}`
2. Filter results for Radio 1 sessions in date range
3. Download via yt-dlp: `yt-dlp --extract-audio --audio-format flac {url}`
4. Extract metadata using `ffprobe` and validate against expected format
5. Organize into subdirectories by broadcast date

## Priority
HIGH

## Sources
- https://www.bbc.co.uk/sounds/brand/b006wkqb
- https://archive.org/details/bbcradio1sessions
- https://musicbrainz.org (for session metadata validation)
```

### Example 2: Album Artwork

```markdown
# GAP-NOTE: Album Artwork Collection

## Expected Content
High-resolution album covers (minimum 1400x1400px, JPEG or PNG)
for all studio albums, EPs, and major singles:
- Front cover (required)
- Back cover (optional)
- CD/vinyl labels (optional)
- Embedded artwork extracted from audio files

## Acquisition Strategy
1. Check MusicBrainz Cover Art Archive API
2. Query Discogs API for releases: `https://api.discogs.com/artists/{id}/releases`
3. Download largest available image from each release
4. Fallback: extract embedded artwork from FLAC files using `metaflac --export-picture-to=cover.jpg`
5. Validate dimensions and format

## Priority
MEDIUM

## Sources
- https://coverartarchive.org/release/{mbid}
- https://api.discogs.com/releases/{id}
- Embedded in existing FLAC files
```

### Example 3: Interview Transcripts

```markdown
# GAP-NOTE: Interview Archive

## Expected Content
Transcripts of all major interviews (print, radio, video) from 1988-2000:
- Full text transcription
- Interview date and publication/broadcast source
- Interviewer name
- Topic tags (e.g., "album recording", "tour", "influences")

## Acquisition Strategy
1. Search online archives: Rock's Backpages, music magazine databases
2. For video/audio interviews: use Whisper API for transcription
3. Manual transcription for short clips (<5 minutes)
4. Cross-reference dates with tour/album timeline for validation
5. Format as markdown with YAML frontmatter

## Priority
LOW

## Sources
- https://www.rocksbackpages.com
- https://archive.org/details/audio (radio interviews)
- YouTube channels (fan uploads, use Whisper for transcription)
```

## Management Commands

### Create Gap Template

```bash
# Function to scaffold new gap note
create_gap_note() {
  local dir="$1"
  local title="$2"
  local priority="${3:-MEDIUM}"

  mkdir -p "$dir"
  cat > "$dir/GAP-NOTE.md" <<INNER_EOF
# GAP-NOTE: $title

## Expected Content
{Describe what content should be here}

## Acquisition Strategy
1. {Step 1}
2. {Step 2}

## Priority
$priority

## Sources
- {Source URL 1}
INNER_EOF

  echo "Created gap note: $dir/GAP-NOTE.md"
}

# Usage
create_gap_note "Artist/Radio Sessions/NPR Tiny Desk" \
                "NPR Tiny Desk Concert" \
                "HIGH"
```

### Bulk Status Check

```bash
# Check all gaps and report status
check_gaps() {
  echo "=== Archive Gap Status ==="
  echo "Generated: $(date)"
  echo ""

  find . -name "GAP-NOTE.md" -print0 | sort -z | while IFS= read -r -d '' file; do
    dir=$(dirname "$file")
    title=$(grep "^# GAP-NOTE:" "$file" | sed 's/# GAP-NOTE: //')
    priority=$(grep -A1 "^## Priority$" "$file" | tail -n1 | tr -d ' ')
    claimed=$(grep -q "^## Claimed By$" "$file" && echo "[CLAIMED]" || echo "")

    printf "%-60s [%s] %s\n" "$dir" "$priority" "$claimed"
  done
}
```

### Clean Completed Gaps

```bash
# Archive completed gap notes
archive_completed_gaps() {
  mkdir -p .archive-logs/completed-gaps

  find . -name "GAP-NOTE.md" -print0 | while IFS= read -r -d '' file; do
    dir=$(dirname "$file")

    # Check if directory has actual content now
    content_count=$(find "$dir" -type f ! -name "GAP-NOTE.md" | wc -l)

    if [ "$content_count" -gt 0 ]; then
      echo "Gap filled: $dir"
      mv "$file" ".archive-logs/completed-gaps/$(date -I)-$(basename "$dir" | tr ' ' '-').md"
    fi
  done
}
```

## Integration with Media Curator Framework

### Gap Detection

The Media Curator framework can automatically detect gaps:

```bash
# Detect expected-but-missing directories
aiwg media-curator detect-gaps --archive /path/to/archive
```

### Gap Filling Workflow

```bash
# Fill high-priority gaps
aiwg media-curator fill-gaps --priority HIGH --parallel 3
```

### Gap Reporting

```bash
# Generate gap report
aiwg media-curator gap-report --format markdown > GAPS.md
```

## Best Practices

1. **Be specific in Expected Content** - Vague descriptions lead to incomplete acquisitions
2. **Test acquisition strategies** - Verify each step works before documenting
3. **Update priority as context changes** - Source availability affects urgency
4. **Use consistent formatting** - Enables automated parsing and reporting
5. **Archive completed gaps** - Maintain history of what was filled and when
6. **Review gaps periodically** - Sources and priorities evolve over time
7. **Claim gaps before starting** - Prevents duplicate effort in parallel workflows

## See Also

- `@agentic/code/frameworks/media-curator/skills/catalog-generation.md` - Replacing GAP-NOTEs with catalogs
- `@agentic/code/frameworks/media-curator/skills/archive-organization.md` - Directory structure conventions
- Issue #81 (gitea) - Original field testing that discovered this pattern
