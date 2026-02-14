---
description: Export media collection to platform-specific formats (Plex, Jellyfin, MPD, mobile, archival)
category: media-curator
argument-hint: --profile <plex|jellyfin|mpd|mobile|archival> <collection_path> <output_path> [--max-size <GB>] [--transcode]
allowed-tools: Bash, Read, Write, Glob, Grep
model: sonnet
---

# Export Media Collection

Export a curated media collection to platform-specific formats with appropriate transcoding, metadata, and directory structures.

## Purpose

Users consume media across diverse platforms, each with different format requirements, metadata standards, and organizational conventions. This command transforms a curated collection into the optimal structure for each target platform.

## Platform Profiles

### Plex Profile

**Formats:**
- Audio: FLAC (preferred), MP3 (320kbps), M4A (AAC)
- Video: MP4 (H.264/H.265), MKV
- Artwork: Embedded + `folder.jpg` in album directory

**Directory Structure:**
```
Music/
├── Artist Name/
│   ├── Album Name (Year)/
│   │   ├── folder.jpg
│   │   ├── 01 - Track Title.flac
│   │   ├── 02 - Track Title.flac
│   │   └── ...
│   └── Videos/
│       └── Video Title.mp4
```

**YAML Spec:**
```yaml
profile: plex
audio_formats: [flac, mp3, m4a]
video_formats: [mp4, mkv]
artwork:
  embedded: true
  folder_jpg: true
  max_resolution: 1500x1500
directory_pattern: "{artist}/{album} ({year})/{track:02d} - {title}.{ext}"
video_directory: "{artist}/Videos/{title}.{ext}"
metadata:
  prefer_embedded: true
  id3v2_version: 2.4
```

### Jellyfin Profile

**Formats:**
- Audio: FLAC (preferred), Opus, MP3
- Video: MP4, MKV, WebM
- Artwork: Embedded + `folder.jpg` + `artist.jpg`
- NFO: Supported for rich metadata

**Directory Structure:**
```
Music/
├── Artist Name/
│   ├── artist.jpg
│   ├── artist.nfo
│   ├── Album Name (Year)/
│   │   ├── folder.jpg
│   │   ├── album.nfo
│   │   ├── 01 - Track Title.flac
│   │   └── ...
│   └── Videos/
│       ├── Video Title.mp4
│       └── Video Title.nfo
```

**YAML Spec:**
```yaml
profile: jellyfin
audio_formats: [flac, opus, mp3]
video_formats: [mp4, mkv, webm]
artwork:
  embedded: true
  folder_jpg: true
  artist_jpg: true
  max_resolution: 1500x1500
nfo_files:
  album: true
  artist: true
  video: true
directory_pattern: "{artist}/{album} ({year})/{track:02d} - {title}.{ext}"
video_directory: "{artist}/Videos/{title}.{ext}"
metadata:
  prefer_embedded: true
  id3v2_version: 2.4
```

### MPD Profile

**Formats:**
- Audio: FLAC (preferred), Opus, MP3
- Artwork: `folder.jpg` in album directory

**Directory Structure:**
```
Music/
├── Artist Name/
│   └── Album Name/
│       ├── folder.jpg
│       ├── 01 - Track Title.flac
│       └── ...
```

**YAML Spec:**
```yaml
profile: mpd
audio_formats: [flac, opus, mp3]
artwork:
  embedded: true
  folder_jpg: true
  max_resolution: 1000x1000
directory_pattern: "{artist}/{album}/{track:02d} - {title}.{ext}"
metadata:
  prefer_embedded: true
  id3v2_version: 2.4
scanning:
  auto_rescan: true
  watch_mode: inotify
```

### Mobile Profile

**Formats:**
- Audio: Opus (preferred, 128-192kbps), M4A (AAC), MP3
- Video: MP4 (H.264, max 720p)
- Artwork: Embedded, max 500x500

**Size Constraints:**
- Transcode high-res audio to save space
- Limit video resolution
- Budget-aware export (stop when size limit reached)

**YAML Spec:**
```yaml
profile: mobile
audio_formats: [opus, m4a, mp3]
audio_quality:
  opus: 128k
  m4a: 192k
  mp3: 192k
video_formats: [mp4]
video_quality:
  max_resolution: 720p
  codec: h264
  bitrate: 1500k
artwork:
  embedded: true
  max_resolution: 500x500
transcode:
  always: true
  source_formats: [flac, wav, alac]
size_budget:
  enabled: true
  prioritize_by: importance
directory_pattern: "{artist}/{album}/{track:02d} - {title}.{ext}"
```

### Archival Profile

**Formats:**
- Audio: FLAC, WAV (no lossy formats)
- Video: MKV (preserve original quality)
- Checksums: SHA256SUMS
- Provenance: PROVENANCE.jsonld

**Directory Structure:**
```
Archive/
├── Artist Name/
│   ├── Album Name (Year)/
│   │   ├── 01 - Track Title.flac
│   │   ├── ...
│   │   ├── SHA256SUMS
│   │   ├── PROVENANCE.jsonld
│   │   └── folder.jpg
│   └── MANIFEST.json
```

**YAML Spec:**
```yaml
profile: archival
audio_formats: [flac, wav]
video_formats: [mkv]
preserve:
  original_filenames: true
  source_metadata: true
  acquisition_dates: true
checksums:
  algorithm: sha256
  filename: SHA256SUMS
provenance:
  format: jsonld
  filename: PROVENANCE.jsonld
  include_source_urls: true
  include_timestamps: true
manifest:
  per_album: false
  per_artist: true
  format: json
directory_pattern: "{artist}/{album} ({year})/{original_filename}"
```

## Transcoding Commands

### Audio Transcoding

**FLAC to Opus:**
```bash
ffmpeg -i input.flac -c:a libopus -b:a 128k -vn output.opus
```

**FLAC to MP3:**
```bash
ffmpeg -i input.flac -c:a libmp3lame -b:a 320k -id3v2_version 4 output.mp3
```

**Opus to MP3:**
```bash
ffmpeg -i input.opus -c:a libmp3lame -b:a 192k -id3v2_version 4 output.mp3
```

**Preserve Metadata:**
```bash
ffmpeg -i input.flac -c:a libopus -b:a 128k -vn -map_metadata 0 output.opus
```

### Video Transcoding

**4K to 1080p:**
```bash
ffmpeg -i input.mkv -vf scale=1920:1080 -c:v libx264 -crf 23 -c:a copy output.mp4
```

**1080p to 720p (mobile):**
```bash
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 -b:v 1500k -c:a aac -b:a 128k output.mp4
```

**Extract Audio Only:**
```bash
ffmpeg -i video.mp4 -vn -c:a libopus -b:a 192k audio.opus
```

### Artwork Processing

**Resize Artwork:**
```bash
ffmpeg -i folder.jpg -vf scale=500:500:force_original_aspect_ratio=decrease -q:v 2 folder_mobile.jpg
```

**Extract Artwork from Audio:**
```bash
ffmpeg -i track.flac -an -vcodec copy folder.jpg
```

**Embed Artwork into Audio:**
```bash
ffmpeg -i track.flac -i folder.jpg -map 0:a -map 1:v -c:a copy -id3v2_version 4 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" output.flac
```

## NFO File Generation

### Album NFO Template (Jellyfin/Kodi)

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<album>
  <title>{album_title}</title>
  <artist>{artist_name}</artist>
  <year>{release_year}</year>
  <genre>{genre}</genre>
  <style>{style}</style>
  <mood>{mood}</mood>
  <label>{label}</label>
  <releasedate>{release_date}</releasedate>
  <rating>{rating}</rating>
  <userrating>{user_rating}</userrating>
  <review>{review}</review>
  <musicbrainzalbumid>{mbid}</musicbrainzalbumid>
  <thumb aspect="thumb">{artwork_url}</thumb>
</album>
```

## Size-Budgeted Export (Mobile)

When exporting to mobile devices with limited storage:

1. **Calculate Space Budget:**
   - Parse `--max-size` parameter
   - Convert to bytes
   - Reserve 10% buffer for filesystem overhead

2. **Prioritize Content:**
   - Sort by importance score (frequency * rating * recency)
   - Essential albums first
   - Deep cuts last

3. **Transcode to Mobile Formats:**
   - FLAC → Opus 128kbps
   - High-res video → 720p H.264
   - Resize artwork to 500x500

4. **Track Running Total:**
   - Sum file sizes as files are added
   - Stop when budget exhausted
   - Generate report of included/excluded content

5. **Export Algorithm:**
```bash
budget_bytes=$(( max_size_gb * 1024 * 1024 * 1024 * 9 / 10 ))
total_bytes=0

while read -r file importance; do
  file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")

  if (( total_bytes + file_size > budget_bytes )); then
    echo "Budget exhausted. Stopping export." >&2
    break
  fi

  # Transcode and copy
  transcode_and_copy "$file" "$output_dir"
  total_bytes=$(( total_bytes + file_size ))
done < <(prioritized_file_list)
```

## Archival Export

### Preserve Original Formats

Never transcode. Copy files as-is to preserve quality and authenticity.

### Generate SHA-256 Checksums

```bash
cd "$album_dir"
find . -type f -not -name "SHA256SUMS" -exec sha256sum {} \; > SHA256SUMS
```

### Record Provenance

Create `PROVENANCE.jsonld` per W3C PROV standard:

```json
{
  "@context": "https://www.w3.org/ns/prov",
  "entity": "urn:aiwg:media:album:{mbid}",
  "wasGeneratedBy": {
    "activity": "urn:aiwg:activity:acquisition:{timestamp}",
    "time": "{iso8601_timestamp}",
    "wasAssociatedWith": "urn:aiwg:agent:media-curator"
  },
  "wasDerivedFrom": [
    {
      "entity": "{source_url}",
      "type": "download",
      "time": "{acquisition_date}"
    }
  ],
  "atLocation": "{file_path}",
  "hadPrimarySource": "{authoritative_source}"
}
```

### Generate Manifest

Per-artist `MANIFEST.json` listing all albums, tracks, formats, and checksums:

```json
{
  "artist": "Artist Name",
  "albums": [
    {
      "title": "Album Name",
      "year": 1973,
      "tracks": [
        {
          "number": 1,
          "title": "Track Title",
          "file": "01 - Track Title.flac",
          "format": "flac",
          "checksum": "sha256:abc123..."
        }
      ]
    }
  ],
  "export_date": "{iso8601_timestamp}",
  "profile": "archival"
}
```

## Workflow

### 1. Select Profile

Parse `--profile` argument. Load corresponding YAML spec.

### 2. Validate Source Collection

- Scan collection directory
- Verify files exist and are readable
- Check format compatibility with target profile

### 3. Create Output Directory Structure

Based on profile's `directory_pattern`:

```bash
mkdir -p "$output_dir/{artist}/{album}"
```

### 4. Transcode If Needed

Check if source format matches target profile. If not, transcode:

```bash
if [[ "$source_ext" == "flac" ]] && [[ "$target_profile" == "mobile" ]]; then
  ffmpeg -i "$source" -c:a libopus -b:a 128k -map_metadata 0 "$target"
fi
```

### 5. Copy/Move Files

```bash
cp -a "$source" "$destination"
```

Or move if `--move` flag set.

### 6. Embed Metadata

Ensure all required metadata is embedded per profile spec.

### 7. Generate Supplementary Files

- NFO files (Jellyfin profile)
- SHA256SUMS (archival profile)
- PROVENANCE.jsonld (archival profile)
- folder.jpg, artist.jpg (Plex/Jellyfin profiles)

### 8. Report

```
Export complete: Plex profile
Source: /media/source/Artist Name
Destination: /media/plex/Music/Artist Name
Files exported: 142
Total size: 3.2 GB
Transcoded: 0
Copied: 142
```

## Examples

### Export to Plex

```bash
/export --profile plex ~/Music/Archive/Pink\ Floyd /media/plex/Music
```

### Export to Mobile with Size Limit

```bash
/export --profile mobile ~/Music/Archive /sdcard/Music --max-size 32 --transcode
```

### Archival Export

```bash
/export --profile archival ~/Music/Curated /backup/Music/Archive
```

## Error Handling

- Missing source files: Report and skip
- Insufficient disk space: Abort with clear message
- Transcode failures: Log error, optionally skip or abort
- Permission denied: Report file path and required permissions

## Performance Considerations

- Parallel transcoding: Use GNU parallel or xargs -P for multi-core systems
- Progress reporting: Update every N files or every M seconds
- Disk I/O: Batch operations to minimize seeks
- Memory: Stream large files instead of loading into memory
