---
namespace: aiwg
platforms: [all]
name: YouTube Acquisition
description: yt-dlp patterns for acquiring content from YouTube and video platforms
category: media-curator
---

# YouTube Acquisition

Comprehensive yt-dlp command patterns for downloading video and audio content from YouTube, Vimeo, SoundCloud, and other supported platforms. Includes quality selection strategies, format filtering, the SABR 403 workaround, metadata extraction, and batch operations.

## Overview

**yt-dlp** is the primary tool for media acquisition from YouTube and 1000+ other sites. This skill documents proven patterns from production use, including workarounds for the n-challenge / EJS gate, PO-token requirements, and the older SABR 403 issue.

**Key Capabilities**:
- Download best available quality (video + audio)
- Extract audio-only in multiple formats
- Handle playlists and channels
- Embed metadata and thumbnails
- Download subtitles and auto-captions
- Work around platform restrictions

## Prerequisites (#1229)

As of 2026, basic format selectors return only image storyboards on most YouTube videos until two relatively new gates are satisfied. **Read this section before any acquisition attempt** — running yt-dlp without these prerequisites produces "Only images are available for download" failures that look like format-selector bugs but aren't.

### 1. n-challenge / EJS solver

YouTube returns ciphered streaming URLs whose `n` parameter must be transformed by JavaScript extracted from the player. yt-dlp delegates this to the `yt-dlp-ejs` plugin plus a JS runtime. Without both, all real formats are filtered out and only `sb*` storyboard formats remain.

```bash
# Install the EJS plugin
pip install --user yt-dlp-ejs

# JS runtime — deno preferred, node accepted
which deno || sudo apt install -y deno   # Debian/Ubuntu
# OR: yt-dlp --js-runtimes node:/usr/bin/node ...
```

Reference: <https://github.com/yt-dlp/yt-dlp/wiki/EJS>

### 2. PO Token (Proof of Origin)

Many client variants (`mweb`, `ios`, `web`) demand a Proof-of-Origin token tied to a logged-in / browser-attested session. Without a PO token provider those clients are skipped, narrowing the available format list. Standard provider:

```bash
pip install --user bgutil-ytdlp-pot-provider
```

Reference: <https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide>

### 3. Plugin discovery — install yt-dlp via pip, NOT the standalone zipapp

This is the gotcha that bites operators most often. The standalone yt-dlp **zipapp** (the form distributed at `/usr/local/bin/yt-dlp` from the official static download) does not expose user site-packages to its plugin-discovery path. Even after `pip install --user yt-dlp-ejs`, a zipapp invocation will silently fail to find the EJS solver. Symptoms: `n challenge solving failed` warnings even after installing the plugin.

The fix is to install yt-dlp itself via pip so it shares `site-packages` with the EJS plugin, then ensure `~/.local/bin` precedes `/usr/local/bin` on PATH:

```bash
pip install --user --break-system-packages yt-dlp-ejs   # plugin
pip install --user --break-system-packages -U yt-dlp    # 2026.03.17+ — same site-packages
export PATH="$HOME/.local/bin:$PATH"

# Verify the EJS solver is discovered
~/.local/bin/yt-dlp -F "https://www.youtube.com/watch?v=VIDEO_ID"
# Should now list real formats, not just sb*
```

After this, downloads typically succeed automatically — yt-dlp's EJS solver may even fall back to the `android_vr` client without needing the JS runtime.

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

### Failure-Mode Triage (#1229)

Match the symptom to the right gate before changing format selectors. Three distinct failures look similar but require different fixes:

| Symptom | Cause | Fix |
|---|---|---|
| `-F` lists only `sb0..sb3` storyboard formats; warning `n challenge solving failed`, `Only images are available` | n-challenge / EJS missing | Install `yt-dlp-ejs` and a JS runtime (see Prerequisites). Most failures resolve here. |
| Client-specific 403s; warning `mweb formats require a GVS PO Token` or similar | PO token required | Install `bgutil-ytdlp-pot-provider` (see Prerequisites). |
| Explicit-format 403 on `bestvideo[ext=mp4]+bestaudio[ext=m4a]` selectors against newer videos | SABR | Simplify to `best[ext=mp4]/best` (below). |

#### SABR 403 (legacy fix — keep for explicit-selector failures)

```bash
# BROKEN (SABR 403 on explicit selectors):
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" "VIDEO_URL"

# WORKS (SABR-compatible):
yt-dlp -f "best[ext=mp4]/best" "VIDEO_URL"

# Audio-only SABR-safe:
yt-dlp -f "bestaudio/best" -x --audio-format mp3 "VIDEO_URL"
```

**Why this still helps even with EJS in place**: `best[ext=mp4]/best` lets yt-dlp pick a single combined stream rather than negotiating separate video/audio tracks, which sidesteps both SABR 403s and several PO-token edge cases.

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

#### Flatpak browser profiles (#1229)

`--cookies-from-browser chromium` does NOT find Flatpak Chromium installs (or any other Flatpak browser) — the binary's default profile path doesn't match the Flatpak sandbox layout. Pass an explicit profile path:

```bash
# Flatpak Chromium
yt-dlp --cookies-from-browser "chromium:$HOME/.var/app/org.chromium.Chromium/config/chromium" "VIDEO_URL"

# Flatpak Ungoogled Chromium
yt-dlp --cookies-from-browser "chromium:$HOME/.var/app/io.github.ungoogled_software.ungoogled_chromium/config/chromium" "VIDEO_URL"

# Flatpak Firefox
yt-dlp --cookies-from-browser "firefox:$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox" "VIDEO_URL"
```

The same pattern (`<browser>:<profile-path>`) applies to any Flatpak browser. Native (non-Flatpak) installs are auto-discovered without the explicit path.

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

### Only storyboards available / "n challenge solving failed"

Most common 2026 failure. The EJS solver is missing or invisible to a zipapp install. See **Prerequisites** above for the full fix.

```bash
# Quick fix path:
pip install --user --break-system-packages yt-dlp-ejs yt-dlp
export PATH="$HOME/.local/bin:$PATH"
~/.local/bin/yt-dlp -F "VIDEO_URL"   # confirm real formats appear
```

### "mweb formats require a GVS PO Token" / client-specific 403s

PO token provider missing. See **Prerequisites** above.

```bash
pip install --user bgutil-ytdlp-pot-provider
```

### 403 Forbidden on explicit format selectors (legacy SABR)

```bash
# Use simplified format selector
yt-dlp -f "best[ext=mp4]/best" "VIDEO_URL"

# Audio-only fallback
yt-dlp -f "bestaudio/best" -x --audio-format mp3 "VIDEO_URL"

# Update yt-dlp (and EJS plugin)
pip install --user --break-system-packages -U yt-dlp yt-dlp-ejs
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

1. **Verify Prerequisites first** — Install `yt-dlp-ejs` + a JS runtime, and confirm `yt-dlp` itself was installed via `pip` (not the standalone zipapp) so plugins resolve. See the Prerequisites section above.
2. **Always use `--embed-metadata`** - Preserves video metadata in file
3. **Use download archive** - Prevents re-downloading with `--download-archive`
4. **Apply SABR workaround** - Use `best[ext=mp4]/best` for explicit-selector failures on newer videos
5. **Rate limit large downloads** - Use `--sleep-interval` for playlists/channels
6. **Organize with output templates** - Use `-o` for consistent file organization
7. **Install yt-dlp via pip, not the zipapp** — `pip install --user --break-system-packages -U yt-dlp` shares site-packages with `yt-dlp-ejs`; distros / package managers shipping the zipapp form will silently break plugin discovery.
8. **Test format selection** - Use `-F` to list formats before downloading; if you only see `sb*` storyboard formats, an EJS prerequisite is missing.
9. **Use cookies for member content** - `--cookies-from-browser` for restricted content; pass an explicit profile path for Flatpak browsers (see Authentication and Cookies > Flatpak browser profiles).

## See Also

- Source Discoverer Agent: `@$AIWG_ROOT/agentic/code/frameworks/media-curator/agents/source-discoverer.md`
- find-sources Command: `@$AIWG_ROOT/agentic/code/frameworks/media-curator/commands/find-sources.md`
- Queue Manager Agent: `@$AIWG_ROOT/agentic/code/frameworks/media-curator/agents/queue-manager.md`

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Seek explicit authorization before bulk channel downloads or overwriting existing files
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/find-sources/SKILL.md — Source discovery skill that identifies YouTube URLs for this skill to download
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/acquire/SKILL.md — General acquisition skill that delegates YouTube downloads to this skill
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/audio-extraction/SKILL.md — Audio extraction patterns used after YouTube video downloads
- @$AIWG_ROOT/agentic/code/frameworks/media-curator/skills/quality-filtering/SKILL.md — Quality filtering applied to select best available YouTube format
