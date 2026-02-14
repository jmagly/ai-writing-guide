---
description: Apply metadata tags, embed artwork, and organize media files with consistent naming
category: media-curator
argument-hint: <collection_path> [--artist <name>] [--dry-run] [--artwork-dir <path>] [--force]
allowed-tools: Bash, Read, Write, Glob, Grep
model: sonnet
---

# /tag-collection

Apply metadata tags, embed artwork, and organize media files with consistent naming conventions.

## Purpose

Automate the metadata curation workflow for audio and video collections:

1. Scan files in a directory
2. Look up canonical metadata from MusicBrainz
3. Apply tags using opustags (Opus) or ffmpeg (MP4/MP3)
4. Embed cover artwork
5. Rename files to follow naming conventions
6. Organize into proper directory structures

## Parameters

### Required

- `<collection_path>`: Path to directory containing media files to process

### Optional

- `--artist <name>`: Filter to specific artist (speeds up processing)
- `--dry-run`: Show what would be done without making changes
- `--artwork-dir <path>`: Path to canonical artwork directory (default: `./artwork`)
- `--force`: Overwrite existing tags and files without prompting
- `--skip-artwork`: Skip artwork embedding (metadata only)
- `--skip-rename`: Apply tags but don't rename files
- `--skip-organize`: Apply tags and rename but don't move files

## Workflow

### 1. Scan Files

```bash
# Find all supported media files
opus_files=$(find "$collection_path" -type f -name "*.opus")
mp4_files=$(find "$collection_path" -type f -name "*.mp4")
mp3_files=$(find "$collection_path" -type f -name "*.mp3")
```

### 2. Parse Filenames

Extract artist, title, album from existing filenames using common patterns:

- `Artist - Title.ext`
- `Artist - Album - Track# - Title.ext`
- `Track# - Title.ext` (when artist is provided via --artist)

```bash
# Example parsing
filename="Joni Mitchell - Both Sides Now.opus"

artist=$(echo "$filename" | sed -E 's/^([^-]+) - .*/\1/' | xargs)
title=$(echo "$filename" | sed -E 's/^[^-]+ - ([^.]+)\..*/\1/' | xargs)
```

### 3. Lookup Metadata

Query MusicBrainz API for canonical metadata:

```bash
# URL-encode artist and title
artist_encoded=$(echo "$artist" | jq -sRr @uri)
title_encoded=$(echo "$title" | jq -sRr @uri)

# Query API
mbdata=$(curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:${artist_encoded}%20AND%20recording:${title_encoded}&fmt=json" \
  -H "User-Agent: MediaCurator/1.0")

# Extract metadata
album=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].title')
year=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].date[:4]')
tracknumber=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].media[0].track-offset + 1')
genre=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].release-group.primary-type')

# Rate limit: 1 request per second
sleep 1
```

### 4. Fetch Artwork

Download cover artwork from MusicBrainz Cover Art Archive:

```bash
# Get release MBID
mbid=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].id')

# Download front cover
curl -s "https://coverartarchive.org/release/${mbid}/front" -o "/tmp/cover-${mbid}.jpg"

# Fallback to fanart.tv if CAA unavailable
if [ ! -f "/tmp/cover-${mbid}.jpg" ]; then
  curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}" | \
    jq -r '.albums."'"$mbid"'".albumcover[0].url' | \
    xargs curl -s -o "/tmp/cover-${mbid}.jpg"
fi
```

### 5. Apply Tags

Use appropriate tool based on file format:

**Opus Files (opustags)**:
```bash
opustags "$file" \
  --set "TITLE=$title" \
  --set "ARTIST=$artist" \
  --set "ALBUM=$album" \
  --set "ALBUMARTIST=$artist" \
  --set "TRACKNUMBER=$tracknumber" \
  --set "DATE=$year" \
  --set "GENRE=$genre" \
  --set-cover "/tmp/cover-${mbid}.jpg" \
  -o "${file}.tagged"

mv "${file}.tagged" "$file"
```

**MP4 Files (ffmpeg)**:
```bash
ffmpeg -i "$file" -i "/tmp/cover-${mbid}.jpg" \
  -map 0 -map 1 -c copy \
  -disposition:v:1 attached_pic \
  -metadata title="$title" \
  -metadata artist="$artist" \
  -metadata album="$album" \
  -metadata date="$year" \
  -metadata genre="$genre" \
  "${file}.tagged.mp4"

mv "${file}.tagged.mp4" "$file"
```

**MP3 Files (ffmpeg)**:
```bash
ffmpeg -i "$file" -i "/tmp/cover-${mbid}.jpg" \
  -map 0 -map 1 -c copy \
  -id3v2_version 3 \
  -metadata title="$title" \
  -metadata artist="$artist" \
  -metadata album="$album" \
  -metadata date="$year" \
  -metadata genre="$genre" \
  -metadata:s:v title="Album cover" \
  -metadata:s:v comment="Cover (front)" \
  "${file}.tagged.mp3"

mv "${file}.tagged.mp3" "$file"
```

### 6. Rename Files

Apply naming convention based on file type:

**Audio Files**: `{Artist}/{Album}/{Track#} - {Title}.{ext}`

```bash
# Construct new filename
new_filename=$(printf "%02d - %s.opus" "$tracknumber" "$title")
new_path="${artist}/${album}/${new_filename}"

# Show rename operation
echo "RENAME: $file -> $new_path"

# Execute if not dry-run
if [ "$dry_run" != "true" ]; then
  mkdir -p "$(dirname "$new_path")"
  mv "$file" "$new_path"
fi
```

**Video Files**: `{Artist}/{Collection}/{Title} [{Quality}].{ext}`

```bash
# Detect video quality
quality=$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 \
  "$file")

quality_label="${quality}p"

# Construct new filename
new_filename="${title} [${quality_label}].mp4"
new_path="${artist}/${collection}/${new_filename}"

echo "RENAME: $file -> $new_path"

if [ "$dry_run" != "true" ]; then
  mkdir -p "$(dirname "$new_path")"
  mv "$file" "$new_path"
fi
```

### 7. Organize Files

Move files into directory structure if not already done during rename:

```bash
# Ensure artist directory exists
mkdir -p "$artist"

# Move album directories
if [ -d "$album" ]; then
  mv "$album" "$artist/"
fi
```

### 8. Report Changes

Generate summary of operations:

```bash
echo "=== Tagging Summary ==="
echo "Files processed: $file_count"
echo "Tags updated: $tags_updated"
echo "Artwork embedded: $artwork_count"
echo "Files renamed: $renamed_count"
echo "Files moved: $moved_count"

if [ "$dry_run" = "true" ]; then
  echo ""
  echo "DRY RUN: No changes were made. Run without --dry-run to apply changes."
fi
```

## Dry-Run Mode

Use `--dry-run` to preview operations without making changes:

```bash
/tag-collection ~/Music/Joni\ Mitchell --dry-run
```

Output shows what would be done:

```
SCAN: Found 47 Opus files, 12 MP4 files
LOOKUP: Joni Mitchell - Both Sides Now
  -> Album: Clouds (1969)
  -> Track: 12/14
ARTWORK: https://coverartarchive.org/release/a1b2c3d4.../front
TAG: Set TITLE, ARTIST, ALBUM, TRACKNUMBER, DATE, GENRE
EMBED: cover-a1b2c3d4.jpg
RENAME: Joni Mitchell - Both Sides Now.opus -> Joni Mitchell/Clouds/12 - Both Sides Now.opus

DRY RUN: No changes were made. Run without --dry-run to apply changes.
```

## Examples

### Basic Usage

Tag all files in a directory:

```bash
/tag-collection ~/Music/Unsorted
```

### Filter by Artist

Process only files for a specific artist:

```bash
/tag-collection ~/Music/Unsorted --artist "Joni Mitchell"
```

### Preview Changes

See what would be done without making changes:

```bash
/tag-collection ~/Music/Unsorted --dry-run
```

### Skip Artwork

Apply metadata tags but skip artwork embedding (faster):

```bash
/tag-collection ~/Music/Unsorted --skip-artwork
```

### Custom Artwork Directory

Use artwork from a specific directory:

```bash
/tag-collection ~/Music/Unsorted --artwork-dir ~/Media/artwork
```

### Metadata Only (No Rename/Move)

Update tags but leave files in place with original names:

```bash
/tag-collection ~/Music/Unsorted --skip-rename --skip-organize
```

### Force Overwrite

Overwrite existing tags without prompting:

```bash
/tag-collection ~/Music/Joni\ Mitchell --force
```

## Interactive Prompts

When not using `--force`, the command prompts before overwriting:

```
File already has complete metadata:
  Title: Both Sides Now
  Artist: Joni Mitchell
  Album: Clouds
  Year: 1969

Overwrite existing tags? [y/N]:
```

## Error Handling

### MusicBrainz Lookup Failure

If MusicBrainz API returns no results:

```
WARNING: No MusicBrainz match for "Unknown Artist - Unknown Track"
SKIP: Will not tag this file
```

Manual intervention required - add to skip list or provide metadata manually.

### Artwork Download Failure

If cover art is unavailable:

```
WARNING: No cover art found for album "Rare Demos"
CONTINUE: Tags will be applied without artwork
```

File is still tagged, just without embedded artwork.

### Rate Limit Exceeded

If MusicBrainz rate limit is exceeded:

```
ERROR: MusicBrainz rate limit exceeded (503 Service Unavailable)
PAUSE: Waiting 60 seconds before retry...
```

Command automatically waits and retries.

### File Permission Errors

If file cannot be written:

```
ERROR: Permission denied writing to "file.opus"
SKIP: File will not be modified
```

Check file permissions and ownership.

## Quality Checks

After completion, verify:

1. **Tags Applied**: Check random files with `opustags file.opus` or `ffprobe -show_format file.mp4`
2. **Artwork Embedded**: Open files in media player, verify artwork displays
3. **Filenames Correct**: Check naming convention is followed
4. **Organization**: Verify directory structure matches expectations
5. **No Duplicates**: Ensure no files were duplicated during moves

## Performance

Typical processing speeds:

- **Metadata lookup**: ~1 second per file (MusicBrainz rate limit)
- **Tagging (opustags)**: <0.1 seconds per file
- **Tagging (ffmpeg)**: 1-3 seconds per file (re-encodes)
- **Artwork download**: 1-2 seconds per album
- **Total**: ~100 files in 2-3 minutes

For large collections (1000+ files), expect 20-30 minutes.

## Troubleshooting

### "opustags: command not found"

Install opustags:

```bash
# macOS
brew install opustags

# Ubuntu/Debian
sudo apt install opustags

# Arch
sudo pacman -S opustags
```

### "ffmpeg: command not found"

Install ffmpeg:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

### MusicBrainz Timeout

Increase timeout in curl command:

```bash
curl --max-time 30 -s "https://musicbrainz.org/ws/2/recording/..."
```

### Artwork Not Embedding

Verify image format and size:

```bash
# Check image file
file cover.jpg

# Resize if too large
convert cover.jpg -resize 1200x1200 cover-resized.jpg
```

## See Also

- `/organize-media` - Organize files without metadata changes
- `/extract-artwork` - Extract artwork from existing files
- Skill: @metadata-tagging
- Skill: @cover-art-embedding
- Agent: @Metadata Curator
