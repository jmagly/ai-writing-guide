---
name: YouTube Acquisition
description: yt-dlp patterns for acquiring content from YouTube and video platforms
category: media-curator
---

# YouTube Acquisition

Comprehensive yt-dlp command patterns for downloading video and audio content from YouTube, Vimeo, SoundCloud, and other supported platforms. Includes quality selection strategies, format filtering, the SABR 403 workaround, metadata extraction, and batch operations.

## Overview

**yt-dlp** is the primary tool for media acquisition from YouTube and 1000+ other sites. This skill documents proven patterns from production use, including workarounds for common issues like the SABR 403 error that affects format selection on newer videos.

**Key Capabilities**:
- Download best available quality (video + audio)
- Extract audio-only in multiple formats
- Handle playlists and channels
- Embed metadata and thumbnails
- Download subtitles and auto-captions
- Work around platform restrictions

## Basic Download Patterns

### Best Quality Video + Audio

Download highest quality video and audio, merge into single file.

```bash
# Recommended: Let yt-dlp choose best combination
yt-dlp "VIDEO_URL"

# Explicit best video+audio merge
yt-dlp -f "bestvideo+bestaudio" "VIDEO_URL"

# Prefer MP4 container
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" --merge-output-format mp4 "VIDEO_URL"

# With metadata and thumbnail embedding
yt-dlp -f "bestvideo+bestaudio" \
  --embed-metadata \
  --embed-thumbnail \
  --embed-subs \
  "VIDEO_URL"
```

### SABR 403 Workaround

**Problem**: YouTube's SABR system returns 403 errors on some format selectors for newer videos (2023+).

**Solution**: Use simpler format selectors that let yt-dlp handle the complexity.

```bash
# BROKEN (SABR 403 on newer videos):
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" "VIDEO_URL"

# WORKS (SABR-compatible):
yt-dlp -f "best[ext=mp4]/best" "VIDEO_URL"

# Audio-only SABR workaround:
yt-dlp -f "bestaudio/best" -x --audio-format mp3 "VIDEO_URL"
```

**When to use**:
- Videos uploaded after 2023
- Videos showing "HTTP Error 403: Forbidden" with explicit format codes
- Premium/restricted content

**Why it works**: The simpler selector `best[ext=mp4]/best` avoids triggering YouTube's anti-bot SABR system while still getting high quality. The `/best` fallback ensures download succeeds even if mp4 unavailable.

### Audio-Only Extraction

Extract audio track without video.

```bash
# Best audio quality, convert to MP3
yt-dlp -f "bestaudio" -x --audio-format mp3 "VIDEO_URL"

# FLAC (lossless)
yt-dlp -f "bestaudio" -x --audio-format flac "VIDEO_URL"

# Opus (high quality, small size)
yt-dlp -f "bestaudio" -x --audio-format opus "VIDEO_URL"

# M4A (AAC, good compatibility)
yt-dlp -f "bestaudio" -x --audio-format m4a "VIDEO_URL"

# MP3 with bitrate specification
yt-dlp -f "bestaudio" -x --audio-format mp3 --audio-quality 320K "VIDEO_URL"

# SABR-safe audio extraction
yt-dlp -f "bestaudio/best" -x --audio-format mp3 "VIDEO_URL"
```

**Audio Quality Ladder**:
1. **FLAC** - Lossless, large files, archival quality
2. **Opus** - Best quality/size ratio, not universally supported
3. **M4A/AAC 256kbps** - Excellent quality, wide compatibility
4. **MP3 320kbps** - Good quality, universal compatibility
5. **MP3 192kbps** - Acceptable quality, smaller files

### Specific Resolution

Download specific video resolution.

```bash
# 1080p MP4
yt-dlp -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]" "VIDEO_URL"

# 720p (standard HD)
yt-dlp -f "bestvideo[height<=720]+bestaudio" "VIDEO_URL"

# 4K (2160p)
yt-dlp -f "bestvideo[height<=2160]+bestaudio" "VIDEO_URL"

# SABR-safe resolution preference
yt-dlp -f "best[height<=1080]/best" "VIDEO_URL"
```

### Specific Format Codes

Use YouTube format codes directly (use `yt-dlp -F URL` to list available formats).

```bash
# List all available formats
yt-dlp -F "VIDEO_URL"

# Download specific format code
yt-dlp -f 137+140 "VIDEO_URL"  # 1080p video (137) + M4A audio (140)

# Fallback chain
yt-dlp -f "137+140/136+140/best" "VIDEO_URL"  # Try 1080p, then 720p, then best
```

**Common YouTube Format Codes**:
- **137**: 1080p MP4 video
- **136**: 720p MP4 video
- **140**: M4A 128kbps audio
- **251**: Opus 160kbps audio
- **bestaudio**: Highest quality audio available

## Playlist Operations

### Download Entire Playlist

```bash
# All videos in playlist
yt-dlp "PLAYLIST_URL"

# Playlist with numbering
yt-dlp -o "%(playlist_index)s - %(title)s.%(ext)s" "PLAYLIST_URL"

# Playlist to specific directory
yt-dlp -o "~/Music/%(playlist)s/%(title)s.%(ext)s" "PLAYLIST_URL"

# Audio-only playlist
yt-dlp -f "bestaudio" -x --audio-format mp3 "PLAYLIST_URL"
```

### Playlist Range Selection

```bash
# Download items 1-10
yt-dlp --playlist-start 1 --playlist-end 10 "PLAYLIST_URL"

# Download every other video
yt-dlp --playlist-items "1,3,5,7,9" "PLAYLIST_URL"

# Skip first 5 videos
yt-dlp --playlist-start 6 "PLAYLIST_URL"

# Download only specific item numbers
yt-dlp --playlist-items "1,5,10,15" "PLAYLIST_URL"
```

### Reverse Playlist Order

```bash
# Download oldest-first instead of newest-first
yt-dlp --playlist-reverse "PLAYLIST_URL"
```

## Channel Downloads

### Entire Channel

```bash
# All videos from channel
yt-dlp "https://www.youtube.com/@CHANNEL_HANDLE/videos"

# Channel with custom output template
yt-dlp -o "%(uploader)s/%(upload_date)s - %(title)s.%(ext)s" \
  "https://www.youtube.com/@CHANNEL_HANDLE/videos"

# Audio-only from entire channel
yt-dlp -f "bestaudio" -x --audio-format mp3 \
  "https://www.youtube.com/@CHANNEL_HANDLE/videos"
```

### Channel Filtered by Date

```bash
# Videos uploaded after specific date
yt-dlp --dateafter 20230101 "CHANNEL_URL"

# Videos from specific date range
yt-dlp --dateafter 20230101 --datebefore 20231231 "CHANNEL_URL"

# Only today's uploads
yt-dlp --dateafter today "CHANNEL_URL"

# Last 7 days
yt-dlp --dateafter now-7days "CHANNEL_URL"
```

### Channel Filtered by View Count

```bash
# Videos with at least 100K views
yt-dlp --min-views 100000 "CHANNEL_URL"

# Videos with less than 1M views
yt-dlp --max-views 1000000 "CHANNEL_URL"
```

## Search and Discovery

### YouTube Search

```bash
# Search for videos
yt-dlp "ytsearch10:artist name song"

# Search and download best match
yt-dlp "ytsearch1:artist official video"

# Search, audio-only
yt-dlp -f "bestaudio" -x --audio-format mp3 "ytsearch5:artist live"

# Search specific channel
yt-dlp "ytsearch:artist name intitle:official"
```

### Search Options

```bash
# Sort by view count
yt-dlp "ytsearchsortorder:view_count:artist name"

# Sort by upload date
yt-dlp "ytsearchsortorder:upload_date:artist name"

# Sort by rating
yt-dlp "ytsearchsortorder:rating:artist name"

# Filter HD only in search
yt-dlp -f "bestvideo[height>=720]+bestaudio" "ytsearch5:artist HD"
```

## Metadata and Thumbnails

### Embed Metadata

```bash
# Embed all metadata
yt-dlp --embed-metadata "VIDEO_URL"

# Add metadata to MP3
yt-dlp -f "bestaudio" -x --audio-format mp3 \
  --embed-metadata \
  --add-metadata \
  "VIDEO_URL"

# Custom metadata
yt-dlp --parse-metadata "title:%(artist)s - %(track)s" \
  --embed-metadata \
  "VIDEO_URL"
```

### Thumbnail Handling

```bash
# Download thumbnail separately
yt-dlp --write-thumbnail "VIDEO_URL"

# Embed thumbnail in video
yt-dlp --embed-thumbnail "VIDEO_URL"

# Embed thumbnail in MP3 (requires ffmpeg with MP3 support)
yt-dlp -f "bestaudio" -x --audio-format mp3 \
  --embed-thumbnail \
  --embed-metadata \
  "VIDEO_URL"

# Thumbnail format preference
yt-dlp --write-thumbnail --convert-thumbnails jpg "VIDEO_URL"
```

### Write Metadata Files

```bash
# Write JSON metadata
yt-dlp --write-info-json "VIDEO_URL"

# Write description to .txt file
yt-dlp --write-description "VIDEO_URL"

# Write all metadata artifacts
yt-dlp --write-info-json \
  --write-description \
  --write-thumbnail \
  --write-annotations \
  "VIDEO_URL"
```

## Subtitle Downloads

### Basic Subtitle Download

```bash
# Download all available subtitles
yt-dlp --write-subs --all-subs "VIDEO_URL"

# Download auto-generated captions
yt-dlp --write-auto-subs "VIDEO_URL"

# Specific language
yt-dlp --write-subs --sub-langs "en,es,fr" "VIDEO_URL"

# Embed subtitles in video
yt-dlp --embed-subs "VIDEO_URL"
```

### Subtitle Format Conversion

```bash
# Convert subtitles to SRT
yt-dlp --write-subs --sub-format srt "VIDEO_URL"

# Convert to VTT
yt-dlp --write-subs --sub-format vtt "VIDEO_URL"

# Multiple formats
yt-dlp --write-subs --sub-format "srt/vtt/best" "VIDEO_URL"
```

## Output Templates

### File Naming Patterns

```bash
# Default: video title + extension
yt-dlp -o "%(title)s.%(ext)s" "VIDEO_URL"

# Include upload date
yt-dlp -o "%(upload_date)s - %(title)s.%(ext)s" "VIDEO_URL"

# Include uploader
yt-dlp -o "%(uploader)s/%(title)s.%(ext)s" "VIDEO_URL"

# Playlist numbering
yt-dlp -o "%(playlist_index)02d - %(title)s.%(ext)s" "PLAYLIST_URL"

# Full metadata filename
yt-dlp -o "%(uploader)s - %(upload_date)s - %(title)s [%(id)s].%(ext)s" "VIDEO_URL"
```

### Directory Organization

```bash
# Organize by uploader
yt-dlp -o "~/Downloads/%(uploader)s/%(title)s.%(ext)s" "VIDEO_URL"

# Organize by date (year/month)
yt-dlp -o "~/Archive/%(upload_date>%Y)s/%(upload_date>%m)s/%(title)s.%(ext)s" "VIDEO_URL"

# Organize playlists
yt-dlp -o "~/Music/%(playlist)s/%(playlist_index)02d - %(title)s.%(ext)s" "PLAYLIST_URL"

# Organize by channel and upload date
yt-dlp -o "%(uploader)s/%(upload_date)s/%(title)s.%(ext)s" "CHANNEL_URL"
```

### Sanitization and Safety

```bash
# Restrict filenames (no special characters)
yt-dlp --restrict-filenames -o "%(title)s.%(ext)s" "VIDEO_URL"

# Replace spaces with underscores
yt-dlp -o "%(title)s.%(ext)s" --replace-in-metadata "title" " " "_" "VIDEO_URL"

# Trim long titles
yt-dlp -o "%(title).50s.%(ext)s" "VIDEO_URL"  # Max 50 characters
```

## Quality Selection Strategies

### Balanced Quality/Size

```bash
# 1080p max, good balance
yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" "VIDEO_URL"

# Prefer MP4, VP9 fallback
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio" \
  --merge-output-format mp4 \
  "VIDEO_URL"

# Audio: 192kbps MP3 (good balance)
yt-dlp -f "bestaudio" -x --audio-format mp3 --audio-quality 192K "VIDEO_URL"
```

### Maximum Quality

```bash
# Best everything
yt-dlp -f "bestvideo+bestaudio" "VIDEO_URL"

# 4K with best audio
yt-dlp -f "bestvideo[height<=2160]+bestaudio" "VIDEO_URL"

# Audio: FLAC lossless
yt-dlp -f "bestaudio" -x --audio-format flac "VIDEO_URL"
```

### Minimum File Size

```bash
# Smallest reasonable quality
yt-dlp -f "worst[height>=360]" "VIDEO_URL"

# Audio: 128kbps MP3
yt-dlp -f "bestaudio" -x --audio-format mp3 --audio-quality 128K "VIDEO_URL"

# Prefer smaller codecs
yt-dlp -f "bestvideo[ext=webm][height<=720]+bestaudio[ext=webm]" "VIDEO_URL"
```

## Archive and Resumption

### Download Archive

Prevent re-downloading already acquired content.

```bash
# Create/use download archive
yt-dlp --download-archive downloaded.txt "PLAYLIST_URL"

# Update playlist without re-downloading
yt-dlp --download-archive archive.txt "PLAYLIST_URL"

# Separate archive per playlist
yt-dlp --download-archive "%(playlist_id)s.txt" "PLAYLIST_URL"
```

### Resume Interrupted Downloads

```bash
# Continue incomplete downloads (default behavior)
yt-dlp -c "VIDEO_URL"

# Force re-download even if file exists
yt-dlp --no-continue "VIDEO_URL"
```

## Advanced Filtering

### File Size Limits

```bash
# Skip files larger than 500MB
yt-dlp --max-filesize 500M "VIDEO_URL"

# Skip files smaller than 10MB
yt-dlp --min-filesize 10M "VIDEO_URL"

# Combination
yt-dlp --min-filesize 10M --max-filesize 500M "PLAYLIST_URL"
```

### Duration Filters

```bash
# Only videos longer than 5 minutes
yt-dlp --match-filter "duration > 300" "CHANNEL_URL"

# Only videos shorter than 10 minutes
yt-dlp --match-filter "duration < 600" "PLAYLIST_URL"

# Between 3-10 minutes
yt-dlp --match-filter "duration > 180 & duration < 600" "CHANNEL_URL"
```

### Content Filters

```bash
# Skip live streams
yt-dlp --match-filter "!is_live" "CHANNEL_URL"

# Only live streams
yt-dlp --match-filter "is_live" "CHANNEL_URL"

# Skip age-restricted content
yt-dlp --match-filter "!age_limit" "CHANNEL_URL"

# Minimum view count
yt-dlp --match-filter "view_count > 10000" "CHANNEL_URL"
```

## Rate Limiting and Throttling

### Speed Limits

```bash
# Limit download speed to 5MB/s
yt-dlp -r 5M "VIDEO_URL"

# Limit to 1MB/s
yt-dlp -r 1M "PLAYLIST_URL"

# No speed limit (default)
yt-dlp -r 0 "VIDEO_URL"
```

### Request Throttling

```bash
# Sleep between downloads
yt-dlp --sleep-interval 5 "PLAYLIST_URL"

# Random sleep (3-8 seconds)
yt-dlp --min-sleep-interval 3 --max-sleep-interval 8 "PLAYLIST_URL"

# Sleep before each download
yt-dlp --sleep-requests 2 "CHANNEL_URL"
```

## Authentication and Cookies

### Login with Credentials

```bash
# Login with username/password
yt-dlp -u USERNAME -p PASSWORD "VIDEO_URL"

# Login with netrc file
yt-dlp -n "VIDEO_URL"
```

### Cookie Files

```bash
# Use browser cookies (for member-only content)
yt-dlp --cookies-from-browser firefox "VIDEO_URL"

# Use cookie file
yt-dlp --cookies cookies.txt "VIDEO_URL"

# Export cookies from browser for reuse
yt-dlp --cookies-from-browser chrome --cookies cookies.txt "VIDEO_URL"
```

## Post-Processing

### FFmpeg Operations

```bash
# Re-encode video
yt-dlp --recode-video mp4 "VIDEO_URL"

# Re-encode audio
yt-dlp -x --audio-format mp3 --audio-quality 320K "VIDEO_URL"

# Add custom ffmpeg args
yt-dlp --postprocessor-args "ffmpeg:-c:v libx264 -crf 23" "VIDEO_URL"
```

### Thumbnail to Video

```bash
# Extract thumbnail from video
yt-dlp --write-thumbnail --skip-download "VIDEO_URL"

# Embed thumbnail in audio file
yt-dlp -f "bestaudio" -x --audio-format mp3 \
  --embed-thumbnail \
  "VIDEO_URL"
```

## Batch Downloads

### File-Based Batch

```bash
# Download all URLs in file
yt-dlp -a urls.txt

# URLs file format (one URL per line)
cat > urls.txt <<EOF
https://youtube.com/watch?v=VIDEO1
https://youtube.com/watch?v=VIDEO2
https://youtube.com/playlist?list=PLAYLIST_ID
EOF

yt-dlp -a urls.txt

# Batch with custom options
yt-dlp -a urls.txt -f "bestaudio" -x --audio-format mp3
```

### Scripted Batch

```bash
# Loop through list
for url in $(cat urls.txt); do
  yt-dlp -f "bestaudio/best" -x --audio-format mp3 "$url"
  sleep 5  # Rate limiting
done

# Parallel downloads (use with caution)
cat urls.txt | xargs -P 3 -I {} yt-dlp {}
```

## Platform-Specific Patterns

### SoundCloud

```bash
# SoundCloud track
yt-dlp "https://soundcloud.com/artist/track"

# SoundCloud playlist
yt-dlp "https://soundcloud.com/artist/sets/playlist"

# SoundCloud user (all tracks)
yt-dlp "https://soundcloud.com/artist/tracks"

# Extract metadata
yt-dlp --embed-metadata \
  -f "bestaudio" -x --audio-format mp3 \
  "SOUNDCLOUD_URL"
```

### Vimeo

```bash
# Vimeo video
yt-dlp "https://vimeo.com/VIDEO_ID"

# Vimeo with password
yt-dlp --video-password PASSWORD "VIMEO_URL"

# Best quality Vimeo
yt-dlp -f "bestvideo+bestaudio" "VIMEO_URL"
```

### Bandcamp

```bash
# Bandcamp album
yt-dlp "https://artist.bandcamp.com/album/album-name"

# Bandcamp track
yt-dlp "https://artist.bandcamp.com/track/track-name"

# Extract FLAC from Bandcamp (if available)
yt-dlp -f "best" "BANDCAMP_URL"
```

### Internet Archive

```bash
# Archive.org item
yt-dlp "https://archive.org/details/IDENTIFIER"

# Specific format from archive
yt-dlp -f "FLAC/MP3/best" "ARCHIVE_URL"

# All files from item
yt-dlp "https://archive.org/download/IDENTIFIER/"
```

## Troubleshooting Patterns

### 403 Forbidden (SABR Error)

```bash
# Use simplified format selector
yt-dlp -f "best[ext=mp4]/best" "VIDEO_URL"

# Audio-only fallback
yt-dlp -f "bestaudio/best" -x --audio-format mp3 "VIDEO_URL"

# Update yt-dlp
pip install -U yt-dlp
```

### Slow Download Speed

```bash
# Try different server
yt-dlp --geo-bypass "VIDEO_URL"

# Fragment-based download
yt-dlp --concurrent-fragments 4 "VIDEO_URL"

# External downloader (aria2c)
yt-dlp --external-downloader aria2c "VIDEO_URL"
```

### Geo-Blocking

```bash
# Bypass geo-restrictions
yt-dlp --geo-bypass "VIDEO_URL"

# Specify country code
yt-dlp --geo-bypass-country US "VIDEO_URL"
```

### Age-Restricted Content

```bash
# Use cookies from logged-in browser
yt-dlp --cookies-from-browser firefox "VIDEO_URL"

# Or use credentials
yt-dlp -u USERNAME -p PASSWORD "VIDEO_URL"
```

## Performance Optimization

### Parallel Downloads

```bash
# Use external downloader with multiple connections
yt-dlp --external-downloader aria2c \
  --external-downloader-args "-x 16 -s 16 -k 1M" \
  "VIDEO_URL"
```

### Fragment Optimization

```bash
# Download fragments concurrently
yt-dlp --concurrent-fragments 8 "VIDEO_URL"

# Useful for large videos and playlists
yt-dlp --concurrent-fragments 4 "PLAYLIST_URL"
```

## Complete Examples

### Example 1: Music Video Collection

Download entire artist channel as 1080p MP4 with metadata.

```bash
yt-dlp -f "best[height<=1080][ext=mp4]/best[height<=1080]/best" \
  --embed-metadata \
  --embed-thumbnail \
  --embed-subs \
  -o "%(uploader)s/%(upload_date)s - %(title)s.%(ext)s" \
  --download-archive downloaded.txt \
  "https://www.youtube.com/@ArtistOfficial/videos"
```

### Example 2: Audio-Only Discography

Extract audio from all videos in playlist as 320kbps MP3.

```bash
yt-dlp -f "bestaudio/best" \
  -x --audio-format mp3 --audio-quality 320K \
  --embed-metadata \
  --embed-thumbnail \
  -o "%(playlist)s/%(playlist_index)02d - %(title)s.%(ext)s" \
  "PLAYLIST_URL"
```

### Example 3: Live Concert Archive

Download concert with subtitles, thumbnail, and JSON metadata.

```bash
yt-dlp -f "bestvideo+bestaudio" \
  --write-subs --embed-subs --all-subs \
  --write-thumbnail --embed-thumbnail \
  --write-info-json \
  --write-description \
  -o "Concerts/%(upload_date)s - %(title)s.%(ext)s" \
  "VIDEO_URL"
```

### Example 4: SABR-Safe Batch Download

Download multiple videos using SABR-compatible format selection.

```bash
cat > urls.txt <<EOF
https://youtube.com/watch?v=VIDEO1
https://youtube.com/watch?v=VIDEO2
https://youtube.com/watch?v=VIDEO3
EOF

yt-dlp -f "best[ext=mp4]/best" \
  --embed-metadata \
  --embed-thumbnail \
  -o "%(title)s.%(ext)s" \
  -a urls.txt
```

## Best Practices

1. **Always use `--embed-metadata`** - Preserves video metadata in file
2. **Use download archive** - Prevents re-downloading with `--download-archive`
3. **Apply SABR workaround** - Use `best[ext=mp4]/best` for newer videos
4. **Rate limit large downloads** - Use `--sleep-interval` for playlists/channels
5. **Organize with output templates** - Use `-o` for consistent file organization
6. **Keep yt-dlp updated** - Run `pip install -U yt-dlp` regularly
7. **Test format selection** - Use `-F` to list formats before downloading
8. **Use cookies for member content** - `--cookies-from-browser` for restricted content

## See Also

- Source Discoverer Agent: `@agentic/code/frameworks/media-curator/agents/source-discoverer.md`
- find-sources Command: `@agentic/code/frameworks/media-curator/commands/find-sources.md`
- Queue Manager Agent: `@agentic/code/frameworks/media-curator/agents/queue-manager.md`
