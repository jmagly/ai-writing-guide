---
description: Analyze an artist's discography to identify eras, catalog structure, and collection plan
category: media-curator
argument-hint: "<artist_name>" [--scope complete|era:NAME|style:NAME] [--depth quick|moderate|thorough]
allowed-tools: WebSearch, WebFetch, Read, Write, Bash
model: sonnet
---

# /analyze-artist

## Purpose

The `/analyze-artist` command performs comprehensive discography research for a musical artist, producing a structured YAML profile that identifies creative eras, recommends catalog organization, and guides collection development. This command is the entry point for the Media Curator framework's artist-centric workflow.

## Parameters

### Required

**`<artist_name>`**
- The artist or band name to analyze
- Supports aliases and common alternate names
- Example: `"Twenty One Pilots"`, `"Radiohead"`, `"Kendrick Lamar"`

### Optional

**`--scope <scope_type>`**
- Controls the breadth of analysis
- Default: `complete`
- Options:
  - `complete` - Full discography across all eras
  - `era:<era_name>` - Focus on specific creative period (e.g., `era:Blurryface`)
  - `style:<style_name>` - Focus on releases matching style tag (e.g., `style:acoustic`)

**`--depth <depth_level>`**
- Controls research thoroughness and time investment
- Default: `thorough`
- Options:
  - `quick` - MusicBrainz canonical releases only, basic era detection (2-5 min)
  - `moderate` - MusicBrainz + Discogs cross-reference, standard era analysis (5-15 min)
  - `thorough` - Full multi-source research, narrative analysis, gap identification (15-45 min)

**`--output <file_path>`**
- Specify custom output location for YAML profile
- Default: `.aiwg/media-curator/profiles/<artist-slug>.yaml`
- Example: `--output ~/music/analysis/radiohead.yaml`

**`--format <format_type>`**
- Output format for artist profile
- Default: `yaml`
- Options:
  - `yaml` - Structured YAML profile (default, machine-readable)
  - `markdown` - Human-readable Markdown report with embedded YAML
  - `json` - JSON format for programmatic integration

**`--include-unofficial`**
- Include bootlegs, demos, and unofficial releases in analysis
- Default: `false` (official releases only)
- When enabled, adds `unofficial` section to YAML output

**`--interactive`**
- Enable interactive mode for era boundary decisions
- Default: `false` (automated analysis)
- Prompts user at ambiguous era transitions for input

## Workflow

### Phase 1: Artist Identification

1. Query MusicBrainz for artist MBID using provided name
2. Resolve aliases and display disambiguation options if multiple matches
3. Retrieve artist metadata (active years, genres, relationships)

**Example Query**:
```bash
curl "https://musicbrainz.org/ws/2/artist/?query=artist:Twenty%20One%20Pilots&fmt=json"
```

### Phase 2: Release Discovery

1. Fetch complete release groups from MusicBrainz
2. Cross-reference Discogs for variant pressings and bootlegs (if `--include-unofficial`)
3. Filter by release type (album, EP, single, live, compilation)
4. Sort chronologically by earliest release date

**Data Points Collected**:
- Release title and MBID
- Release date (year-month-day)
- Release type and status (official, promotion, bootleg)
- Label and catalog number
- Track count and total duration
- Associated credits (producers, featured artists)

### Phase 3: Era Detection

1. Analyze temporal clustering of releases
2. Identify lineup changes, label transitions, genre shifts
3. Review Wikipedia and AllMusic for contextual markers
4. Detect narrative arcs and concept album sequences
5. Establish era boundaries with supporting evidence

**Detection Signals** (see @agentic/code/frameworks/media-curator/agents/discography-analyst.md for complete signal taxonomy):
- Musical evolution (genre tags, production style)
- Contextual changes (label, location, collaborators)
- Narrative markers (artist statements, concept albums)
- Temporal patterns (recording gaps, intensive output periods)

### Phase 4: Special Collections Identification

1. Identify narrative arcs (concept album sequences, trilogy structures)
2. Detect acoustic sessions, live recordings, remix projects
3. Map collaborations and featuring appearances
4. Highlight demo collections and pre-label material

### Phase 5: Catalog Structure Recommendation

1. Design directory hierarchy reflecting eras and special collections
2. Define organization principles (chronological, thematic, hybrid)
3. Recommend segregation of unofficial material
4. Provide implementation-ready file system structure

### Phase 6: Gap Analysis

1. Compare collection against canonical discography
2. Identify missing releases by priority (essential, recommended, optional)
3. Note availability status (in-print, out-of-print, digital-only, unreleased)
4. Flag high-value acquisitions for collection completion

### Phase 7: Output Generation

1. Structure findings into YAML schema (see Output Format section)
2. Write to specified output location or default path
3. Display summary report with key findings
4. Provide next-step recommendations

## Output Format

### YAML Artist Profile

```yaml
artist:
  name: "Artist Name"
  mbid: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  discogs_id: "123456"
  active_years: "YYYY-YYYY"
  genres:
    - "Primary Genre"
    - "Secondary Genre"

analysis_metadata:
  generated: "YYYY-MM-DD HH:MM:SS"
  depth: "thorough"
  scope: "complete"
  sources:
    - "MusicBrainz"
    - "Discogs"
    - "Wikipedia"
    - "AllMusic"

eras:
  - name: "Era Name"
    period: "YYYY-YYYY"
    description: |
      Multi-line narrative description of the creative period,
      including key characteristics, influences, and significance.
    key_characteristics:
      - "Musical trait or innovation"
      - "Thematic or lyrical focus"
      - "Production or collaboration pattern"
    boundary_markers:
      start: "Event or release marking era beginning"
      end: "Event or release marking era conclusion"
    releases:
      - title: "Release Title"
        year: YYYY
        type: "studio" | "live" | "compilation" | "ep" | "single"
        mbid: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        discogs_id: "123456"
        label: "Label Name"
        significance: "Major album" | "Transitional work" | "Definitive statement" | "Minor release"
        tracks: 12
        duration: "45:30"

special_collections:
  - name: "Collection Name"
    type: "narrative_arc" | "acoustic_sessions" | "live_recordings" | "remixes" | "demos" | "collaborations"
    description: |
      Purpose and scope of the special collection,
      including curatorial rationale.
    releases:
      - "Release Title (Year)"
    recommended_location: "catalog/special/collection-slug/"
    curation_notes: |
      Additional context for organizing this collection,
      such as playback order or thematic grouping.

collaborations:
  - artist: "Collaborator Name"
    mbid: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    releases:
      - title: "Release Title"
        year: YYYY
        nature: "featuring" | "production" | "side_project" | "remix" | "tribute"

related_content:
  - type: "solo_projects"
    description: "Band member solo work or side projects"
    items:
      - name: "Project Name"
        artist: "Artist Name"
        mbid: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  - type: "affiliated_artists"
    description: "Frequent collaborators or label mates"
    items:
      - name: "Artist Name"
        mbid: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

catalog_structure:
  recommended_hierarchy: |
    artist-name/
      01-early-era/
        YYYY-release-title/
      02-breakthrough-era/
        YYYY-release-title/
      03-mature-era/
        YYYY-release-title/
      special/
        narrative-projects/
          trilogy-name/
            part-1/
            part-2/
            part-3/
        acoustic-sessions/
        live-recordings/
      collaborations/
        artist-name/
      unofficial/
        demos/
        bootlegs/

  organization_principles:
    - "Primary hierarchy: chronological eras"
    - "Secondary hierarchy: release type and significance"
    - "Special collections isolated for thematic coherence"
    - "Unofficial material clearly segregated"
    - "Directory names: YYYY-kebab-case-title"

  implementation_notes: |
    Specific guidance for applying the catalog structure,
    including edge cases and naming conventions.

gaps:
  - description: "Missing release or material"
    release_title: "Release Title"
    year: YYYY
    type: "studio" | "live" | "compilation" | "ep" | "single"
    priority: "essential" | "recommended" | "optional"
    availability: "in-print" | "out-of-print" | "digital-only" | "unreleased"
    acquisition_notes: |
      Guidance on obtaining this release, such as
      reissue availability, streaming platforms, or secondary market.

summary:
  total_releases: 42
  eras_identified: 5
  special_collections: 3
  gaps_essential: 2
  gaps_recommended: 5
  gaps_optional: 8
  collection_completion: "85%"

recommendations:
  next_steps:
    - "Acquire essential gaps: Release A, Release B"
    - "Organize existing collection into era-based directory structure"
    - "Research bootlegs for Era Name to assess quality and historical value"
  curatorial_focus:
    - "DEMA narrative arc is core to artist identity - prioritize complete trilogy"
    - "Early regional material has high fan value but limited commercial availability"
```

### Markdown Report Format

When `--format markdown` is specified:

```markdown
# Artist Name - Discography Analysis

**Generated**: YYYY-MM-DD HH:MM:SS
**Scope**: Complete discography
**Depth**: Thorough research

## Artist Overview

- **Active Years**: YYYY-YYYY
- **Genres**: Genre A, Genre B, Genre C
- **MusicBrainz ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Discogs ID**: `123456`

## Creative Eras

### Era Name (YYYY-YYYY)

Multi-line narrative description...

**Key Characteristics**:
- Characteristic 1
- Characteristic 2

**Releases**:
1. **Release Title** (YYYY) - studio - Significance note
2. **Release Title** (YYYY) - ep - Significance note

---

### Era Name (YYYY-YYYY)

...

## Special Collections

### Collection Name

**Type**: narrative_arc
**Description**: Purpose and scope...

**Releases**:
- Release Title (YYYY)
- Release Title (YYYY)

**Recommended Location**: `catalog/special/collection-slug/`

---

## Catalog Structure

```
artist-name/
  01-early-era/
  02-breakthrough-era/
  ...
```

**Organization Principles**:
- Chronological eras
- Special collections isolated
- Unofficial material segregated

## Collection Gaps

### Essential
1. **Release Title** (YYYY) - Out of print - Acquisition notes...

### Recommended
1. **Release Title** (YYYY) - Digital only - Acquisition notes...

## Summary

- **Total Releases**: 42
- **Eras Identified**: 5
- **Collection Completion**: 85%

## Next Steps

1. Acquire essential gaps: Release A, Release B
2. Organize existing collection into era-based structure
3. Research bootlegs for quality assessment

---

## YAML Profile

```yaml
artist:
  name: "Artist Name"
  ...
```
(Full YAML embedded at end of Markdown report)
```

## Examples

### Example 1: Basic Complete Analysis

```bash
/analyze-artist "Radiohead"
```

**Output**: Thorough analysis of Radiohead's complete discography with eras (Pablo Honey, The Bends, OK Computer era, Kid A/Amnesiac era, In Rainbows era, etc.), special collections (In Rainbows/King of Limbs narrative arc), and catalog structure.

**Saved to**: `.aiwg/media-curator/profiles/radiohead.yaml`

### Example 2: Quick Single-Era Analysis

```bash
/analyze-artist "Kendrick Lamar" --scope era:DAMN --depth quick
```

**Output**: Rapid analysis focusing only on the DAMN era (2017), including the album, related singles, and immediate context. Minimal external research beyond MusicBrainz canonical data.

**Saved to**: `.aiwg/media-curator/profiles/kendrick-lamar-damn-era.yaml`

### Example 3: Thorough Analysis with Unofficial Material

```bash
/analyze-artist "Nirvana" --include-unofficial --depth thorough
```

**Output**: Complete Nirvana discography including official studio albums (Bleach, Nevermind, In Utero), live albums, compilations, AND bootlegs, demos, radio sessions. Unofficial material segregated in YAML output.

**Saved to**: `.aiwg/media-curator/profiles/nirvana.yaml`

### Example 4: Custom Output Location and Format

```bash
/analyze-artist "Pink Floyd" --format markdown --output ~/Documents/pink-floyd-analysis.md
```

**Output**: Human-readable Markdown report with embedded YAML, saved to specified location outside AIWG default directory.

**Saved to**: `~/Documents/pink-floyd-analysis.md`

### Example 5: Interactive Era Boundary Decisions

```bash
/analyze-artist "The Beatles" --interactive
```

**Output**: Standard analysis with interactive prompts at ambiguous era transitions:

```
Era boundary detected: 1965-1966

Possible interpretations:
1. "Rubber Soul / Revolver" as single psychedelic transition era
2. "Rubber Soul" as final pop era, "Revolver" as first experimental era
3. Combined "Mid-Period Beatles" (1965-1967) including Sgt. Pepper's

Enter selection (1-3) or provide custom era name:
```

User input guides final era structure in YAML output.

### Example 6: Style-Focused Analysis

```bash
/analyze-artist "Bon Iver" --scope style:acoustic --depth moderate
```

**Output**: Analysis focusing only on acoustic or folk-oriented releases, filtering out electronic experiments like "22, A Million". Useful for genre-specific collection curation.

**Saved to**: `.aiwg/media-curator/profiles/bon-iver-acoustic.yaml`

## Integration with Media Curator Workflow

The `/analyze-artist` command outputs YAML that feeds downstream Media Curator agents and commands:

1. **Collection Planner** (`/plan-collection`): Uses gap analysis and priority rankings to build acquisition roadmap
2. **Metadata Enricher** (`/enrich-metadata`): Applies MBIDs, Discogs IDs, and era tags to existing music files
3. **Quality Assessor** (`/assess-quality`): Prioritizes high-significance releases for quality upgrades (lossless, remaster, vinyl rip)
4. **Catalog Organizer** (`/organize-catalog`): Implements recommended directory hierarchy, moves files into era-based structure
5. **Listening Queue Generator** (`/queue-listening`): Creates chronological or thematic playlists based on era structure

## Invocation by Discography Analyst Agent

When the Discography Analyst agent is active, `/analyze-artist` can be invoked implicitly through natural language:

**User**: "Analyze Twenty One Pilots discography"

**Agent Response**: Executes `/analyze-artist "Twenty One Pilots" --depth thorough` and returns YAML profile with summary.

**User**: "Focus on the DEMA era"

**Agent Response**: Executes `/analyze-artist "Twenty One Pilots" --scope era:DEMA` and provides detailed breakdown of Blurryface/Trench/Clancy trilogy.

## Error Handling

### Artist Not Found

```
Error: No artist found matching "Artst Name"

Did you mean:
  1. Artist Name (MBID: xxxxxxxx...)
  2. Artist Name Jr. (MBID: yyyyyyyy...)

Enter selection (1-2) or refine search:
```

### Ambiguous Artist Name

```
Multiple artists found for "John Williams":

  1. John Williams (film composer) - MBID: xxxxxxxx...
  2. John Williams (classical guitarist) - MBID: yyyyyyyy...
  3. John Williams (jazz pianist) - MBID: zzzzzzzz...

Enter selection (1-3):
```

### MusicBrainz API Unavailable

```
Error: MusicBrainz API unavailable (HTTP 503)

Retry options:
  1. Retry immediately
  2. Retry after 60 seconds
  3. Skip MusicBrainz, use Discogs only (degraded analysis)
  4. Abort command

Enter selection (1-4):
```

### Insufficient Data for Era Detection

```
Warning: Artist has only 2 studio albums, insufficient for era detection.

Analysis will use simplified structure:
  - Complete Works (YYYY-YYYY)

Proceed? (y/n):
```

## Performance Characteristics

| Depth Level | Data Sources | Avg Time | Output Size |
|-------------|--------------|----------|-------------|
| Quick | MusicBrainz only | 2-5 min | 5-15 KB |
| Moderate | MusicBrainz + Discogs | 5-15 min | 15-40 KB |
| Thorough | MusicBrainz + Discogs + Wikipedia + AllMusic | 15-45 min | 40-150 KB |

**Factors affecting duration**:
- Discography size (10 releases vs. 100+ releases)
- Era complexity (single-era artist vs. 6+ distinct periods)
- Unofficial material inclusion (bootlegs require extensive cross-referencing)
- API rate limits (MusicBrainz: 1 req/sec, Discogs: 60 req/min)

## Quality Standards

- **Completeness**: All officially released material identified (studio albums, EPs, singles, live albums, compilations)
- **Accuracy**: MBIDs and Discogs IDs verified against canonical sources
- **Coherence**: Era boundaries justified with multiple detection signals (musical, contextual, narrative, temporal)
- **Actionability**: Catalog structure directly implementable in file systems (valid directory names, logical hierarchy)
- **Transparency**: Classification decisions documented with rationale (why this release is "studio" not "demo", why this era boundary here)

## Limitations

- Requires internet access for MusicBrainz, Discogs, Wikipedia, AllMusic queries
- Era identification is interpretive; command provides evidence-based recommendations, not absolute truth
- Bootleg and unofficial material may have incomplete, conflicting, or absent metadata
- Very recent releases (< 6 months) may lack sufficient critical or historical context for era placement
- MusicBrainz and Discogs may have incomplete data for regional or non-Western artists

## See Also

- **Discography Analyst Agent**: @agentic/code/frameworks/media-curator/agents/discography-analyst.md
- **Media Curator Framework**: @agentic/code/frameworks/media-curator/README.md
- **Collection Planner Command**: @agentic/code/frameworks/media-curator/commands/plan-collection.md
- **Catalog Organizer Command**: @agentic/code/frameworks/media-curator/commands/organize-catalog.md
- **MusicBrainz API Documentation**: https://musicbrainz.org/doc/MusicBrainz_API
- **Discogs API Documentation**: https://www.discogs.com/developers

---

*Part of the AIWG Media Curator Framework*
*Command category: media-curator*
*Model: sonnet (Claude Sonnet 4.5)*
