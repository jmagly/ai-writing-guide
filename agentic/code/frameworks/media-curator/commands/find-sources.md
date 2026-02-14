---
description: Discover and rank media sources across platforms for an artist or specific content
category: media-curator
argument-hint: "<artist>" [--scope complete|album:NAME|era:NAME|track:NAME] [--tier 1-4] [--output sources.yaml]
allowed-tools: Bash, Read, Write, WebSearch, WebFetch
model: sonnet
---

# find-sources

Discover and rank media sources across YouTube, Internet Archive, Bandcamp, SoundCloud, and other platforms. Intelligently prioritizes official releases, lossless formats, and verified channels while filtering out low-quality duplicates.

## Purpose

Automate the tedious process of hunting down the best available version of media content across fragmented platforms. Instead of manually checking Bandcamp, YouTube, archive.org, and streaming services, this command orchestrates a comprehensive search and returns a ranked, deduplicated list of sources with quality scoring.

**Key Benefits**:
- **Time Savings**: Search 5+ platforms in one command instead of manual browser searches
- **Quality Assurance**: Automatically prioritizes lossless > high-bitrate > standard quality
- **Official First**: Verified channels and artist-uploaded content ranked highest
- **Deduplication**: Filters redundant sources, keeps only the best version
- **Comprehensive Coverage**: Catches rare/archival content missed by streaming services

## Parameters

### Required

**`<artist>`** - Artist or creator name to search for

Examples:
- `"Tool"`
- `"Pink Floyd"`
- `"Grateful Dead"`
- `"Tame Impala"`

### Optional Flags

**`--scope <scope>`** - Limit search scope (default: `complete`)

- `complete` - Full artist catalog (all albums, singles, live recordings)
- `album:NAME` - Specific album only (e.g., `album:"Dark Side of the Moon"`)
- `era:NAME` - Time period or tour (e.g., `era:"1990-1995"`, `era:"Lateralus Tour"`)
- `track:NAME` - Single song across all versions (e.g., `track:"Stairway to Heaven"`)

**`--tier <1-4>`** - Minimum acceptable quality tier (default: `3`)

- `1` - Official/Lossless only (FLAC, verified channels, Qobuz Hi-Res)
- `2` - High Quality+ (256kbps AAC, 1080p video, official sources)
- `3` - Standard+ (128kbps+, 720p+, most YouTube content)
- `4` - Accept all (includes phone recordings, low-quality rips)

**`--output <file>`** - Save results to YAML file (default: print to stdout)

- Absolute or relative path
- Creates parent directories if needed
- Overwrites existing file

**`--platforms <list>`** - Comma-separated platform filter (default: all)

- `youtube` - YouTube and YouTube Music
- `bandcamp` - Bandcamp artist pages
- `archive` - Internet Archive (all collections)
- `soundcloud` - SoundCloud
- `qobuz` - Qobuz Hi-Res
- `vimeo` - Vimeo

Example: `--platforms youtube,bandcamp,archive`

**`--sort <field>`** - Sort results by field (default: `quality_score`)

- `quality_score` - Tier + format + verification score (0-100)
- `tier` - Tier 1 first, then tier 2, etc.
- `upload_date` - Newest first
- `platform` - Alphabetical by platform name

**`--limit <n>`** - Maximum results to return (default: unlimited)

**`--verified-only`** - Only include verified/official sources (boolean flag)

**`--include-unavailable`** - Include geo-blocked or restricted content (default: exclude)

## Usage Examples

### Example 1: Complete Artist Catalog (High Quality+)

```bash
aiwg find-sources "Tool" --tier 2 --output tool-sources.yaml
```

**What it does**:
1. Searches Bandcamp for official Tool releases (FLAC preferred)
2. Checks YouTube for verified Tool channels and Topic channels
3. Searches Internet Archive for live recordings and official uploads
4. Filters results to Tier 2+ only (256kbps+ audio, 1080p+ video)
5. Scores and ranks all sources
6. Saves to `tool-sources.yaml`

**Expected output**: 30-50 sources including studio albums (FLAC from Bandcamp), official music videos (1080p YouTube), live concerts (archive.org soundboard recordings).

### Example 2: Specific Album (Lossless Only)

```bash
aiwg find-sources "Pink Floyd" --scope 'album:"The Dark Side of the Moon"' --tier 1 --verified-only
```

**What it does**:
1. Searches only for "The Dark Side of the Moon" album
2. Prioritizes lossless sources (FLAC, WAV, Qobuz Hi-Res)
3. Only includes verified/official channels
4. Filters out audience recordings, re-uploads, unofficial versions

**Expected output**: 3-8 sources including Qobuz 24/96 FLAC, Bandcamp official FLAC (if available), YouTube Topic channel official audio.

### Example 3: Live Era Search

```bash
aiwg find-sources "Grateful Dead" --scope 'era:"1977"' --platforms archive --output gd1977.yaml
```

**What it does**:
1. Searches only Internet Archive
2. Filters to 1977 concerts
3. Includes soundboard recordings (Tier 2) and audience recordings (Tier 3)
4. Saves comprehensive list to `gd1977.yaml`

**Expected output**: 50-100 sources (Grateful Dead has extensive archive.org presence with official taper policy).

### Example 4: Single Track Across All Versions

```bash
aiwg find-sources "Led Zeppelin" --scope 'track:"Stairway to Heaven"' --tier 2
```

**What it does**:
1. Finds all high-quality versions of "Stairway to Heaven"
2. Includes studio version, live recordings, remastered editions
3. Ranks by quality score
4. Prints to stdout (no --output specified)

**Expected output**: 10-20 sources including studio album version, live at Madison Square Garden, BBC Sessions version, 2014 remaster, etc.

### Example 5: Platform-Specific Search

```bash
aiwg find-sources "Tame Impala" --platforms youtube,bandcamp --sort upload_date --limit 10
```

**What it does**:
1. Searches only YouTube and Bandcamp
2. Sorts by upload date (newest first)
3. Limits to 10 most recent results

**Expected output**: Recent releases, new music videos, latest Bandcamp uploads.

## Workflow

### Phase 1: Parse Request

1. **Extract Artist Name** - Clean and normalize input
2. **Parse Scope** - Determine search boundaries (complete/album/era/track)
3. **Set Quality Threshold** - Minimum acceptable tier
4. **Platform Selection** - Which platforms to query (default: all)

### Phase 2: Official Channels First

**Priority Search** - Highest quality, verified sources

1. **Bandcamp**
   ```bash
   # Search Bandcamp for artist
   curl -s "https://bandcamp.com/search?q=$(echo "$ARTIST" | sed 's/ /+/g')&item_type=b"
   ```
   - Extract artist page URL
   - Check for FLAC/WAV availability
   - Record album list with formats

2. **Qobuz (if available)**
   ```bash
   # Check Qobuz for Hi-Res releases
   # Requires API key or web scraping
   ```
   - Look for 24-bit/96kHz+ releases
   - Note sample rates and bit depths

3. **YouTube Verified Channels**
   ```bash
   yt-dlp --dump-json "https://www.youtube.com/@${ARTIST_HANDLE}/videos"
   ```
   - Find verified channel (✓ badge)
   - Get video list with quality metadata
   - Filter to HD (1080p+)

4. **YouTube Topic Channels**
   ```bash
   yt-dlp "ytsearch:${ARTIST} - Topic"
   ```
   - Auto-generated official audio channels
   - Usually AAC 256kbps
   - Reliable metadata

### Phase 3: Archive Search

**Historical and Live Content**

1. **Internet Archive API**
   ```bash
   curl "https://archive.org/advancedsearch.php?q=creator:(${ARTIST})&fl[]=identifier,title,date,format,avg_rating&rows=100&output=json"
   ```
   - Filter by scope (year range for era, album title, etc.)
   - Parse formats (FLAC, MP3, Ogg)
   - Note taper/source info

2. **Etree Collection** (for jam bands)
   ```bash
   curl "https://archive.org/advancedsearch.php?q=collection:etree+AND+creator:(${ARTIST})&output=json"
   ```
   - Soundboard recordings
   - Audience recordings with quality ratings

3. **Live Music Archive**
   ```bash
   curl "https://archive.org/advancedsearch.php?q=collection:etree+AND+subject:(${ARTIST})&output=json"
   ```

### Phase 4: YouTube Comprehensive

**Broad Search with Quality Filtering**

1. **Search Query Construction**
   ```bash
   # For complete catalog
   QUERY="${ARTIST} official HD"

   # For album
   QUERY="${ARTIST} ${ALBUM_NAME} full album"

   # For track
   QUERY="${ARTIST} ${TRACK_NAME} official"
   ```

2. **Execute Search**
   ```bash
   yt-dlp --dump-json "ytsearch50:${QUERY}" | jq -r '.[]'
   ```

3. **Quality Filter**
   - Extract resolution (height >= 720 for Tier 3, >= 1080 for Tier 2)
   - Extract audio bitrate (abr field)
   - Check for "Official" in title or verified uploader

4. **Deduplication**
   - Compare video IDs
   - Compare durations (within 5 seconds = likely duplicate)
   - Keep highest quality version

### Phase 5: Alternative Platforms

**Additional Sources**

1. **SoundCloud**
   ```bash
   # SoundCloud search (requires API or web scraping)
   curl -s "https://soundcloud.com/search/sounds?q=${ARTIST}"
   ```
   - Check for official artist account
   - Note Go+ tracks (320kbps)

2. **Vimeo**
   ```bash
   curl "https://api.vimeo.com/videos?query=${ARTIST}"
   ```
   - Pro accounts often have high-quality uploads
   - Music videos and live sessions

3. **Dailymotion** (fallback)
   - Only if content not found elsewhere
   - Usually lower priority

### Phase 6: Quality Scoring

**Score Each Source** (0-100 scale)

```
Quality Score = Tier Points + Format Points + Verification Points + Completeness Points

Tier Points (40 max):
  - Tier 1: 40
  - Tier 2: 30
  - Tier 3: 20
  - Tier 4: 10

Format Points (30 max):
  Audio:
    - Lossless (FLAC, WAV): 30
    - 320kbps: 25
    - 256kbps: 20
    - 192kbps: 15
    - 128kbps: 10
    - <128kbps: 5
  Video:
    - 4K (2160p): 30
    - 1080p: 25
    - 720p: 20
    - 480p: 10
    - <480p: 5

Verification Points (15 max):
  - Official channel (✓): 15
  - Verified uploader: 10
  - High-reputation uploader: 5
  - Unknown: 0

Completeness Points (15 max):
  - Complete album/concert: 15
  - Partial (>50% of content): 10
  - Single track: 5
```

### Phase 7: Rank and Deduplicate

1. **Sort by Quality Score** - Highest first
2. **Group by Content** - Same album/track/concert
3. **Remove Duplicates** - Keep highest-scored version
4. **Apply Tier Filter** - Exclude below minimum tier
5. **Apply Limit** - If --limit specified

### Phase 8: Output

**YAML Format** (if --output specified):

```yaml
search_query:
  artist: "Artist Name"
  scope: "complete"
  tier_minimum: 2
  platforms: ["youtube", "bandcamp", "archive"]
  search_date: "2026-02-14T10:30:00Z"

sources_found:
  - url: "https://bandcamp.com/album/example"
    platform: "bandcamp"
    type: "album"
    tier: 1
    quality_score: 95
    format: "FLAC"
    bitrate: "lossless"
    resolution: "N/A"
    size: "450 MB"
    tracks: 12
    notes: "Official artist upload, includes booklet PDF"
    verified: true
    upload_date: "2023-05-15"

  - url: "https://youtube.com/watch?v=VIDEO_ID"
    platform: "youtube"
    type: "video"
    tier: 2
    quality_score: 85
    format: "mp4"
    bitrate: "256 kbps AAC"
    resolution: "1080p"
    duration: "3:45"
    views: 1250000
    notes: "Official music video"
    verified: true
    upload_date: "2023-05-20"
    channel: "Artist Official"
    channel_verified: true

quality_summary:
  tier_1_sources: 5
  tier_2_sources: 15
  tier_3_sources: 8
  tier_4_sources: 0
  total_sources: 28
  average_quality_score: 78.5
  platforms_searched: ["youtube", "bandcamp", "archive", "soundcloud"]
```

**Stdout Format** (if no --output):

```
Found 28 sources for "Artist Name" (tier 2+)

Tier 1 Sources (5):
  [95] Bandcamp FLAC - Album Name (450 MB, 12 tracks)
       https://bandcamp.com/album/example
  [92] Qobuz 24/96 - Album Name (1.2 GB)
       https://qobuz.com/album/example
  ...

Tier 2 Sources (15):
  [85] YouTube 1080p - Music Video ✓
       https://youtube.com/watch?v=VIDEO_ID
  [82] Archive.org FLAC - Live 2023-06-10 (Soundboard)
       https://archive.org/details/IDENTIFIER
  ...

Tier 3 Sources (8):
  [65] YouTube 720p - Live Performance
       https://youtube.com/watch?v=ANOTHER_ID
  ...

Quality Summary:
  Average Score: 78.5
  Total Sources: 28
  Platforms: YouTube, Bandcamp, Archive.org, SoundCloud
```

## Output Format Details

### Source Record Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Direct link to source |
| `platform` | string | Platform name (youtube, bandcamp, etc.) |
| `type` | string | Content type (album, video, concert, track) |
| `tier` | integer | Quality tier (1-4) |
| `quality_score` | integer | Overall quality score (0-100) |
| `format` | string | File format (FLAC, mp4, mp3, etc.) |
| `bitrate` | string | Audio bitrate or "lossless" |
| `resolution` | string | Video resolution or "N/A" |
| `size` | string | File/download size (if available) |
| `duration` | string | Track/video duration (if available) |
| `tracks` | integer | Number of tracks (for albums) |
| `notes` | string | Additional context |
| `verified` | boolean | Official/verified source |
| `upload_date` | string | ISO 8601 date |
| `channel` | string | Uploader/channel name (if applicable) |
| `taper` | string | Taper name (for archive.org concerts) |
| `views` | integer | View count (if available) |

## Error Handling

### Platform Unreachable

If a platform is down or unreachable:
1. Log warning: `Warning: Could not reach ${platform}`
2. Continue with remaining platforms
3. Note in output: `platforms_unavailable: ["platform"]`

### Rate Limiting

If rate-limited by a platform:
1. Implement exponential backoff (1s, 2s, 4s, 8s)
2. Switch to alternative search method (web scraping if API limited)
3. Log delay: `Rate limited by ${platform}, retrying in ${delay}s`

### No Results Found

If no sources match criteria:
1. Try relaxed search (fewer keywords, broader scope)
2. Try alternative spelling/formatting
3. Return empty `sources_found: []` with explanation
4. Suggest: "Try lowering --tier threshold or checking artist name spelling"

### Geo-Blocking

If content is geo-blocked:
1. Note in `notes` field: "Geo-blocked in current region"
2. Include if `--include-unavailable` flag set
3. Otherwise exclude from results

## Integration Points

- **Queue Manager**: Receives source list for download queue prioritization
- **Source Discoverer Agent**: Can invoke this command programmatically
- **Metadata Enricher**: Uses source URLs for metadata extraction
- **Quality Auditor**: Validates quality claims in source records

## Best Practices

### Search Strategy

1. **Start Specific** - Use artist name + official keywords first
2. **Expand Gradually** - Broaden search if initial results insufficient
3. **Quality First** - Prefer fewer high-quality sources over many low-quality
4. **Verify Metadata** - Cross-check with MusicBrainz/Discogs when possible

### Performance Optimization

1. **Parallel Searches** - Query platforms concurrently when possible
2. **Cache Results** - Store search results temporarily to avoid re-querying
3. **Limit Scope** - Use --scope to avoid searching entire catalogs unnecessarily
4. **Smart Deduplication** - Compare content hashes, not just URLs

### Quality Assurance

1. **Verify Official Channels** - Check for verification badges
2. **Cross-Reference Formats** - Ensure claimed quality matches actual files
3. **Check Upload Dates** - Newer remasters may be higher quality
4. **Read Comments** - User comments can indicate quality issues

## Advanced Usage

### Scripting Integration

```bash
# Find all Tier 1 sources and download them
aiwg find-sources "Artist" --tier 1 --output sources.yaml
yq '.sources_found[].url' sources.yaml | while read url; do
  yt-dlp "$url"
done
```

### Custom Quality Scoring

Users can override quality scoring by:
1. Modifying the output YAML `quality_score` field
2. Re-sorting with `yq` or `jq`
3. Feeding modified YAML to downstream commands

### Combining with Other Commands

```bash
# Find sources, filter to YouTube, download
aiwg find-sources "Artist" --platforms youtube --output yt.yaml
aiwg download-queue --input yt.yaml --format best
```

## Troubleshooting

### Issue: Too many results

**Solution**: Use `--limit`, increase `--tier` threshold, or narrow `--scope`

### Issue: No Tier 1 sources found

**Solution**: Lower to `--tier 2` or `--tier 3`, or check if artist has official Bandcamp/Qobuz

### Issue: Incorrect artist found

**Solution**: Use more specific artist name (e.g., "Pink Floyd UK" vs "Pink Floyd tribute")

### Issue: Old/outdated results

**Solution**: Sort by `--sort upload_date` to prioritize recent uploads

## See Also

- Source Discoverer Agent: `@agentic/code/frameworks/media-curator/agents/source-discoverer.md`
- YouTube Acquisition Skill: `@agentic/code/frameworks/media-curator/skills/youtube-acquisition.md`
- Queue Manager Agent: `@agentic/code/frameworks/media-curator/agents/queue-manager.md`
