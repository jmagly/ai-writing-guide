---
description: Analyze collection completeness against canonical discography and generate prioritized gap report
category: media-curator
argument-hint: "<artist>" [--collection <path>] [--gaps-only] [--priority high|medium|low|all] [--output report.yaml]
allowed-tools: Bash, Read, Write, Glob, Grep, WebSearch, WebFetch
model: sonnet
---

# check-completeness

Analyze collection completeness by comparing actual inventory against canonical discography, identify gaps, score coverage, and generate prioritized acquisition plans.

## Purpose

Answer collection completeness questions:
- "How complete is my [artist] collection?"
- "What am I missing?"
- "What should I acquire next?"
- "What legendary performances am I missing?"
- "Where should I upgrade quality?"

Produces comprehensive gap reports with actionable acquisition strategies prioritized by importance, availability, and cost.

## Parameters

### Required

**`<artist>`** - Artist name (quoted if contains spaces)
- Matched against collection directory structure
- Used to fetch canonical discography from MusicBrainz
- Example: `"Pink Floyd"` or `"The Beatles"`

### Optional

**`--collection <path>`** - Collection root directory
- Default: Current working directory
- Must contain artist subdirectories
- Example: `/mnt/media/Music`

**`--gaps-only`** - Show only missing items, skip completeness scoring
- Faster execution when you just need gap list
- Useful for quick "what's missing?" queries

**`--priority <level>`** - Filter gaps by priority level
- Values: `high`, `medium`, `low`, `all` (default: `all`)
- Example: `--priority high` shows only critical gaps

**`--output <file>`** - Write report to file instead of stdout
- Format determined by extension: `.yaml`, `.json`, `.md`
- Default: stdout (terminal display)
- Example: `--output gaps-report.yaml`

**`--canonical-source <source>`** - Canonical discography source
- Values: `musicbrainz` (default), `discogs`, `allmusic`
- Falls back to secondary sources if primary fails
- Example: `--canonical-source discogs`

**`--include-legendary`** - Include legendary/bootleg content in analysis
- Default: Official releases only
- Adds section for high-priority unofficial recordings
- Requires legendary catalog file or web search

**`--quality-threshold <level>`** - Minimum quality for "complete" status
- Values: `lossless`, `320kbps`, `256kbps`, `any` (default: `any`)
- Example: `--quality-threshold lossless` treats 320kbps as needing upgrade

**`--create-gap-notes`** - Generate GAP-NOTE.md files for missing items
- Creates placeholder files in artist directory structure
- Each contains acquisition strategy and priority
- Enables parallel gap-fill workflow

**`--incremental`** - Incremental update mode
- Loads previous state file if exists
- Only re-fetches canonical if >7 days old
- Faster for routine monitoring

**`--cost-estimate`** - Include cost estimates in report
- Estimates based on typical pricing for format/availability
- Adds budget planning section to output
- Example range: "$15-25 for used CD"

## Workflow

### 1. Load Collection Inventory

```bash
# Use existing scan results if available
SCAN_FILE=".media-curator/scans/${ARTIST_SLUG}/scan-latest.json"

if [[ -f "$SCAN_FILE" ]]; then
  INVENTORY=$(cat "$SCAN_FILE")
else
  # Trigger fresh scan
  /scan-collection "$ARTIST" --format json --output "$SCAN_FILE"
  INVENTORY=$(cat "$SCAN_FILE")
fi
```

Inventory provides:
- All albums/releases present in collection
- Track counts and file formats
- Quality levels (lossless/lossy bitrates)
- File sizes and directory structure

### 2. Fetch Canonical Discography

```bash
# Check for cached canonical data
CANONICAL_FILE=".media-curator/completeness/${ARTIST_SLUG}/canonical.yaml"
CACHE_AGE_DAYS=$((( $(date +%s) - $(stat -c %Y "$CANONICAL_FILE" 2>/dev/null || echo 0) ) / 86400))

if [[ $CACHE_AGE_DAYS -gt 7 ]] || [[ ! -f "$CANONICAL_FILE" ]]; then
  # Fetch fresh canonical discography
  # MusicBrainz API example:
  MBID=$(musicbrainz-lookup "$ARTIST" --type artist --format json | jq -r '.artists[0].id')
  RELEASES=$(musicbrainz-releases "$MBID" --format json)

  # Parse into canonical.yaml structure
  echo "$RELEASES" | parse-canonical > "$CANONICAL_FILE"
fi
```

Canonical discography includes:
- Studio albums with track counts and years
- EPs and singles with A/B sides
- Official live albums
- Compilations (filtered by novelty)
- Official box sets

**MusicBrainz advantages:**
- Comprehensive and accurate
- Includes release dates and track counts
- Distinguishes editions (original, remaster, deluxe)
- Free API with rate limiting

**Discogs alternative:**
- More complete for rare/indie releases
- Includes pressing details and variants
- Better for vinyl collectors
- Requires API key

### 3. Build Extended Content Catalog

If `--include-legendary` flag set:

```bash
# Load legendary performances catalog
LEGENDARY_FILE=".media-curator/completeness/${ARTIST_SLUG}/legendary.yaml"

if [[ ! -f "$LEGENDARY_FILE" ]]; then
  # Web search for "artist legendary performances bootleg"
  # Or load from community-maintained catalog
  # Or use private tracker tags (if integrated)

  fetch-legendary-catalog "$ARTIST" > "$LEGENDARY_FILE"
fi
```

Extended catalog includes:
- Notable covers (tribute albums, sessions)
- Soundtrack contributions
- Collaboration tracks (appears on other artists' albums)
- Legendary live performances (soundboard, historical significance)
- Unreleased demos and outtakes

### 4. Compare Inventory to Canonical

```yaml
# Comparison logic pseudocode
for release in canonical_releases:
  match = find_in_inventory(release.title, release.year)

  if match:
    if match.track_count == release.track_count:
      release.status = "complete"
    else:
      release.status = "partial"
      release.missing_tracks = release.track_count - match.track_count

    release.quality = match.quality
    release.source = match.source
  else:
    release.status = "missing"
```

**Fuzzy matching rules:**
- Tolerate minor title differences ("The Album" vs "Album, The")
- Match by year if title ambiguous
- Prefer exact track count match over year match
- Flag multiple matches as potential duplicates

### 5. Score Completeness

```python
# Weighted scoring formula
weights = {
  'studio_albums': 0.40,
  'eps': 0.15,
  'singles': 0.15,
  'live_albums': 0.10,
  'notable_covers': 0.10,
  'legendary': 0.10
}

component_scores = {}
for category, weight in weights.items():
  total = len(canonical[category])
  complete = sum(1 for item in canonical[category] if item.status == 'complete')
  partial = sum(0.5 for item in canonical[category] if item.status == 'partial')

  component_scores[category] = ((complete + partial) / total * 100) if total > 0 else 100

overall_score = sum(component_scores[cat] * weights[cat] for cat in weights)

# Quality bonus
lossless_pct = (lossless_count / total_count) * 100
if lossless_pct > 80:
  overall_score += 5
```

### 6. Identify and Prioritize Gaps

```yaml
# Gap prioritization logic
for release in canonical_releases:
  if release.status == "missing" or release.status == "partial":
    priority = calculate_priority(release)
    availability = check_availability(release)
    cost = estimate_cost(release, availability)

    gaps.append({
      'item': release.title,
      'type': release.type,
      'year': release.year,
      'priority': priority,
      'availability': availability,
      'estimated_cost': cost,
      'reason': priority_reason(release)
    })

gaps.sort(key=lambda x: (priority_order[x['priority']], x['year']))
```

**Priority calculation:**

```python
def calculate_priority(release):
  score = 0

  # Type importance
  if release.type == 'studio_album':
    score += 40
  elif release.type in ['ep', 'single']:
    score += 15
  elif release.type == 'live_album':
    score += 10

  # Critical acclaim (if available)
  if release.rating and release.rating > 8.0:
    score += 20

  # Classic period (artist-specific)
  if release.year in artist_classic_years:
    score += 15

  # Completes a set
  if is_part_of_trilogy(release) and have_other_parts(release):
    score += 10

  # Historical significance
  if release.legendary or release.historically_significant:
    score += 25

  # Assign tier
  if score >= 60:
    return "HIGH"
  elif score >= 30:
    return "MEDIUM"
  else:
    return "LOW"
```

### 7. Check Availability

```python
def check_availability(release):
  sources = []

  # Streaming services (easy, legal, lossy)
  if available_on_streaming(release):
    sources.append({
      'type': 'streaming',
      'services': ['Apple Music', 'Spotify', 'Tidal'],
      'quality': '256kbps AAC',
      'cost': 'subscription',
      'difficulty': 'easy'
    })

  # Digital purchase (legal, often lossless)
  if available_on_bandcamp(release):
    sources.append({
      'type': 'digital_purchase',
      'platform': 'Bandcamp',
      'quality': 'FLAC / 320kbps MP3',
      'cost': '$7-12',
      'difficulty': 'easy'
    })

  # Physical (CD/vinyl)
  discogs_listings = check_discogs(release)
  if discogs_listings:
    sources.append({
      'type': 'physical',
      'format': 'CD',
      'availability': f"{len(discogs_listings)} listings",
      'price_range': f"${min(discogs_listings)} - ${max(discogs_listings)}",
      'difficulty': 'moderate'
    })

  # Private trackers (torrents, requires ratio)
  if user_has_tracker_access():
    tracker_results = search_trackers(release)
    if tracker_results:
      sources.append({
        'type': 'private_tracker',
        'sites': tracker_results.sites,
        'quality': 'FLAC',
        'cost': 'ratio',
        'difficulty': 'moderate' if tracker_results.seeded else 'hard'
      })

  return sources
```

### 8. Generate Report

Output format depends on `--output` extension or defaults to rich terminal display:

**Terminal output (default):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Pink Floyd Collection Completeness Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overall Score: 92.3% (Excellent Collection)

🎵 Canonical Releases: 94.1%
  ✅ Studio Albums: 16/17 (94.1%)
  ✅ EPs: 4/4 (100%)
  ✅ Singles: 24/30 (80.0%)
  ✅ Live Albums: 12/15 (80.0%)

🎸 Extended Content: 78.5%
  ✅ Notable Covers: 8/12 (66.7%)
  ✅ Soundtracks: 3/5 (60.0%)
  ⚠️  Legendary: 12/47 (25.5%)

💿 Quality Distribution:
  🟢 Lossless (FLAC): 87% (298 files)
  🟡 High (320kbps): 11% (38 files)
  🔴 Medium (256kbps): 2% (6 files)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Top 5 Acquisition Priorities
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 HIGH: The Endless River (2014)
   Missing: Complete studio album
   Reason: Only missing album from official discography
   Sources:
     • Apple Music (stream rip, 256kbps) - FREE with subscription
     • Bandcamp (FLAC) - $9.99
     • Discogs (used CD) - $12-18
   Recommended: Bandcamp FLAC purchase

🔴 HIGH: Live at Pompeii (1972) - Soundboard
   Missing: Legendary performance
   Reason: Exceptional quality, historically significant
   Sources:
     • Private tracker (FLAC soundboard) - Ratio cost
     • YouTube rip (256kbps, unofficial) - FREE but low quality
   Recommended: Private tracker if available

🟡 MEDIUM: Obscured by Clouds B-sides
   Missing: 3 tracks from singles
   Reason: Completes album era, unique content
   Sources:
     • Compilation "Works" (1983) - Discogs $15-20
     • Individual singles (rare) - eBay ~$30 each
   Recommended: Works compilation

🟡 MEDIUM: The Wall (24bit/96kHz remaster)
   Upgrade: Current 320kbps → Lossless remaster
   Reason: Significant audio improvement, bonus tracks
   Sources:
     • HDtracks (24bit FLAC) - $19.99
     • Qobuz (24bit streaming) - Subscription
   Recommended: Wait for HDtracks sale (<$15)

🟢 LOW: Relics (1971 compilation)
   Missing: Compilation of earlier singles
   Reason: Low priority, all tracks owned on original albums
   Sources:
     • Streaming (256kbps) - FREE
     • CD (out of print) - eBay $20-30
   Recommended: Stream rip if desired for convenience

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Acquisition Plan Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next 5 acquisitions:
  1. The Endless River - Bandcamp FLAC ($9.99)
  2. Live at Pompeii - Private tracker (ratio)
  3. Obscured by Clouds B-sides - Works CD ($18)
  4. The Wall remaster - Wait for sale (~$15)
  5. (Optional) Relics - Stream rip (FREE)

💰 Estimated cost: $43-60 (excluding sale wait items)
⏱️  Estimated time: 1-2 weeks
🎯 Next score: ~96.5% (Completionist tier)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report saved to: .media-curator/completeness/pink-floyd/gap-report-2026-02-14.yaml
GAP-NOTE files created: 5 items
```

**YAML output (--output report.yaml):**

Uses the full gap report structure defined in the Completeness Tracker agent documentation.

**Markdown output (--output report.md):**

Human-readable report with sections, tables, and acquisition instructions.

### 9. Create GAP-NOTE Files (if --create-gap-notes)

```bash
for gap in high_priority_gaps:
  NOTE_PATH="${COLLECTION}/${ARTIST}/${gap.year} - ${gap.title}/GAP-NOTE.md"
  mkdir -p "$(dirname "$NOTE_PATH")"

  cat > "$NOTE_PATH" << EOF
# GAP-NOTE: ${gap.title} (${gap.year})

## Expected Content
- ${gap.type}: ${gap.track_count} tracks
- ${gap.description}
- Rating: ${gap.rating}/10

## Acquisition Strategy
${format_acquisition_steps(gap.sources)}

## Priority
**${gap.priority}** - ${gap.reason}

## Sources
${format_source_links(gap)}
- Last searched: Never
EOF
done
```

## Examples

### Example 1: Basic completeness check

```bash
/check-completeness "Pink Floyd" --collection /mnt/media/Music
```

Output: Full terminal report with scores and top 5 priorities

### Example 2: Just show high-priority gaps

```bash
/check-completeness "The Beatles" --gaps-only --priority high
```

Output:
```
High-Priority Gaps for The Beatles:

1. Let It Be Sessions (1970) - Legendary unreleased sessions
2. Live at Hollywood Bowl (original 1977) - Out of print, reissue available
3. Anthology outtakes (various) - 12 tracks not on official release
```

### Example 3: Create acquisition workflow

```bash
/check-completeness "Led Zeppelin" \
  --include-legendary \
  --create-gap-notes \
  --output gaps-report.yaml
```

Creates:
- `gaps-report.yaml` - Full structured report
- GAP-NOTE.md files in each missing album directory
- Updated completeness state file

### Example 4: Incremental monitoring

```bash
# Weekly cron job
/check-completeness "Grateful Dead" \
  --incremental \
  --quality-threshold lossless \
  --output /reports/weekly-$(date +%F).yaml
```

Fast execution, only re-fetches canonical if stale.

## Integration with Other Commands

**Before completeness check:**
```bash
/scan-collection "Artist" --format json  # Generates inventory
```

**After completeness check:**
```bash
/acquisition-plan "Artist" --from-gaps gaps-report.yaml  # Plan downloads
/quality-audit "Artist" --upgrades-only  # Find quality improvement targets
```

**Parallel gap filling:**
```bash
/completeness-fill "Artist" --priority high --source streaming &
/completeness-fill "Artist" --priority high --source physical &
wait
/check-completeness "Artist" --incremental  # Re-check after acquisition
```

## Error Handling

**MusicBrainz API failure:**
- Fall back to Discogs API
- If both fail, use cached canonical (warn if >30 days old)
- Suggest manual canonical.yaml creation

**Artist not found:**
- Suggest fuzzy matches from collection directory names
- Offer to use directory name as canonical source

**No collection inventory:**
- Auto-trigger `/scan-collection` if not found
- Error if collection path invalid

## Performance

**Expected execution time:**
- Small collection (<500 files): 5-10 seconds
- Medium collection (500-2000 files): 15-30 seconds
- Large collection (>2000 files): 30-60 seconds
- Incremental mode: 50% faster (uses cached canonical)

**Rate limiting:**
- MusicBrainz: 1 request/second (built-in delay)
- Discogs: 60 requests/minute (with API key)
- Wait and retry on 429 responses

## Output Files

All output written to `.media-curator/completeness/{artist-slug}/`:

```
.media-curator/completeness/pink-floyd/
├── canonical.yaml           # Cached canonical discography
├── legendary.yaml           # Extended content catalog
├── state.json              # Completeness tracking state
├── gap-report-2026-02-14.yaml
├── gap-report-2026-01-15.yaml  # Historical reports
└── history.json            # Completeness score over time
```

## Success Criteria

- Completeness scores accurate within ±2%
- Zero false positives (claiming missing when present)
- Priority assignments align with collector consensus >90%
- Availability checks current within 7 days
- Report generation <60 seconds for any collection size
