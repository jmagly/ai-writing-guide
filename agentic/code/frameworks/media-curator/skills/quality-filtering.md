---
name: Quality Filtering
description: Accept/reject logic and quality scoring heuristics for media content
category: media-curator
---

# Quality Filtering Skill

## Overview

Implements the quality assessment logic used by the Quality Assessor agent. Provides reusable scoring heuristics, threshold configuration, and acceptance criteria for media content evaluation.

## Title Keyword Scoring

### Positive Quality Indicators

| Pattern | Score Modifier | Match Examples | Confidence |
|---------|---------------|----------------|------------|
| `4K\|2160p` | +3 | "4K Official", "2160p Pro Shot" | High |
| `1080p\|HD\|High Definition` | +2 | "1080p HD", "High Definition" | High |
| `Pro Shot\|Professional` | +3 | "Pro Shot Concert", "Professional Recording" | High |
| `Official\|Verified` | +2 | "Official Music Video", "Verified Upload" | High |
| `Studio Session\|Soundboard\|Board Recording` | +3 | "Studio Session Live", "Soundboard Audio" | High |
| `FLAC\|Lossless\|WAV\|ALAC` | +3 | "FLAC Audio", "Lossless Recording" | High |
| `Remastered\|Restored\|Enhanced` | +2 | "Remastered 2024", "Audio Restored" | Medium |
| `Multicam\|Multi-Camera` | +2 | "Multicam Mix", "Multi-Camera Edit" | Medium |
| `60fps\|HFR` | +1 | "60fps Smooth", "HFR Recording" | Medium |

### Negative Quality Indicators

| Pattern | Score Modifier | Match Examples | Confidence |
|---------|---------------|----------------|------------|
| `phone\|mobile\|cell` | -4 | "phone recording", "mobile upload" | High |
| `fan cam\|fancam\|audience` | -3 | "fan cam row 20", "audience recording" | High |
| `crowd\|venue mic\|distant` | -2 | "crowd recording", "distant mic" | Medium |
| `shaky\|unstable\|handheld` | -3 | "shaky camera", "unstable footage" | High |
| `bad audio\|poor quality\|low quality` | -4 | "bad audio sorry", "poor quality" | High |
| `240p\|360p\|potato` | -3 | "240p upload", "potato quality" | High |
| `vertical\|portrait mode` | -2 | "vertical video", "portrait mode" | High |
| `bootleg\|pirated\|ripped` | -1 | "bootleg copy", "ripped from DVD" | Low |
| `compressed\|low bitrate` | -2 | "compressed audio", "low bitrate" | Medium |
| `cropped\|zoomed\|partial` | -1 | "cropped video", "zoomed in" | Medium |

### Scoring Implementation

```javascript
function calculateTitleScore(title) {
  let score = 0;
  const normalizedTitle = title.toLowerCase();

  // Positive indicators
  const positivePatterns = [
    { regex: /4k|2160p/, modifier: 3 },
    { regex: /1080p|hd|high definition/, modifier: 2 },
    { regex: /pro shot|professional/, modifier: 3 },
    { regex: /official|verified/, modifier: 2 },
    { regex: /studio session|soundboard|board recording/, modifier: 3 },
    { regex: /flac|lossless|wav|alac/, modifier: 3 },
    { regex: /remastered|restored|enhanced/, modifier: 2 },
    { regex: /multicam|multi-camera/, modifier: 2 },
    { regex: /60fps|hfr/, modifier: 1 }
  ];

  // Negative indicators
  const negativePatterns = [
    { regex: /phone|mobile|cell/, modifier: -4 },
    { regex: /fan cam|fancam|audience/, modifier: -3 },
    { regex: /crowd|venue mic|distant/, modifier: -2 },
    { regex: /shaky|unstable|handheld/, modifier: -3 },
    { regex: /bad audio|poor quality|low quality/, modifier: -4 },
    { regex: /240p|360p|potato/, modifier: -3 },
    { regex: /vertical|portrait mode/, modifier: -2 },
    { regex: /bootleg|pirated|ripped/, modifier: -1 },
    { regex: /compressed|low bitrate/, modifier: -2 },
    { regex: /cropped|zoomed|partial/, modifier: -1 }
  ];

  // Apply positive modifiers
  for (const pattern of positivePatterns) {
    if (pattern.regex.test(normalizedTitle)) {
      score += pattern.modifier;
    }
  }

  // Apply negative modifiers
  for (const pattern of negativePatterns) {
    if (pattern.regex.test(normalizedTitle)) {
      score += pattern.modifier;
    }
  }

  return score;
}
```

## Metadata Assessment Commands

### Resolution Detection

```bash
# Extract video resolution
get_resolution() {
  local file="$1"
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height \
    -of csv=s=x:p=0 "$file"
}

# Score based on resolution
score_resolution() {
  local resolution="$1"
  local width height

  IFS='x' read -r width height <<< "$resolution"

  if [[ $width -ge 3840 ]]; then
    echo 10  # 4K+
  elif [[ $width -ge 1920 ]]; then
    echo 8   # 1080p
  elif [[ $width -ge 1280 ]]; then
    echo 6   # 720p
  elif [[ $width -ge 640 ]]; then
    echo 4   # 480p
  else
    echo 2   # <480p
  fi
}
```

### Audio Bitrate Detection

```bash
# Extract audio bitrate
get_audio_bitrate() {
  local file="$1"
  ffprobe -v error -select_streams a:0 \
    -show_entries stream=bit_rate \
    -of default=noprint_wrappers=1:nokey=1 "$file"
}

# Score based on bitrate
score_audio_bitrate() {
  local bitrate="$1"

  if [[ $bitrate -ge 1000000 ]]; then
    echo 10  # Lossless (>1000kbps)
  elif [[ $bitrate -ge 256000 ]]; then
    echo 8   # High (256-320kbps)
  elif [[ $bitrate -ge 192000 ]]; then
    echo 6   # Medium (192-256kbps)
  elif [[ $bitrate -ge 128000 ]]; then
    echo 4   # Low (128-192kbps)
  else
    echo 2   # Very low (<128kbps)
  fi
}
```

### Duration Sanity Check

```bash
# Extract duration in seconds
get_duration() {
  local file="$1"
  ffprobe -v error \
    -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "$file"
}

# Validate duration makes sense
validate_duration() {
  local duration="$1"
  local expected_min="$2"  # Optional minimum duration
  local expected_max="$3"  # Optional maximum duration

  # Check duration is reasonable (>5 seconds, <12 hours)
  if (( $(echo "$duration < 5" | bc -l) )); then
    echo "ERROR: Duration too short ($duration seconds)"
    return 1
  elif (( $(echo "$duration > 43200" | bc -l) )); then
    echo "ERROR: Duration suspiciously long ($duration seconds)"
    return 1
  fi

  # Check against expected range if provided
  if [[ -n "$expected_min" ]] && (( $(echo "$duration < $expected_min" | bc -l) )); then
    echo "WARNING: Duration shorter than expected ($duration < $expected_min)"
  fi

  if [[ -n "$expected_max" ]] && (( $(echo "$duration > $expected_max" | bc -l) )); then
    echo "WARNING: Duration longer than expected ($duration > $expected_max)"
  fi

  return 0
}
```

### Format Detection

```bash
# Detect audio codec
get_audio_codec() {
  local file="$1"
  ffprobe -v error -select_streams a:0 \
    -show_entries stream=codec_name \
    -of default=noprint_wrappers=1:nokey=1 "$file"
}

# Detect video codec
get_video_codec() {
  local file="$1"
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=codec_name \
    -of default=noprint_wrappers=1:nokey=1 "$file"
}

# Score audio codec quality
score_audio_codec() {
  local codec="$1"

  case "$codec" in
    flac|alac|wav|ape)
      echo 10  # Lossless
      ;;
    aac|opus)
      echo 8   # Modern lossy (efficient)
      ;;
    mp3|vorbis)
      echo 6   # Standard lossy
      ;;
    *)
      echo 4   # Unknown/old codec
      ;;
  esac
}
```

## Post-Download Verification

### Audio Quality Analysis

```bash
# Analyze volume levels and detect clipping
analyze_audio_quality() {
  local file="$1"
  local tmpfile=$(mktemp)

  # Volume detection
  ffmpeg -i "$file" -af "volumedetect" -f null /dev/null 2>&1 | \
    grep -E "(mean_volume|max_volume)" > "$tmpfile"

  local mean_volume=$(grep "mean_volume" "$tmpfile" | awk '{print $5}')
  local max_volume=$(grep "max_volume" "$tmpfile" | awk '{print $5}')

  # Clipping detection
  local clipping=$(ffmpeg -i "$file" -af "astats=metadata=1:reset=1" \
    -f null /dev/null 2>&1 | grep -c "clipping")

  echo "mean_volume=$mean_volume"
  echo "max_volume=$max_volume"
  echo "clipping_samples=$clipping"

  rm "$tmpfile"

  # Score based on analysis
  if [[ $clipping -gt 100 ]]; then
    echo "WARNING: Significant clipping detected ($clipping samples)"
    return 2  # Poor quality due to clipping
  elif (( $(echo "$mean_volume < -30" | bc -l) )); then
    echo "WARNING: Very quiet audio (mean volume $mean_volume dB)"
    return 4  # Acceptable but quiet
  else
    return 8  # Good audio quality
  fi
}
```

### Video Quality Analysis

```bash
# Detect interlacing (suggests old/poor source)
detect_interlacing() {
  local file="$1"

  ffmpeg -i "$file" -vf idet -frames:v 1000 -an -f null /dev/null 2>&1 | \
    grep "Multi frame detection"

  # If significant interlacing detected, likely old source
  if grep -q "TFF:\|BFF:" <<< "$(detect_interlacing "$file")"; then
    echo "WARNING: Interlaced video detected (likely old source)"
    return 4  # Lower score for interlaced
  else
    return 0  # No penalty
  fi
}

# Detect black bars (cropped/letterboxed source)
detect_black_bars() {
  local file="$1"

  local crop_params=$(ffmpeg -i "$file" -vf cropdetect -frames:v 100 \
    -an -f null /dev/null 2>&1 | tail -1 | grep -oP 'crop=\K[0-9:]+')

  echo "Suggested crop: $crop_params"

  # If suggested crop differs significantly from resolution, black bars exist
  # (Implementation would compare crop dimensions to actual resolution)
}
```

## Quality Score Calculation

### Weighted Scoring Function

```javascript
function calculateQualityScore(audioScore, videoScore, uniquenessScore, contentType) {
  let weights;

  if (contentType === 'audio-only') {
    weights = {
      audio: 1.0,
      video: 0.0,
      uniqueness: 0.3,
      total: 1.3
    };
  } else {  // video content
    weights = {
      audio: 0.6,
      video: 0.3,
      uniqueness: 0.3,
      total: 1.2
    };
  }

  const weightedScore = (
    (weights.audio * audioScore) +
    (weights.video * videoScore) +
    (weights.uniqueness * uniquenessScore)
  ) / weights.total;

  return {
    audio: audioScore,
    video: videoScore,
    uniqueness: uniquenessScore,
    weighted: weightedScore,
    verdict: determineVerdict(weightedScore, uniquenessScore)
  };
}

function determineVerdict(score, uniqueness) {
  // Legendary content overrides quality threshold
  if (uniqueness >= 10) {
    return {
      decision: 'ACCEPT',
      reason: 'Legendary content override'
    };
  }

  // Apply configurable threshold (default 6.0)
  const threshold = process.env.QUALITY_THRESHOLD || 6.0;

  if (score >= threshold) {
    return {
      decision: 'ACCEPT',
      reason: `Quality score ${score.toFixed(1)} meets threshold ${threshold}`
    };
  } else {
    return {
      decision: 'REJECT',
      reason: `Quality score ${score.toFixed(1)} below threshold ${threshold}`
    };
  }
}
```

## Threshold Configuration

### Configuration File Format

```yaml
# quality-thresholds.yaml
quality:
  default_threshold: 6.0

  thresholds:
    conservative: 8.0   # "Only the best"
    balanced: 6.0       # Default
    permissive: 3.0     # "I want everything"

  weights:
    audio_only:
      audio: 1.0
      video: 0.0
      uniqueness: 0.3

    video_content:
      audio: 0.6
      video: 0.3
      uniqueness: 0.3

  overrides:
    legendary_content: true   # Accept any quality if legendary
    user_request: true        # Accept if explicitly requested
    official_source: false    # Don't auto-accept official (still assess quality)
```

### Dynamic Threshold Adjustment

```javascript
function adjustThreshold(userPreference, storageAvailable) {
  const baseThreshold = 6.0;

  // User preference modifier
  let threshold = baseThreshold;
  switch (userPreference) {
    case 'conservative':
      threshold = 8.0;
      break;
    case 'permissive':
      threshold = 3.0;
      break;
    default:
      threshold = baseThreshold;
  }

  // Storage-based adjustment
  if (storageAvailable < 10) {  // Less than 10GB available
    console.warn('Low storage: Increasing quality threshold by 1.0');
    threshold += 1.0;
  }

  return threshold;
}
```

## Uniqueness Assessment

### Rarity Determination Heuristics

```javascript
function assessUniqueness(metadata) {
  const { title, channel, uploadDate, views, searchResults } = metadata;

  // Check for explicit rarity claims in title
  const rarityKeywords = {
    legendary: /first.*recording|last.*show|unreleased|lost.*media|only.*known/i,
    rare: /rare|pre-fame|demo|early.*version|bootleg/i,
    uncommon: /special.*guest|unique.*arrangement|live.*debut/i
  };

  for (const [level, pattern] of Object.entries(rarityKeywords)) {
    if (pattern.test(title)) {
      return {
        level,
        reason: `Title indicates ${level} content`,
        confidence: 'medium'
      };
    }
  }

  // Assess based on search results (how many similar recordings exist)
  if (searchResults <= 1) {
    return { level: 'legendary', reason: 'Only known recording', confidence: 'high' };
  } else if (searchResults <= 5) {
    return { level: 'rare', reason: 'Very few recordings available', confidence: 'high' };
  } else if (searchResults <= 15) {
    return { level: 'uncommon', reason: 'Limited recordings available', confidence: 'medium' };
  } else if (searchResults <= 50) {
    return { level: 'common', reason: 'Many recordings available', confidence: 'medium' };
  } else {
    return { level: 'redundant', reason: 'Abundant recordings available', confidence: 'high' };
  }
}
```

## Integration Examples

### Pre-Download Assessment

```javascript
// Assess before downloading to save bandwidth
async function preDownloadAssessment(videoMetadata) {
  const titleScore = calculateTitleScore(videoMetadata.title);
  const uniqueness = await assessUniqueness(videoMetadata);

  // Estimate quality based on available metadata
  const estimatedAudioScore = estimateAudioFromMetadata(videoMetadata);
  const estimatedVideoScore = estimateVideoFromMetadata(videoMetadata);

  const qualityScore = calculateQualityScore(
    estimatedAudioScore,
    estimatedVideoScore,
    uniqueness.score,
    videoMetadata.contentType
  );

  if (qualityScore.verdict.decision === 'REJECT') {
    console.log(`Skipping download: ${qualityScore.verdict.reason}`);
    return false;
  }

  console.log(`Proceeding with download: Quality score ${qualityScore.weighted.toFixed(1)}`);
  return true;
}
```

### Post-Download Verification

```bash
# Verify downloaded file meets quality standards
verify_download() {
  local file="$1"

  # Extract metadata
  local resolution=$(get_resolution "$file")
  local audio_bitrate=$(get_audio_bitrate "$file")
  local duration=$(get_duration "$file")

  # Analyze quality
  local audio_quality=$(analyze_audio_quality "$file")
  local video_score=$(score_resolution "$resolution")
  local audio_score=$(score_audio_bitrate "$audio_bitrate")

  echo "Resolution: $resolution (score: $video_score)"
  echo "Audio bitrate: $audio_bitrate (score: $audio_score)"
  echo "Duration: $duration seconds"
  echo "Audio quality analysis: $audio_quality"

  # Final verdict
  if [[ $audio_score -ge 6 && $video_score -ge 6 ]]; then
    echo "VERIFIED: File meets quality standards"
    return 0
  else
    echo "QUALITY WARNING: File below quality threshold"
    return 1
  fi
}
```

## See Also

- **@agentic/code/frameworks/media-curator/agents/quality-assessor.md** - Agent that uses this skill
- **@agentic/code/frameworks/media-curator/tools/ffprobe-wrapper.md** - Metadata extraction tool
- **@agentic/code/frameworks/media-curator/agents/download-orchestrator.md** - Integration point for quality decisions
