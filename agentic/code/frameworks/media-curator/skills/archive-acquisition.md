---
name: Archive Acquisition
description: Patterns for acquiring content from Internet Archive and archival sources
category: media-curator
---

# Archive Acquisition Skill

Specialized patterns and techniques for acquiring media content from Internet Archive (archive.org) and other archival sources. Focuses on bulk downloads, quality selection, format filtering, and collection management.

## Internet Archive Overview

Internet Archive hosts massive collections of audio, video, text, and software. Key characteristics:

- **Open access**: Most content freely downloadable
- **Multiple formats**: Same item often available in FLAC, MP3, OGG, etc.
- **Collections**: Items grouped by uploader, topic, or curator
- **Metadata**: Rich JSON metadata for every item
- **API access**: Full programmatic access via REST API

## Discovery Patterns

### Search API

Find items matching specific criteria:

```bash
# Search for items by keyword and mediatype
search_archive() {
  local query="$1"
  local mediatype="$2"  # audio, movies, texts, etc.
  local rows="${3:-100}"  # Results per page

  curl -s "https://archive.org/advancedsearch.php" \
    -d "q=$query AND mediatype:$mediatype" \
    -d "fl[]=identifier,title,creator,date,format" \
    -d "rows=$rows" \
    -d "output=json" \
    | jq '.response.docs[]'
}

# Example: Search for Grateful Dead concerts
search_archive "grateful dead" "audio" 50
```

### Response Format

```json
{
  "identifier": "gd1977-05-08.sbd.miller.97065.flac16",
  "title": "Grateful Dead Live at Barton Hall on 1977-05-08",
  "creator": "Grateful Dead",
  "date": "1977-05-08",
  "format": ["Flac", "VBR MP3", "Ogg Vorbis", "Metadata"]
}
```

### Collection Browsing

List all items in a collection:

```bash
# Get items from a specific collection
get_collection_items() {
  local collection="$1"
  local rows="${2:-1000}"

  curl -s "https://archive.org/advancedsearch.php" \
    -d "q=collection:$collection" \
    -d "fl[]=identifier,title,format" \
    -d "rows=$rows" \
    -d "output=json" \
    | jq -r '.response.docs[] | .identifier'
}

# Example: Get all items from GratefulDead collection
get_collection_items "GratefulDead" 500
```

### Advanced Query Patterns

```bash
# Find items by date range
search_by_date() {
  local creator="$1"
  local start_date="$2"  # YYYY-MM-DD
  local end_date="$3"

  curl -s "https://archive.org/advancedsearch.php" \
    -d "q=creator:\"$creator\" AND date:[$start_date TO $end_date]" \
    -d "fl[]=identifier,title,date" \
    -d "rows=100" \
    -d "output=json" \
    | jq '.response.docs[]'
}

# Find items with specific format available
search_by_format() {
  local query="$1"
  local format="$2"  # FLAC, MP3, etc.

  curl -s "https://archive.org/advancedsearch.php" \
    -d "q=$query AND format:$format" \
    -d "fl[]=identifier,title,format" \
    -d "rows=100" \
    -d "output=json" \
    | jq '.response.docs[]'
}

# Example: Find all FLAC recordings of specific artist
search_by_format "pink floyd" "Flac"
```

## Item Metadata Retrieval

### Get Item Details

```bash
# Retrieve full metadata for an item
get_item_metadata() {
  local identifier="$1"

  curl -s "https://archive.org/metadata/$identifier" \
    | jq '.'
}

# Extract specific metadata fields
get_item_files() {
  local identifier="$1"

  curl -s "https://archive.org/metadata/$identifier" \
    | jq -r '.files[] | select(.format != "Metadata") | "\(.name)\t\(.format)\t\(.size)"'
}

# Example output:
# gd77-05-08d1t01.flac    Flac    45123456
# gd77-05-08d1t01.mp3     VBR MP3 12345678
```

### Filter by Format

```bash
# Get only FLAC files from an item
get_flac_files() {
  local identifier="$1"

  curl -s "https://archive.org/metadata/$identifier" \
    | jq -r '.files[] | select(.format == "Flac") | .name'
}

# Get best quality audio files (prefer FLAC, fallback to 320K MP3)
get_best_audio_files() {
  local identifier="$1"

  # Try FLAC first
  local flac_files=$(curl -s "https://archive.org/metadata/$identifier" \
    | jq -r '.files[] | select(.format == "Flac") | .name')

  if [[ -n "$flac_files" ]]; then
    echo "$flac_files"
    return 0
  fi

  # Fallback to highest bitrate MP3
  curl -s "https://archive.org/metadata/$identifier" \
    | jq -r '.files[] | select(.format == "VBR MP3" or .format == "320Kbps MP3") | .name'
}
```

## Download Patterns

### Single Item Download

```bash
# Download all files from a single item
download_item() {
  local identifier="$1"
  local output_dir="$2"
  local format_filter="$3"  # Optional: FLAC, MP3, etc.

  mkdir -p "$output_dir"

  # Get file list
  local files
  if [[ -n "$format_filter" ]]; then
    files=$(curl -s "https://archive.org/metadata/$identifier" \
      | jq -r ".files[] | select(.format == \"$format_filter\") | .name")
  else
    files=$(curl -s "https://archive.org/metadata/$identifier" \
      | jq -r '.files[] | select(.format != "Metadata") | .name')
  fi

  # Download each file
  while IFS= read -r file; do
    echo "Downloading: $file"
    wget -q --show-progress \
      "https://archive.org/download/$identifier/$file" \
      -P "$output_dir"
  done <<< "$files"
}

# Example: Download all FLAC files from an item
download_item "gd1977-05-08.sbd.miller.97065.flac16" "/mnt/archive/grateful-dead/1977-05-08" "Flac"
```

### Recursive Collection Download

```bash
# Download entire collection with format filtering
download_collection() {
  local collection="$1"
  local output_base="$2"
  local format="$3"  # FLAC, MP3, etc.
  local max_items="${4:-100}"

  # Get collection items
  local items=$(get_collection_items "$collection" "$max_items")

  local count=0
  while IFS= read -r identifier; do
    count=$((count + 1))
    echo "[$count/$max_items] Downloading: $identifier"

    # Create item directory
    local item_dir="$output_base/$identifier"
    mkdir -p "$item_dir"

    # Download with format filter
    download_item "$identifier" "$item_dir" "$format"

    # Download metadata
    curl -s "https://archive.org/metadata/$identifier" \
      > "$item_dir/.curator/metadata.json"

    # Rate limiting (be nice to archive.org)
    sleep 2
  done <<< "$items"
}

# Example: Download first 50 FLAC items from collection
download_collection "GratefulDead" "/mnt/archive/grateful-dead" "Flac" 50
```

### Parallel Collection Download

```bash
# Download collection items in parallel (with concurrency limit)
download_collection_parallel() {
  local collection="$1"
  local output_base="$2"
  local format="$3"
  local max_concurrent="${4:-3}"

  # Get collection items
  local items=$(get_collection_items "$collection" 1000)

  # Create job queue
  local queue_file="/tmp/curator-archive-queue-$$.txt"
  echo "$items" > "$queue_file"

  # Process queue with concurrency limit
  cat "$queue_file" | xargs -P "$max_concurrent" -I {} bash -c "
    identifier={}
    item_dir=\"$output_base/\$identifier\"
    mkdir -p \"\$item_dir\"

    echo \"Downloading: \$identifier\"

    # Download best quality audio
    files=\$(curl -s \"https://archive.org/metadata/\$identifier\" \
      | jq -r '.files[] | select(.format == \"$format\") | .name')

    while IFS= read -r file; do
      wget -q --show-progress \
        \"https://archive.org/download/\$identifier/\$file\" \
        -P \"\$item_dir\"
    done <<< \"\$files\"

    # Save metadata
    curl -s \"https://archive.org/metadata/\$identifier\" \
      > \"\$item_dir/.curator/metadata.json\"

    sleep 2  # Rate limiting
  "

  rm "$queue_file"
}
```

### wget Recursive Download

```bash
# Use wget's recursive mode for efficient bulk download
download_with_wget_recursive() {
  local identifier="$1"
  local output_dir="$2"
  local format_pattern="$3"  # e.g., "*.flac" or "*.mp3"

  mkdir -p "$output_dir"

  wget --recursive \
       --no-parent \
       --no-directories \
       --accept "$format_pattern" \
       --directory-prefix="$output_dir" \
       --wait=2 \
       --random-wait \
       "https://archive.org/download/$identifier/"
}

# Example: Download all FLAC files from item
download_with_wget_recursive "gd1977-05-08.sbd.miller.97065.flac16" \
  "/mnt/archive/gd-1977-05-08" \
  "*.flac"
```

## Quality Selection Strategy

### Format Preference Hierarchy

For audio archival, prefer formats in this order:

1. **FLAC** - Lossless, widely supported
2. **320Kbps MP3** - High quality lossy, universal compatibility
3. **VBR MP3** - Variable bitrate, good quality/size ratio
4. **Ogg Vorbis** - Good quality, open format
5. **128Kbps MP3** - Acceptable for spoken word, not music

### Automatic Quality Selection

```bash
# Select best available format for an item
select_best_format() {
  local identifier="$1"

  # Get available formats
  local formats=$(curl -s "https://archive.org/metadata/$identifier" \
    | jq -r '.files[] | .format' | sort -u)

  # Check in preference order
  if echo "$formats" | grep -q "Flac"; then
    echo "Flac"
  elif echo "$formats" | grep -q "320Kbps MP3"; then
    echo "320Kbps MP3"
  elif echo "$formats" | grep -q "VBR MP3"; then
    echo "VBR MP3"
  elif echo "$formats" | grep -q "Ogg Vorbis"; then
    echo "Ogg Vorbis"
  else
    echo "$(echo "$formats" | grep -i mp3 | head -1)"
  fi
}

# Download using best available format
download_best_quality() {
  local identifier="$1"
  local output_dir="$2"

  local best_format=$(select_best_format "$identifier")

  echo "Selected format: $best_format"
  download_item "$identifier" "$output_dir" "$best_format"
}
```

### Size vs Quality Trade-offs

```bash
# Estimate download size before acquiring
estimate_download_size() {
  local identifier="$1"
  local format="$2"

  local total_size=$(curl -s "https://archive.org/metadata/$identifier" \
    | jq "[.files[] | select(.format == \"$format\") | .size | tonumber] | add")

  # Convert to human-readable
  local size_mb=$((total_size / 1048576))
  local size_gb=$((size_mb / 1024))

  if [[ $size_gb -gt 0 ]]; then
    echo "${size_gb}GB"
  else
    echo "${size_mb}MB"
  fi
}

# Check if size is acceptable before downloading
download_if_acceptable() {
  local identifier="$1"
  local output_dir="$2"
  local format="$3"
  local max_size_gb="${4:-5}"  # Default 5GB limit

  local estimated_size=$(estimate_download_size "$identifier" "$format")
  local size_value=$(echo "$estimated_size" | sed 's/[^0-9]//g')
  local size_unit=$(echo "$estimated_size" | sed 's/[0-9]//g')

  if [[ "$size_unit" == "GB" && $size_value -gt $max_size_gb ]]; then
    echo "SKIPPED: $identifier ($estimated_size exceeds ${max_size_gb}GB limit)"
    return 1
  fi

  echo "Downloading: $identifier ($estimated_size)"
  download_item "$identifier" "$output_dir" "$format"
}
```

## Metadata Extraction and Storage

### Extract Archive Metadata

```bash
# Convert Archive.org metadata to curator format
extract_archive_metadata() {
  local identifier="$1"
  local output_file="$2"

  curl -s "https://archive.org/metadata/$identifier" | jq '{
    source: "archive.org",
    identifier: .metadata.identifier,
    title: .metadata.title,
    creator: .metadata.creator,
    date: .metadata.date,
    venue: .metadata.venue,
    coverage: .metadata.coverage,
    description: .metadata.description,
    collection: .metadata.collection,
    downloads: .item_size.downloads,
    avg_rating: .reviews.info.avg_rating,
    num_reviews: .reviews.info.num_reviews,
    files: [
      .files[] | {
        name: .name,
        format: .format,
        size: .size,
        md5: .md5,
        sha1: .sha1
      }
    ]
  }' > "$output_file"
}

# Example usage
extract_archive_metadata "gd1977-05-08.sbd.miller.97065.flac16" \
  ".curator/metadata/gd-1977-05-08.json"
```

### Merge with Curator Metadata

```bash
# Merge Archive.org metadata with existing curator metadata
merge_metadata() {
  local curator_metadata="$1"
  local archive_metadata="$2"
  local output_file="$3"

  jq -s '.[0] * .[1]' "$curator_metadata" "$archive_metadata" > "$output_file"
}
```

## Verification and Quality Assurance

### Checksum Verification

Archive.org provides MD5 and SHA1 checksums for all files:

```bash
# Verify downloaded files against Archive.org checksums
verify_archive_downloads() {
  local identifier="$1"
  local download_dir="$2"

  # Get checksums from metadata
  local checksums=$(curl -s "https://archive.org/metadata/$identifier" \
    | jq -r '.files[] | "\(.md5)  \(.name)"')

  # Verify each file
  local failed=0
  while IFS= read -r line; do
    local expected_md5="${line%%  *}"
    local filename="${line#*  }"
    local filepath="$download_dir/$filename"

    if [[ ! -f "$filepath" ]]; then
      echo "MISSING: $filename"
      failed=$((failed + 1))
      continue
    fi

    local actual_md5=$(md5sum "$filepath" | awk '{print $1}')

    if [[ "$actual_md5" != "$expected_md5" ]]; then
      echo "CHECKSUM FAILED: $filename"
      echo "  Expected: $expected_md5"
      echo "  Actual:   $actual_md5"
      failed=$((failed + 1))
    else
      echo "VERIFIED: $filename"
    fi
  done <<< "$checksums"

  if [[ $failed -gt 0 ]]; then
    echo "Verification failed for $failed files"
    return 1
  fi

  echo "All files verified successfully"
  return 0
}
```

### File Integrity Check

```bash
# Verify audio file integrity after download
verify_audio_integrity() {
  local file="$1"

  # Check file is not zero-byte
  if [[ ! -s "$file" ]]; then
    echo "FAILED: Zero-byte file"
    return 1
  fi

  # Verify with ffmpeg
  if command -v ffmpeg >/dev/null; then
    if ffmpeg -v error -i "$file" -f null - 2>&1 | grep -q "error"; then
      echo "FAILED: Corrupted audio file"
      return 1
    fi
  fi

  # FLAC specific: verify with flac tool
  if [[ "$file" == *.flac ]] && command -v flac >/dev/null; then
    if ! flac -t "$file" 2>&1 | grep -q "ok"; then
      echo "FAILED: FLAC verification failed"
      return 1
    fi
  fi

  echo "VERIFIED: $file"
  return 0
}

# Verify all files in directory
verify_directory_integrity() {
  local dir="$1"

  local total=0
  local verified=0
  local failed=0

  find "$dir" -type f \( -name "*.flac" -o -name "*.mp3" -o -name "*.ogg" \) | while read -r file; do
    total=$((total + 1))

    if verify_audio_integrity "$file"; then
      verified=$((verified + 1))
    else
      failed=$((failed + 1))
    fi
  done

  echo "Integrity check complete: $verified/$total verified, $failed failed"
}
```

## Rate Limiting and Politeness

Archive.org requests responsible use of their bandwidth:

```bash
# Implement polite download behavior
polite_download() {
  local identifier="$1"
  local output_dir="$2"
  local format="$3"

  # Add delays between requests
  local wait_time=2  # seconds

  # Get file list
  local files=$(curl -s "https://archive.org/metadata/$identifier" \
    | jq -r ".files[] | select(.format == \"$format\") | .name")

  while IFS= read -r file; do
    echo "Downloading: $file"

    wget --quiet \
         --show-progress \
         --wait="$wait_time" \
         --random-wait \
         --user-agent="AIWG-MediaCurator/1.0 (research/personal use)" \
         "https://archive.org/download/$identifier/$file" \
         -P "$output_dir"

  done <<< "$files"
}
```

### Bulk Download Best Practices

1. **Rate limit**: Wait 2-5 seconds between requests
2. **Random wait**: Add jitter to avoid patterns
3. **User agent**: Identify your tool
4. **Off-peak hours**: Download during US night hours
5. **Resume support**: Use `wget -c` to resume interrupted downloads
6. **Error handling**: Retry failed downloads after delay

## Collection Management

### Build Local Collection Index

```bash
# Create searchable index of downloaded items
build_collection_index() {
  local collection_dir="$1"
  local index_file="$2"

  echo '{"items": []}' > "$index_file"

  find "$collection_dir" -name "metadata.json" -type f | while read -r metadata_file; do
    local item_dir=$(dirname "$metadata_file")

    # Extract key metadata fields
    local item_data=$(jq '{
      identifier: .metadata.identifier,
      title: .metadata.title,
      creator: .metadata.creator,
      date: .metadata.date,
      local_path: "'"$item_dir"'",
      file_count: (.files | length),
      total_size: ([.files[] | .size | tonumber] | add)
    }' "$metadata_file")

    # Append to index
    jq ".items += [$item_data]" "$index_file" > "$index_file.tmp"
    mv "$index_file.tmp" "$index_file"
  done

  echo "Index built: $index_file"
}

# Search local collection
search_local_collection() {
  local index_file="$1"
  local query="$2"

  jq -r ".items[] | select(.title | test(\"$query\"; \"i\")) | \"\(.date) - \(.creator) - \(.title) (\(.local_path))\"" \
    "$index_file"
}
```

### Deduplicate Collection

```bash
# Find and remove duplicate items in collection
deduplicate_collection() {
  local collection_dir="$1"

  # Build checksum database
  local checksum_file="/tmp/curator-checksums-$$.txt"

  find "$collection_dir" -type f \( -name "*.flac" -o -name "*.mp3" \) | while read -r file; do
    local checksum=$(md5sum "$file" | awk '{print $1}')
    echo "$checksum  $file" >> "$checksum_file"
  done

  # Find duplicates
  sort "$checksum_file" | uniq -d -w 32 | while read -r line; do
    local checksum="${line%%  *}"

    echo "Duplicate found (checksum: $checksum):"

    grep "^$checksum" "$checksum_file" | while read -r dup_line; do
      local dup_file="${dup_line#*  }"
      echo "  - $dup_file"
    done

    # Offer to delete all but first
    local files=($(grep "^$checksum" "$checksum_file" | cut -d' ' -f3-))
    local keep="${files[0]}"

    echo "Keep: $keep"

    for ((i=1; i<${#files[@]}; i++)); do
      echo "Delete: ${files[$i]}"
      rm "${files[$i]}"
    done
  done

  rm "$checksum_file"
}
```

## Advanced Patterns

### Incremental Collection Sync

```bash
# Download only new items added to collection since last sync
sync_collection_incremental() {
  local collection="$1"
  local output_base="$2"
  local format="$3"
  local sync_state_file="$output_base/.curator/sync-state.json"

  # Get last sync timestamp
  local last_sync
  if [[ -f "$sync_state_file" ]]; then
    last_sync=$(jq -r '.last_sync' "$sync_state_file")
  else
    last_sync="1970-01-01"
  fi

  # Search for items added/updated since last sync
  local new_items=$(curl -s "https://archive.org/advancedsearch.php" \
    -d "q=collection:$collection AND publicdate:[$last_sync TO null]" \
    -d "fl[]=identifier" \
    -d "rows=1000" \
    -d "output=json" \
    | jq -r '.response.docs[] | .identifier')

  # Download new items
  local count=0
  while IFS= read -r identifier; do
    count=$((count + 1))
    echo "Downloading new item [$count]: $identifier"

    download_item "$identifier" "$output_base/$identifier" "$format"
    sleep 2
  done <<< "$new_items"

  # Update sync state
  echo "{\"last_sync\": \"$(date -Iseconds)\", \"items_added\": $count}" > "$sync_state_file"

  echo "Sync complete: $count new items added"
}
```

### Filtered Batch Download

```bash
# Download items matching complex filter criteria
download_filtered_batch() {
  local query="$1"
  local output_base="$2"
  local format="$3"
  local min_rating="${4:-4.0}"
  local min_year="${5:-1960}"

  # Search with filters
  local items=$(curl -s "https://archive.org/advancedsearch.php" \
    -d "q=$query AND avg_rating:[$min_rating TO 5.0] AND year:[$min_year TO 2026]" \
    -d "fl[]=identifier,avg_rating,year" \
    -d "rows=500" \
    -d "output=json")

  # Download each item
  echo "$items" | jq -r '.response.docs[] | .identifier' | while read -r identifier; do
    local rating=$(echo "$items" | jq -r ".response.docs[] | select(.identifier == \"$identifier\") | .avg_rating")
    local year=$(echo "$items" | jq -r ".response.docs[] | select(.identifier == \"$identifier\") | .year")

    echo "Downloading: $identifier (rating: $rating, year: $year)"

    download_item "$identifier" "$output_base/$identifier" "$format"
    sleep 2
  done
}
```

## Integration with Media Curator Framework

### Source Plan Generation

```bash
# Generate source plan for /acquire command
generate_archive_source_plan() {
  local collection="$1"
  local output_file="$2"
  local format="${3:-Flac}"

  # Get collection items
  local items=$(get_collection_items "$collection" 100)

  # Build YAML plan
  cat > "$output_file" <<EOF
source_plan:
  id: archive-$(date +%Y%m%d-%H%M%S)
  source: archive.org
  collection: $collection
  format: $format
  created_at: $(date -Iseconds)

sources:
EOF

  while IFS= read -r identifier; do
    # Get item metadata
    local metadata=$(curl -s "https://archive.org/metadata/$identifier")
    local title=$(echo "$metadata" | jq -r '.metadata.title')
    local creator=$(echo "$metadata" | jq -r '.metadata.creator')
    local date=$(echo "$metadata" | jq -r '.metadata.date')

    cat >> "$output_file" <<EOF
  - identifier: $identifier
    title: "$title"
    creator: "$creator"
    date: "$date"
    url: "https://archive.org/details/$identifier"
    format: $format
EOF

  done <<< "$items"

  echo "Source plan generated: $output_file"
}

# Usage with /acquire
# generate_archive_source_plan "GratefulDead" ".curator/sources/gd-plan.yaml" "Flac"
# /acquire --plan .curator/sources/gd-plan.yaml
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Download fails immediately** | Invalid identifier | Verify identifier on archive.org website |
| **Slow download speeds** | Network throttling | Use `--limit-rate` with wget |
| **Incomplete files** | Connection timeout | Use `wget -c` to resume |
| **Missing files** | Format not available | Check available formats with metadata API |
| **Checksum mismatch** | Corrupted download | Delete and re-download |
| **Rate limiting** | Too many requests | Increase wait time between downloads |

### Debug Mode

```bash
# Enable verbose output for troubleshooting
export CURATOR_DEBUG=1

download_item_debug() {
  local identifier="$1"
  local output_dir="$2"

  if [[ "$CURATOR_DEBUG" == "1" ]]; then
    set -x  # Enable bash tracing
  fi

  # Get metadata with verbose curl
  curl -v "https://archive.org/metadata/$identifier" 2>&1 | tee "$output_dir/.curator/metadata-debug.log"

  # Download with verbose wget
  wget --verbose \
       --debug \
       "https://archive.org/download/$identifier/" \
       2>&1 | tee "$output_dir/.curator/download-debug.log"

  set +x
}
```

## Performance Optimization

### Parallel Download Tuning

```bash
# Optimal concurrent downloads based on connection speed
determine_optimal_parallelism() {
  local speed_mbps="$1"

  if [[ $speed_mbps -lt 10 ]]; then
    echo 2  # Slow connection
  elif [[ $speed_mbps -lt 50 ]]; then
    echo 3  # Medium connection
  elif [[ $speed_mbps -lt 100 ]]; then
    echo 5  # Fast connection
  else
    echo 8  # Very fast connection
  fi
}

# Test connection speed
test_connection_speed() {
  # Download test file and measure speed
  local test_file="https://archive.org/download/test_item/test.mp3"
  local start_time=$(date +%s)

  wget -q -O /tmp/speed-test.tmp "$test_file"

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  local size=$(stat -c%s /tmp/speed-test.tmp 2>/dev/null || stat -f%z /tmp/speed-test.tmp)
  local speed_mbps=$(( (size * 8) / (duration * 1000000) ))

  rm /tmp/speed-test.tmp

  echo "$speed_mbps"
}
```

### Caching Strategy

```bash
# Cache metadata to reduce API calls
cache_metadata() {
  local identifier="$1"
  local cache_dir=".curator/cache/metadata"
  local cache_file="$cache_dir/$identifier.json"

  mkdir -p "$cache_dir"

  # Check cache age
  if [[ -f "$cache_file" ]]; then
    local cache_age=$(( $(date +%s) - $(stat -c%Y "$cache_file" 2>/dev/null || stat -f%m "$cache_file") ))

    # Cache valid for 7 days
    if [[ $cache_age -lt 604800 ]]; then
      cat "$cache_file"
      return 0
    fi
  fi

  # Fetch and cache
  curl -s "https://archive.org/metadata/$identifier" | tee "$cache_file"
}
```

## Summary

Archive Acquisition skill provides:

- **Discovery**: Search API patterns for finding content
- **Quality Selection**: Automatic best-format selection (prefer FLAC, accept MP3 320K)
- **Bulk Download**: Recursive wget and parallel download patterns
- **Verification**: Checksum validation and integrity checks
- **Collection Management**: Indexing, deduplication, incremental sync
- **Integration**: Source plan generation for `/acquire` command
- **Performance**: Parallel tuning, caching, rate limiting

Use this skill whenever working with Internet Archive content in the Media Curator framework.
