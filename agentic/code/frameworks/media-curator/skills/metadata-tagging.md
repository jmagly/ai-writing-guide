---
name: Metadata Tagging
description: opustags and ffmpeg patterns for applying metadata to audio and video files
category: media-curator
---

# Metadata Tagging Skill

Concrete patterns for applying metadata tags to audio and video files using opustags (Opus) and ffmpeg (MP4/MP3/FLAC).

## opustags (Opus Files)

### Install

```bash
# macOS
brew install opustags

# Ubuntu/Debian
sudo apt install opustags

# Arch
sudo pacman -S opustags

# From source
git clone https://github.com/fmang/opustags.git
cd opustags
cmake -S . -B build
cmake --build build
sudo cmake --install build
```

### Set Basic Tags

```bash
# Set all common tags at once
opustags input.opus \
  --set "TITLE=Both Sides Now" \
  --set "ARTIST=Joni Mitchell" \
  --set "ALBUM=Clouds" \
  --set "ALBUMARTIST=Joni Mitchell" \
  --set "TRACKNUMBER=12" \
  --set "DATE=1969" \
  --set "GENRE=Folk" \
  -o output.opus
```

### Set Individual Tags

```bash
# Title
opustags input.opus --set "TITLE=Song Title" -o output.opus

# Artist
opustags input.opus --set "ARTIST=Artist Name" -o output.opus

# Album
opustags input.opus --set "ALBUM=Album Name" -o output.opus

# Album Artist (for compilations)
opustags input.opus --set "ALBUMARTIST=Various Artists" -o output.opus

# Track number
opustags input.opus --set "TRACKNUMBER=3" -o output.opus

# Track number with total
opustags input.opus --set "TRACKNUMBER=3/12" -o output.opus

# Year
opustags input.opus --set "DATE=1969" -o output.opus

# Genre
opustags input.opus --set "GENRE=Folk Rock" -o output.opus

# Comment
opustags input.opus --set "COMMENT=Live at Carnegie Hall" -o output.opus
```

### In-Place Updates

```bash
# Modify file in place (overwrites original)
opustags -i input.opus --set "TITLE=New Title"

# Multiple tags in-place
opustags -i input.opus \
  --set "TITLE=New Title" \
  --set "ARTIST=New Artist"
```

### Read Tags

```bash
# Display all tags
opustags input.opus

# Save tags to file
opustags input.opus > tags.txt

# Check if specific tag exists
opustags input.opus | grep "TITLE="
```

### Delete Tags

```bash
# Delete specific tag
opustags input.opus --delete "COMMENT" -o output.opus

# Delete all tags (keep only vendor string)
opustags input.opus --delete-all -o output.opus
```

### Set Cover Art

```bash
# Embed cover from JPEG file
opustags input.opus --set-cover cover.jpg -o output.opus

# In-place cover embedding
opustags -i input.opus --set-cover cover.jpg

# Replace existing cover
opustags -i input.opus --set-cover new-cover.jpg
```

### Batch Operations

```bash
# Set same tags on all files in directory
for file in *.opus; do
  opustags -i "$file" \
    --set "ALBUMARTIST=Joni Mitchell" \
    --set "ALBUM=Blue" \
    --set "DATE=1971"
done

# Embed same cover into all files
for file in *.opus; do
  opustags -i "$file" --set-cover ../cover.jpg
done

# Set track numbers sequentially
track=1
for file in *.opus; do
  opustags -i "$file" --set "TRACKNUMBER=$track"
  ((track++))
done
```

### Extract Cover Art

```bash
# Extract cover to file (requires parsing output)
opustags input.opus | grep -A 1000 "METADATA_BLOCK_PICTURE" > cover-encoded.txt

# Note: opustags does not have built-in cover extraction
# Use ffmpeg for this instead (see below)
```

## ffmpeg (MP4/MP3/FLAC)

### Set MP4 Metadata

```bash
# Set all common tags
ffmpeg -i input.mp4 -c copy \
  -metadata title="Both Sides Now" \
  -metadata artist="Joni Mitchell" \
  -metadata album="Live at Isle of Wight 1970" \
  -metadata date="1970" \
  -metadata genre="Folk" \
  -metadata comment="Restored from VHS" \
  output.mp4
```

### Set MP3 Metadata (ID3v2.3)

```bash
# Set tags with ID3v2.3 for compatibility
ffmpeg -i input.mp3 -c copy \
  -id3v2_version 3 \
  -metadata title="Both Sides Now" \
  -metadata artist="Joni Mitchell" \
  -metadata album="Clouds" \
  -metadata date="1969" \
  -metadata track="12/14" \
  -metadata genre="Folk" \
  output.mp3
```

### Set FLAC Metadata (Vorbis Comments)

```bash
# FLAC uses Vorbis comments like Opus
ffmpeg -i input.flac -c copy \
  -metadata TITLE="Both Sides Now" \
  -metadata ARTIST="Joni Mitchell" \
  -metadata ALBUM="Clouds" \
  -metadata DATE="1969" \
  -metadata TRACKNUMBER="12" \
  output.flac
```

### Embed Cover Art into MP4

```bash
# Add cover as attached picture
ffmpeg -i input.mp4 -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -disposition:v:1 attached_pic \
  output.mp4
```

### Embed Cover Art into MP3

```bash
# Add cover with proper ID3v2.3 tags
ffmpeg -i input.mp3 -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -id3v2_version 3 \
  -metadata:s:v title="Album cover" \
  -metadata:s:v comment="Cover (front)" \
  output.mp3
```

### Embed Cover Art into FLAC

```bash
# Add cover to FLAC file
ffmpeg -i input.flac -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -disposition:v:0 attached_pic \
  output.flac
```

### Extract Cover Art from Any File

```bash
# Extract first attached picture
ffmpeg -i input.mp3 -an -vcodec copy cover.jpg

# Extract from MP4
ffmpeg -i input.mp4 -map 0:v -map -0:V -c copy cover.jpg

# Extract and convert to PNG
ffmpeg -i input.flac -an -vcodec png cover.png
```

### Read Metadata

```bash
# Show all metadata
ffprobe -v quiet -show_format -show_entries format_tags input.mp4

# Show only specific tags
ffprobe -v quiet -show_entries format_tags=title,artist,album input.mp3

# JSON output for parsing
ffprobe -v quiet -print_format json -show_format input.mp4
```

### Batch MP4 Tagging

```bash
# Set album and year on all MP4 files
for file in *.mp4; do
  ffmpeg -i "$file" -c copy \
    -metadata album="Live Performances 1970" \
    -metadata date="1970" \
    "${file%.mp4}-tagged.mp4"
  mv "${file%.mp4}-tagged.mp4" "$file"
done
```

## MusicBrainz Lookup

### Recording Search by Artist and Title

```bash
# Basic search
curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:Joni%20Mitchell%20AND%20recording:Both%20Sides%20Now&fmt=json" \
  -H "User-Agent: MediaCurator/1.0 (contact@example.com)"

# URL-encode query parameters
artist="Joni Mitchell"
title="Both Sides Now"
artist_enc=$(echo "$artist" | jq -sRr @uri)
title_enc=$(echo "$title" | jq -sRr @uri)

curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:${artist_enc}%20AND%20recording:${title_enc}&fmt=json" \
  -H "User-Agent: MediaCurator/1.0"
```

### Release (Album) Search

```bash
# Search for release by artist and album
curl -s "https://musicbrainz.org/ws/2/release/?query=artist:Joni%20Mitchell%20AND%20release:Blue&fmt=json" \
  -H "User-Agent: MediaCurator/1.0"

# Include release group info
curl -s "https://musicbrainz.org/ws/2/release/?query=artist:Joni%20Mitchell%20AND%20release:Blue&inc=release-groups&fmt=json" \
  -H "User-Agent: MediaCurator/1.0"
```

### Extract Metadata from JSON Response

```bash
# Get release from recording search
mbdata=$(curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:Joni%20Mitchell%20AND%20recording:Both%20Sides%20Now&fmt=json" -H "User-Agent: MediaCurator/1.0")

# Extract fields with jq
album=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].title')
year=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].date[:4]')
mbid=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].id')
track_num=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].media[0].tracks | map(select(.title == "Both Sides Now"))[0].position')

echo "Album: $album"
echo "Year: $year"
echo "MBID: $mbid"
echo "Track: $track_num"
```

### Rate Limiting

MusicBrainz allows 1 request per second:

```bash
# Process multiple files with rate limiting
for file in *.opus; do
  # Extract metadata from filename
  artist=$(echo "$file" | sed -E 's/^([^-]+) - .*/\1/' | xargs)
  title=$(echo "$file" | sed -E 's/^[^-]+ - ([^.]+)\..*/\1/' | xargs)

  # Query MusicBrainz
  artist_enc=$(echo "$artist" | jq -sRr @uri)
  title_enc=$(echo "$title" | jq -sRr @uri)
  mbdata=$(curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:${artist_enc}%20AND%20recording:${title_enc}&fmt=json" \
    -H "User-Agent: MediaCurator/1.0")

  # Extract and apply metadata
  album=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].title')
  year=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].date[:4]')

  opustags -i "$file" \
    --set "ALBUM=$album" \
    --set "DATE=$year"

  # Rate limit: wait 1 second
  sleep 1
done
```

## Filename Parsing Patterns

### Common Patterns

```bash
# Pattern: "Artist - Title.ext"
artist=$(echo "$filename" | sed -E 's/^([^-]+) - .*/\1/' | xargs)
title=$(echo "$filename" | sed -E 's/^[^-]+ - ([^.]+)\..*/\1/' | xargs)

# Pattern: "Artist - Album - Track# - Title.ext"
artist=$(echo "$filename" | sed -E 's/^([^-]+) - .*/\1/' | xargs)
album=$(echo "$filename" | sed -E 's/^[^-]+ - ([^-]+) - .*/\1/' | xargs)
track=$(echo "$filename" | sed -E 's/^[^-]+ - [^-]+ - ([0-9]+) - .*/\1/' | xargs)
title=$(echo "$filename" | sed -E 's/^[^-]+ - [^-]+ - [^-]+ - ([^.]+)\..*/\1/' | xargs)

# Pattern: "Track# - Title.ext" (when artist known)
track=$(echo "$filename" | sed -E 's/^([0-9]+) - .*/\1/' | xargs)
title=$(echo "$filename" | sed -E 's/^[0-9]+ - ([^.]+)\..*/\1/' | xargs)

# Pattern: "Title [Quality].ext" (video)
title=$(echo "$filename" | sed -E 's/^(.+) \[[^]]+\]\..*/\1/' | xargs)
quality=$(echo "$filename" | sed -E 's/.*\[([^]]+)\]\..*/\1/' | xargs)
```

### Clean Extracted Strings

```bash
# Remove leading/trailing whitespace
artist=$(echo "$artist" | xargs)

# Remove underscores, convert to spaces
title=$(echo "$title" | tr '_' ' ')

# Capitalize first letter of each word
title=$(echo "$title" | sed 's/\b\(.\)/\u\1/g')
```

## Complete Tagging Workflow

### Single File (Opus)

```bash
#!/bin/bash
file="$1"

# Extract metadata from filename
artist=$(echo "$file" | sed -E 's/^([^-]+) - .*/\1/' | xargs)
title=$(echo "$file" | sed -E 's/^[^-]+ - ([^.]+)\..*/\1/' | xargs)

# Query MusicBrainz
artist_enc=$(echo "$artist" | jq -sRr @uri)
title_enc=$(echo "$title" | jq -sRr @uri)
mbdata=$(curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:${artist_enc}%20AND%20recording:${title_enc}&fmt=json" \
  -H "User-Agent: MediaCurator/1.0")

# Extract metadata
album=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].title')
year=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].date[:4]')
mbid=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].id')
genre=$(echo "$mbdata" | jq -r '.recordings[0].releases[0]["release-group"]["primary-type"]')

# Download cover art
curl -s "https://coverartarchive.org/release/${mbid}/front" -o "/tmp/cover-${mbid}.jpg"

# Apply tags
opustags -i "$file" \
  --set "TITLE=$title" \
  --set "ARTIST=$artist" \
  --set "ALBUM=$album" \
  --set "ALBUMARTIST=$artist" \
  --set "DATE=$year" \
  --set "GENRE=$genre" \
  --set-cover "/tmp/cover-${mbid}.jpg"

echo "Tagged: $file"
```

### Batch Directory (MP4)

```bash
#!/bin/bash
dir="$1"
artist="$2"

# Process all MP4 files
for file in "$dir"/*.mp4; do
  # Extract title from filename
  title=$(basename "$file" .mp4)

  # Query MusicBrainz
  artist_enc=$(echo "$artist" | jq -sRr @uri)
  title_enc=$(echo "$title" | jq -sRr @uri)
  mbdata=$(curl -s "https://musicbrainz.org/ws/2/recording/?query=artist:${artist_enc}%20AND%20recording:${title_enc}&fmt=json" \
    -H "User-Agent: MediaCurator/1.0")

  # Extract metadata
  album=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].title')
  year=$(echo "$mbdata" | jq -r '.recordings[0].releases[0].date[:4]')

  # Apply tags
  ffmpeg -i "$file" -c copy \
    -metadata title="$title" \
    -metadata artist="$artist" \
    -metadata album="$album" \
    -metadata date="$year" \
    "${file%.mp4}-tagged.mp4"

  mv "${file%.mp4}-tagged.mp4" "$file"

  # Rate limit
  sleep 1
done
```

## Troubleshooting

### opustags Not Found

```bash
# Check if installed
which opustags

# Install if missing
brew install opustags  # macOS
sudo apt install opustags  # Debian/Ubuntu
```

### Invalid UTF-8 in Tags

```bash
# Clean non-UTF-8 characters before setting
title=$(echo "$title" | iconv -f utf-8 -t utf-8 -c)
opustags -i "$file" --set "TITLE=$title"
```

### MusicBrainz No Results

```bash
# Broaden search (remove artist constraint)
curl -s "https://musicbrainz.org/ws/2/recording/?query=recording:${title_enc}&fmt=json" \
  -H "User-Agent: MediaCurator/1.0"

# Try fuzzy matching
curl -s "https://musicbrainz.org/ws/2/recording/?query=recording:${title_enc}~&fmt=json" \
  -H "User-Agent: MediaCurator/1.0"
```

### Rate Limit Exceeded

```bash
# Check for 503 response
if curl -s -I "https://musicbrainz.org/ws/2/recording/?query=..." | grep -q "503"; then
  echo "Rate limit exceeded, waiting 60 seconds..."
  sleep 60
fi
```

## See Also

- Command: `/tag-collection`
- Skill: `@cover-art-embedding`
- Agent: `@Metadata Curator`
- MusicBrainz API: https://musicbrainz.org/doc/MusicBrainz_API
- opustags documentation: https://github.com/fmang/opustags
