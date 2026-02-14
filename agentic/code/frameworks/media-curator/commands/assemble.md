---
description: Assemble media into thematic compilations, concert films, era playlists, and narrative experiences
category: media-curator
argument-hint: --type <narrative|concert|era|documentary|playlist> --name "<name>" --collection <path> [--output <path>]
allowed-tools: Bash, Read, Write, Glob, Grep
model: sonnet
---

# Assemble Command

Assemble collected media into cohesive experiences — narrative compilations, concert films, era playlists, audio documentaries, and thematic collections.

## Purpose

Transform cataloged media into curated experiences that tell stories, preserve performances, or organize creative periods. Outputs range from simple playlists to multi-chapter concert films to narrative documentation.

## Assembly Types

### 1. Chronological Narrative

Content organized in story order (not release order). Useful for concept albums, multi-album sagas, or artists with narrative arcs across their discography.

**YAML Structure:**

```yaml
type: narrative
name: "DEMA Saga: Complete Story"
acts:
  - name: "Act I: Emergence"
    description: "Introduction to the dystopian world"
    albums:
      - Vessel
      - Blurryface
    key_tracks:
      - "Ode to Sleep"
      - "Holding On To You"
      - "Car Radio"
      - "Stressed Out"
      - "Ride"
      - "Heavydirtysoul"

  - name: "Act II: Escape"
    description: "Breaking free from DEMA"
    albums:
      - Trench
    tours:
      - "Bandito Tour 2018-2019"
    key_tracks:
      - "Jumpsuit"
      - "Levitate"
      - "Morph"
      - "My Blood"
      - "Chlorine"
      - "Pet Cheetah"
      - "Bandito"

  - name: "Act III: Deception"
    description: "Propaganda and false freedom"
    albums:
      - "Scaled and Icy"
    key_tracks:
      - "Good Day"
      - "Choker"
      - "Shy Away"
      - "The Outside"
      - "Saturday"
      - "Mulberry Street"

  - name: "Act IV: Resolution"
    description: "Final confrontation and liberation"
    albums:
      - Clancy
    key_tracks:
      - "Overcompensate"
      - "Next Semester"
      - "Backslide"
      - "Midwest Indigo"
      - "Routines in the Night"
      - "Vignette"
      - "The Craving"
      - "Navigating"
      - "Snap Back"
      - "Oldies Station"
      - "At the Risk of Feeling Dumb"
      - "Paladin Strait"

output:
  playlist: "dema-saga-complete.m3u"
  documentation: "dema-saga-narrative-guide.md"
```

### 2. Concert Film

Combine multi-camera footage and audio sources into a cohesive concert experience. Sources may come from multiple shows to create the "perfect" performance.

**YAML Structure:**

```yaml
type: concert
name: "The Eras Tour - Opening Night"
date: "2023-03-17"
venue: "State Farm Stadium, Glendale, AZ"
sources:
  - camera: "main-stage-center"
    path: "footage/main-cam/"
  - camera: "b-stage-wide"
    path: "footage/b-stage/"
  - camera: "audience-left"
    path: "footage/aud-left/"
  - audio: "soundboard-mix"
    path: "audio/sb-mix-2023-03-17.flac"

chapters:
  - title: "Lover Era"
    start: "00:00:00"
    songs:
      - "Miss Americana & The Heartbreak Prince"
      - "Cruel Summer"
      - "The Man"
      - "You Need To Calm Down"
      - "Lover"

  - title: "Fearless Era"
    start: "00:23:15"
    songs:
      - "Fearless"
      - "You Belong With Me"
      - "Love Story"

  - title: "Evermore Era"
    start: "00:35:42"
    songs:
      - "willow"
      - "marjorie"
      - "champagne problems"
      - "tolerate it"

output:
  video: "eras-tour-glendale-night1.mp4"
  chapters: "eras-tour-glendale-night1.chapters.txt"
  playlist: "eras-tour-glendale-night1-songs.m3u"
```

### 3. Era Compilation

Best-of from a specific creative period. Combines studio tracks, music videos, live performances, and bonus content.

**YAML Structure:**

```yaml
type: era
name: "Reputation Era: Complete Collection"
period: "2017-2018"
components:
  studio:
    - "reputation (Deluxe Edition)"

  videos:
    - "Look What You Made Me Do"
    - "...Ready For It?"
    - "End Game"
    - "Delicate"
    - "Reputation Stadium Tour (Netflix)"

  live:
    - "Reputation Stadium Tour - Pasadena Night 1"
    - "Reputation Stadium Tour - Pasadena Night 2"
    - "Reputation Stadium Tour - Tokyo"

  bonus:
    - "Making of Reputation"
    - "Behind the Scenes: Stadium Tour Rehearsals"
    - "Secret Sessions - NYC"

output:
  playlist: "reputation-era-complete.m3u"
  chapters: "reputation-era-video.chapters.txt"
```

### 4. Audio Documentary

Narrated experience with music, interviews, rare clips organized into thematic segments.

**YAML Structure:**

```yaml
type: documentary
name: "The Rise of Twenty One Pilots"
runtime: "90:00"
segments:
  - title: "Origins: The Basement Years"
    duration: "15:00"
    content:
      - narration: "narration/01-origins.mp3"
      - music: "No Phun Intended/Drown.mp3"
      - music: "No Phun Intended/Save.mp3"
      - interview: "interviews/tyler-joseph-early-days.mp3"

  - title: "Breakthrough: Regional to Vessel"
    duration: "20:00"
    content:
      - narration: "narration/02-breakthrough.mp3"
      - music: "Regional at Best/Holding On To You.mp3"
      - music: "Vessel/Car Radio.mp3"
      - interview: "interviews/josh-dun-joining-band.mp3"

  - title: "World Domination: Blurryface Era"
    duration: "25:00"
    content:
      - narration: "narration/03-blurryface.mp3"
      - music: "Blurryface/Stressed Out.mp3"
      - music: "Blurryface/Ride.mp3"
      - interview: "interviews/grammy-performance.mp3"

output:
  audio: "rise-of-top-documentary.mp3"
  transcript: "rise-of-top-transcript.md"
```

### 5. Playlist

Simple M3U playlist generation for any grouping.

**YAML Structure:**

```yaml
type: playlist
name: "Taylor Swift - Deep Cuts"
description: "Non-single album tracks that deserve more love"
tracks:
  - path: "music/Taylor Swift/Fearless/The Way I Loved You.mp3"
    artist: "Taylor Swift"
    title: "The Way I Loved You"
    album: "Fearless"

  - path: "music/Taylor Swift/Red/Sad Beautiful Tragic.mp3"
    artist: "Taylor Swift"
    title: "Sad Beautiful Tragic"
    album: "Red"

  - path: "music/Taylor Swift/1989/I Know Places.mp3"
    artist: "Taylor Swift"
    title: "I Know Places"
    album: "1989"

output:
  playlist: "taylor-swift-deep-cuts.m3u"
```

## Technical Implementation

### Playlist Generation (M3U Format)

```m3u
#EXTM3U
#PLAYLIST:DEMA Saga: Complete Story

#EXTART:Twenty One Pilots
#EXTINF:234,Ode to Sleep
/path/to/Vessel/01 Ode to Sleep.mp3

#EXTART:Twenty One Pilots
#EXTINF:197,Holding On To You
/path/to/Vessel/02 Holding On To You.mp3
```

### Chapter Markers (FFmetadata Format)

```
;FFMETADATA1
title=The Eras Tour - Opening Night
artist=Taylor Swift
date=2023

[CHAPTER]
TIMEBASE=1/1000
START=0
END=1395000
title=Lover Era

[CHAPTER]
TIMEBASE=1/1000
START=1395000
END=2142000
title=Fearless Era
```

### Video Concatenation

```bash
# Generate concat file
cat > concat.txt <<EOF
file 'footage/main-cam/lover-era.mp4'
file 'footage/main-cam/fearless-era.mp4'
file 'footage/main-cam/evermore-era.mp4'
EOF

# Merge with chapters
ffmpeg -f concat -safe 0 -i concat.txt \
  -i chapters.txt -map_metadata 1 \
  -c copy output.mp4
```

### Audio Compilation with Crossfade

```bash
# Concatenate with 3-second crossfade
ffmpeg -i segment1.mp3 -i segment2.mp3 \
  -filter_complex "[0][1]acrossfade=d=3" \
  output.mp3
```

## Narrative Documentation Template

```markdown
# DEMA Saga: Complete Narrative Guide

## Overview

The DEMA Saga spans four studio albums and tells the story of a dystopian city-state called DEMA, ruled by nine bishops who control citizens through propaganda and fear. The protagonist's journey from captivity to liberation mirrors themes of mental health, artistic expression, and finding authentic community.

## Key Characters

- **Tyler Joseph (Clancy)**: The narrator and protagonist
- **Josh Dun**: The Torchbearer, guide to freedom
- **The Nine Bishops**: Led by Nico and the Niners, represent control and conformity
- **The Banditos**: Rebels who escaped DEMA

## Album-by-Album Guide

### Act I: Emergence (Vessel, Blurryface)

**Vessel (2013)** introduces the internal struggle...

**Blurryface (2015)** personifies anxiety and depression as a character...

### Act II: Escape (Trench)

**Trench (2018)** reveals the geography of DEMA...

[Continue with detailed analysis]
```

## Workflow

1. **Select Assembly Type**: Determine which type fits the goal
2. **Define Structure**: Create YAML definition with all components
3. **Locate Source Files**: Use Glob to find referenced media
4. **Validate Availability**: Confirm all source files exist
5. **Generate Output**: Create playlist/video/documentation per type
6. **Report Results**: Summary of what was created and where

## Examples

### Example 1: Simple Playlist

```bash
aiwg assemble --type playlist \
  --name "Best of 2023" \
  --collection ~/Music/2023 \
  --output best-of-2023.m3u
```

### Example 2: Concert Film

```bash
aiwg assemble --type concert \
  --name "Eras Tour - Night 1" \
  --collection ~/Videos/ErasTour/2023-03-17 \
  --output eras-night1.mp4
```

### Example 3: Narrative Compilation

```bash
aiwg assemble --type narrative \
  --name "DEMA Saga" \
  --collection ~/Music/TwentyOnePilots \
  --output dema-saga/
```

## Output

All commands generate:
- Primary artifact (playlist/video/documentation)
- Assembly manifest (YAML definition used)
- Source verification report (what was found/missing)
- Generation log (commands executed, errors encountered)

Files are written to `--output` path or default location based on type.
