---
name: Audio Extraction
description: ffmpeg patterns for extracting audio from video files and transcoding between formats
category: media-curator
---

# Audio Extraction

Patterns for extracting audio tracks from video files and transcoding between audio formats using ffmpeg.

## Extract Audio from Video

### To Opus (Recommended for collections)
```bash
# Standard quality (128k) - good balance of size and quality
ffmpeg -y -i input.mp4 -vn -acodec libopus -b:a 128k output.opus

# High quality (192k) - for studio sessions and interviews
ffmpeg -y -i input.mp4 -vn -acodec libopus -b:a 192k output.opus

# Lower quality (96k) - for long-form content like full concerts
ffmpeg -y -i input.mp4 -vn -acodec libopus -b:a 96k output.opus
```

### To FLAC (Lossless preservation)
```bash
ffmpeg -y -i input.mp4 -vn -acodec flac output.flac
```

### To MP3 (Maximum compatibility)
```bash
# VBR quality 2 (~190kbps, excellent quality)
ffmpeg -y -i input.mp4 -vn -acodec libmp3lame -q:a 2 output.mp3

# CBR 320kbps (maximum quality)
ffmpeg -y -i input.mp4 -vn -acodec libmp3lame -b:a 320k output.mp3
```

## Batch Extraction

### All Videos in Directory to Opus
```bash
for f in video/*.mp4; do
  [ -f "$f" ] || continue
  base=$(basename "${f%.mp4}")
  [ -f "audio/${base}.opus" ] && continue  # Skip existing
  ffmpeg -y -i "$f" -vn -acodec libopus -b:a 128k "audio/${base}.opus"
done
```

### Parallel Batch Extraction (GNU parallel)
```bash
find video/ -name "*.mp4" -print0 | \
  xargs -0 -P 4 -I{} sh -c '
    base=$(basename "${1%.mp4}")
    [ -f "audio/${base}.opus" ] || \
    ffmpeg -y -i "$1" -vn -acodec libopus -b:a 128k "audio/${base}.opus"
  ' _ {}
```

## Format Transcoding

### FLAC to Opus
```bash
ffmpeg -y -i input.flac -acodec libopus -b:a 128k output.opus
```

### FLAC to MP3
```bash
ffmpeg -y -i input.flac -acodec libmp3lame -q:a 2 output.mp3
```

### Opus to MP3 (when Opus not supported by target)
```bash
ffmpeg -y -i input.opus -acodec libmp3lame -q:a 2 output.mp3
```

### M4A to Opus
```bash
ffmpeg -y -i input.m4a -acodec libopus -b:a 128k output.opus
```

## Quality Verification

### Check Audio Bitrate
```bash
ffprobe -v quiet -show_entries format=bit_rate \
  -of default=noprint_wrappers=1:nokey=1 input.opus
```

### Check Audio Format Details
```bash
ffprobe -v quiet -show_entries stream=codec_name,sample_rate,channels,bit_rate \
  -of json input.opus
```

### Detect Clipping/Distortion
```bash
ffmpeg -i input.opus -af "volumedetect" -f null /dev/null 2>&1 | grep max_volume
# If max_volume > 0 dB, audio is clipping
```

### Check Duration
```bash
ffprobe -v quiet -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 input.opus
```

## Format Selection Guide

| Source Content | Extract To | Bitrate | Rationale |
|---------------|-----------|---------|-----------|
| Music video (studio) | Opus | 128k | Good balance for music |
| Live performance | Opus | 128k | Crowd noise doesn't need more |
| Studio session | Opus | 192k | Preserve detail |
| Interview | Opus | 96k | Speech doesn't need high bitrate |
| Full concert (2+ hours) | Opus | 96k | Size management |
| Archival source (FLAC) | FLAC | Lossless | Preserve original quality |

## Segment Handling

### Concatenate Audio Segments
```bash
# Create file list
for f in segments/*.opus; do
  echo "file '$f'" >> filelist.txt
done

# Concatenate without re-encoding
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.opus
```

### Split Long Recording into Tracks
```bash
# Split at specific timestamps (from setlist)
ffmpeg -i concert.opus -ss 00:00:00 -to 00:04:30 -c copy "01 - Jumpsuit.opus"
ffmpeg -i concert.opus -ss 00:04:30 -to 00:08:15 -c copy "02 - Levitate.opus"
```

## Thumbnail/Frame Extraction

### Extract Video Thumbnail (for cover art)
```bash
# Extract frame at 5 seconds
ffmpeg -y -ss 5 -i video.mp4 -vframes 1 -q:v 2 cover.jpg

# Extract frame as WebP (smaller)
ffmpeg -y -ss 5 -i video.mp4 -vframes 1 cover.webp
```
