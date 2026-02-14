---
name: Cover Art Embedding
description: Patterns for finding, processing, and embedding cover artwork into media files
category: media-curator
---

# Cover Art Embedding Skill

Concrete patterns for finding high-quality cover artwork, processing it for optimal size and format, and embedding it into audio and video files.

## Artwork Sources

### MusicBrainz Cover Art Archive (Primary)

MusicBrainz Cover Art Archive (CAA) is the authoritative source for album artwork.

**Get Front Cover by Release MBID**:
```bash
# Download front cover for a release
curl -s "https://coverartarchive.org/release/{mbid}/front" -o cover.jpg

# Example with real MBID
curl -s "https://coverartarchive.org/release/5c004fe3-6e96-3f43-9a85-16e5be8805fa/front" -o blue-cover.jpg
```

**Check if Cover Exists**:
```bash
# HEAD request to check without downloading
if curl -s -I "https://coverartarchive.org/release/${mbid}/front" | grep -q "200 OK"; then
  echo "Cover available"
else
  echo "No cover found"
fi
```

**Get All Available Images**:
```bash
# Get metadata for all images
curl -s "https://coverartarchive.org/release/${mbid}" | jq .

# Extract URLs for all front covers
curl -s "https://coverartarchive.org/release/${mbid}" | \
  jq -r '.images[] | select(.front == true) | .image'

# Download highest resolution front cover
url=$(curl -s "https://coverartarchive.org/release/${mbid}" | \
  jq -r '.images[] | select(.front == true) | .image' | head -1)
curl -s "$url" -o cover.jpg
```

### fanart.tv API

fanart.tv provides high-quality artist images, album covers, and logos.

**Get Artist Images**:
```bash
# Requires API key from https://fanart.tv/get-an-api-key/
FANART_API_KEY="your-api-key"

# Get all artist artwork
curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}"

# Extract album cover URLs
curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}" | \
  jq -r '.albums."'"$album_mbid"'".albumcover[0].url'

# Extract artist background
curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}" | \
  jq -r '.artistbackground[0].url'

# Extract artist logo
curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}" | \
  jq -r '.hdmusiclogo[0].url'
```

**Download Artwork**:
```bash
# Download album cover
url=$(curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}" | \
  jq -r '.albums."'"$album_mbid"'".albumcover[0].url')
curl -s "$url" -o cover.jpg
```

### Video Thumbnail Extraction

Extract cover artwork from video frames.

**Using yt-dlp** (if video was downloaded with thumbnail):
```bash
# Download video with thumbnail
yt-dlp --write-thumbnail --convert-thumbnails jpg "https://youtube.com/watch?v=..."

# Result: video.jpg alongside video.mp4
```

**Using ffmpeg** (extract from video):
```bash
# Extract single frame at specific time
ffmpeg -i input.mp4 -ss 00:00:10 -frames:v 1 -q:v 2 thumbnail.jpg

# Extract I-frame (best quality)
ffmpeg -i input.mp4 -vf "select=eq(pict_type\,I)" -frames:v 1 -q:v 2 thumbnail.jpg

# Extract frame at 25% into video
duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4)
timestamp=$(echo "$duration * 0.25" | bc)
ffmpeg -i input.mp4 -ss "$timestamp" -frames:v 1 -q:v 2 thumbnail.jpg

# Extract highest quality frame from first minute
ffmpeg -i input.mp4 -t 60 -vf "select=eq(pict_type\,I)" -vsync vfr -q:v 1 frames-%03d.jpg
# Then manually select best frame
```

### Local Artwork Files

Scan for existing artwork in standard locations:

```bash
# Check for common filenames in album directory
for name in cover.jpg Cover.jpg folder.jpg Folder.jpg albumart.jpg AlbumArt.jpg; do
  if [ -f "$name" ]; then
    echo "Found: $name"
    break
  fi
done

# Search parent directory
if [ -f "../cover.jpg" ]; then
  cp "../cover.jpg" .
fi

# Find largest image file (likely the cover)
largest=$(find . -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.png" \) -exec ls -s {} \; | \
  sort -rn | head -1 | awk '{print $2}')
echo "Largest image: $largest"
```

## Image Processing

### Resize for Mobile Optimization

Reduce image size for faster loading and smaller file sizes:

```bash
# Install ImageMagick
brew install imagemagick  # macOS
sudo apt install imagemagick  # Debian/Ubuntu

# Resize to 1200x1200 max (preserves aspect ratio)
convert input.jpg -resize 1200x1200 output.jpg

# Resize and optimize quality (85% JPEG quality)
convert input.jpg -resize 1200x1200 -quality 85 output.jpg

# Create thumbnail (300x300)
convert input.jpg -resize 300x300 thumbnail.jpg

# Batch resize all images in directory
for img in *.jpg; do
  convert "$img" -resize 1200x1200 -quality 85 "${img%.jpg}-resized.jpg"
done
```

### Format Conversion

Convert between image formats:

```bash
# PNG to JPEG
convert input.png output.jpg

# WebP to JPEG
convert input.webp output.jpg

# JPEG to PNG (lossless)
convert input.jpg output.png

# Batch convert all PNG to JPEG
for img in *.png; do
  convert "$img" "${img%.png}.jpg"
done
```

### Crop to Square

Crop non-square images to square aspect ratio:

```bash
# Center crop to square
convert input.jpg -gravity center -crop 1:1 +repage output.jpg

# Crop from top-left
convert input.jpg -crop 1200x1200+0+0 +repage output.jpg

# Smart crop (removes boring edges)
convert input.jpg -define trim:percent-background=0% -trim +repage -resize 1200x1200 output.jpg
```

### Remove Metadata (Privacy)

Strip EXIF data before embedding:

```bash
# Remove all metadata
convert input.jpg -strip output.jpg

# Or use exiftool
exiftool -all= input.jpg

# Batch strip metadata
for img in *.jpg; do
  convert "$img" -strip "${img%.jpg}-clean.jpg"
done
```

## Embedding Artwork

### Opus Files (opustags)

```bash
# Embed cover art from JPEG file
opustags input.opus --set-cover cover.jpg -o output.opus

# In-place embedding
opustags -i input.opus --set-cover cover.jpg

# Verify embedding
opustags input.opus | grep -i picture
```

### MP4 Files (ffmpeg)

```bash
# Embed cover as attached picture
ffmpeg -i input.mp4 -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -disposition:v:1 attached_pic \
  output.mp4

# Embed with metadata
ffmpeg -i input.mp4 -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -disposition:v:1 attached_pic \
  -metadata:s:v:1 title="Album cover" \
  -metadata:s:v:1 comment="Cover (front)" \
  output.mp4

# Verify embedding
ffprobe -v error -select_streams v -show_entries stream=codec_name,codec_type,disposition input.mp4
```

### MP3 Files (ffmpeg)

```bash
# Embed cover with ID3v2.3
ffmpeg -i input.mp3 -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -id3v2_version 3 \
  -metadata:s:v title="Album cover" \
  -metadata:s:v comment="Cover (front)" \
  output.mp3

# Verify embedding
ffmpeg -i input.mp3 -an -vcodec copy test-extracted-cover.jpg
```

### FLAC Files (ffmpeg)

```bash
# Embed cover into FLAC
ffmpeg -i input.flac -i cover.jpg \
  -map 0 -map 1 \
  -c copy \
  -disposition:v:0 attached_pic \
  output.flac

# Using metaflac (alternative)
metaflac --import-picture-from=cover.jpg input.flac
```

## Batch Embedding

### Embed Same Cover into All Files

```bash
# Opus files in directory
for file in *.opus; do
  opustags -i "$file" --set-cover cover.jpg
  echo "Embedded: $file"
done

# MP3 files in directory
for file in *.mp3; do
  ffmpeg -i "$file" -i cover.jpg \
    -map 0 -map 1 -c copy \
    -id3v2_version 3 \
    -metadata:s:v title="Album cover" \
    "${file%.mp3}-covered.mp3"
  mv "${file%.mp3}-covered.mp3" "$file"
done
```

### Embed Different Covers per Album

```bash
# Process album directories
for album_dir in */; do
  # Find cover in album directory
  cover=$(find "$album_dir" -maxdepth 1 -iname "cover.jpg" | head -1)

  if [ -n "$cover" ]; then
    # Embed into all Opus files in this album
    for file in "$album_dir"/*.opus; do
      opustags -i "$file" --set-cover "$cover"
    done
    echo "Processed: $album_dir"
  else
    echo "No cover found: $album_dir"
  fi
done
```

### Download and Embed from MusicBrainz

```bash
#!/bin/bash
# Process all Opus files, download covers, embed

for file in *.opus; do
  # Extract artist and album from tags
  artist=$(opustags "$file" | grep "ARTIST=" | cut -d= -f2)
  album=$(opustags "$file" | grep "ALBUM=" | cut -d= -f2)

  # Query MusicBrainz for release MBID
  artist_enc=$(echo "$artist" | jq -sRr @uri)
  album_enc=$(echo "$album" | jq -sRr @uri)
  mbdata=$(curl -s "https://musicbrainz.org/ws/2/release/?query=artist:${artist_enc}%20AND%20release:${album_enc}&fmt=json" \
    -H "User-Agent: MediaCurator/1.0")

  mbid=$(echo "$mbdata" | jq -r '.releases[0].id')

  # Download cover
  if curl -s "https://coverartarchive.org/release/${mbid}/front" -o "/tmp/cover-${mbid}.jpg"; then
    # Embed cover
    opustags -i "$file" --set-cover "/tmp/cover-${mbid}.jpg"
    echo "Embedded cover: $file"
  else
    echo "No cover found: $file"
  fi

  # Rate limit
  sleep 1
done
```

## Canonical Artwork Directory

From field testing: use a single `artwork/` directory for all artwork files, not scattered copies.

### Directory Structure

```
artwork/
├── albums/
│   ├── blue.jpg
│   ├── court-and-spark.jpg
│   ├── hejira.jpg
│   └── clouds.jpg
├── artists/
│   ├── joni-mitchell-1970.jpg
│   ├── joni-mitchell-1976.jpg
│   └── joni-mitchell-2000.jpg
├── live/
│   ├── isle-of-wight-1970.jpg
│   └── carnegie-hall-1969.jpg
├── logos/
│   └── joni-mitchell-logo.png
├── promotional/
│   ├── blue-era-promo.jpg
│   └── court-and-spark-promo.jpg
└── ATTRIBUTION.md
```

### Populate Artwork Directory

```bash
# Create structure
mkdir -p artwork/{albums,artists,live,logos,promotional}

# Download album covers
cd artwork/albums
curl -s "https://coverartarchive.org/release/{mbid}/front" -o blue.jpg
curl -s "https://coverartarchive.org/release/{mbid}/front" -o court-and-spark.jpg

# Download artist images from fanart.tv
cd ../artists
curl -s "https://fanart.tv/..." -o joni-mitchell-1970.jpg

# Extract video thumbnails
cd ../live
ffmpeg -i ../../video/isle-of-wight-1970.mp4 -ss 00:01:30 -frames:v 1 -q:v 2 isle-of-wight-1970.jpg
```

### Embed from Canonical Directory

```bash
# Reference artwork by path
for file in music/Joni\ Mitchell/Blue/*.opus; do
  opustags -i "$file" --set-cover artwork/albums/blue.jpg
done

# Or create symlink in album directory
ln -s ../../artwork/albums/blue.jpg music/Joni\ Mitchell/Blue/cover.jpg
```

### ATTRIBUTION.md

Record source and rights for all artwork:

```markdown
# Artwork Attribution

## Albums

### blue.jpg
- Source: MusicBrainz Cover Art Archive
- URL: https://coverartarchive.org/release/5c004fe3-6e96-3f43-9a85-16e5be8805fa
- License: Public Domain
- Uploaded by: user123
- Date: 2015-03-20

### court-and-spark.jpg
- Source: fanart.tv
- URL: https://fanart.tv/music/...
- License: Fair Use
- Date: 2018-07-15

## Artists

### joni-mitchell-1970.jpg
- Source: Extracted from "Live at Isle of Wight 1970" video
- License: Fair Use
- Date: 2026-02-14

## Live

### isle-of-wight-1970.jpg
- Source: Video frame extraction (ffmpeg)
- Original video: Live at Isle of Wight 1970.mp4
- License: Fair Use
- Date: 2026-02-14
```

## Extract Embedded Artwork

### From Opus Files

```bash
# opustags does not support extraction, use ffmpeg
ffmpeg -i input.opus -an -vcodec copy cover.jpg
```

### From MP4 Files

```bash
# Extract first attached picture
ffmpeg -i input.mp4 -map 0:v -map -0:V -c copy cover.jpg

# Extract all video streams (including artwork)
ffmpeg -i input.mp4 -map 0:v -c copy "stream-%d.jpg"
```

### From MP3 Files

```bash
# Extract cover art
ffmpeg -i input.mp3 -an -vcodec copy cover.jpg

# Using id3v2 (alternative)
id3v2 -l input.mp3  # List frames
id3v2 --APIC input.mp3 > cover.jpg  # Extract
```

### From FLAC Files

```bash
# Extract using metaflac
metaflac --export-picture-to=cover.jpg input.flac

# Or ffmpeg
ffmpeg -i input.flac -an -vcodec copy cover.jpg
```

## Quality Checks

### Verify Artwork is Embedded

```bash
# Opus
opustags input.opus | grep -i picture

# MP4
ffprobe -v error -select_streams v -show_entries stream=disposition:stream_tags input.mp4

# MP3
ffprobe -v error -show_entries format_tags input.mp3 | grep -i picture

# Or extract and check file size
ffmpeg -i input.mp3 -an -vcodec copy test.jpg
ls -lh test.jpg  # Should be >50KB for quality cover
```

### Check Image Dimensions

```bash
# Using identify (ImageMagick)
identify cover.jpg

# Using ffprobe
ffprobe -v error -select_streams v:0 -show_entries stream=width,height cover.jpg
```

### Verify File Size

```bash
# Check cover file size
ls -lh cover.jpg

# Ideal: 100KB - 500KB
# Too small (<50KB): low quality
# Too large (>1MB): unnecessary bloat
```

## Troubleshooting

### Cover Not Displaying in Media Player

```bash
# Check if cover is actually embedded
ffprobe -v error -show_entries format_tags input.mp3

# Re-embed with correct disposition
ffmpeg -i input.mp4 -i cover.jpg -map 0 -map 1 -c copy \
  -disposition:v:1 attached_pic \
  output.mp4
```

### Image Format Not Supported

```bash
# Convert to JPEG
convert input.png output.jpg

# Re-embed converted image
opustags -i input.opus --set-cover output.jpg
```

### Image Too Large (Slow Loading)

```bash
# Resize and optimize
convert cover.jpg -resize 1200x1200 -quality 85 cover-optimized.jpg

# Re-embed optimized image
opustags -i input.opus --set-cover cover-optimized.jpg
```

### MusicBrainz Cover Not Available

```bash
# Try fanart.tv
curl -s "https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANART_API_KEY}" | \
  jq -r '.albums."'"$album_mbid"'".albumcover[0].url'

# Or Google Images (manual)
# Or extract from video if available
```

## Complete Workflow Example

```bash
#!/bin/bash
# Download cover from MusicBrainz, process, and embed

file="$1"

# Get album MBID from existing tags
album=$(opustags "$file" | grep "ALBUM=" | cut -d= -f2)
artist=$(opustags "$file" | grep "ARTIST=" | cut -d= -f2)

# Query MusicBrainz
artist_enc=$(echo "$artist" | jq -sRr @uri)
album_enc=$(echo "$album" | jq -sRr @uri)
mbdata=$(curl -s "https://musicbrainz.org/ws/2/release/?query=artist:${artist_enc}%20AND%20release:${album_enc}&fmt=json" \
  -H "User-Agent: MediaCurator/1.0")

mbid=$(echo "$mbdata" | jq -r '.releases[0].id')

# Download cover
cover_url="https://coverartarchive.org/release/${mbid}/front"
curl -s "$cover_url" -o "/tmp/cover-${mbid}.jpg"

# Process: resize, optimize, strip metadata
convert "/tmp/cover-${mbid}.jpg" \
  -resize 1200x1200 \
  -quality 85 \
  -strip \
  "/tmp/cover-${mbid}-processed.jpg"

# Embed into file
opustags -i "$file" --set-cover "/tmp/cover-${mbid}-processed.jpg"

# Save to canonical directory
artist_safe=$(echo "$artist" | tr '/' '-')
album_safe=$(echo "$album" | tr '/' '-')
mkdir -p "artwork/albums"
cp "/tmp/cover-${mbid}-processed.jpg" "artwork/albums/${artist_safe}-${album_safe}.jpg"

# Update ATTRIBUTION.md
cat >> artwork/ATTRIBUTION.md <<EOF

### ${artist_safe}-${album_safe}.jpg
- Source: MusicBrainz Cover Art Archive
- URL: ${cover_url}
- MBID: ${mbid}
- Date: $(date +%Y-%m-%d)
EOF

echo "Cover embedded: $file"
echo "Saved to: artwork/albums/${artist_safe}-${album_safe}.jpg"
```

## See Also

- Command: `/tag-collection`
- Skill: `@metadata-tagging`
- Agent: `@Metadata Curator`
- MusicBrainz CAA: https://coverartarchive.org/
- fanart.tv API: https://fanart.tv/api-docs/
- ImageMagick documentation: https://imagemagick.org/
