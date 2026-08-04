---
name: color-trends
description: Research current color trends from Pantone, architecture, film, and design. Use when user asks about trending colors, popular palettes, or wants research-backed color inspiration.
version: 1.0.0
---

# Color Trends Skill

## Purpose

Research and report on current color trends across Pantone selections, architecture, film color grading, web/brand design, and cultural context. Provides research-backed inspiration grounded in real-world sources.

## When This Skill Applies

- User asks about "trending colors" or "popular palettes"
- User wants to know the "Pantone Color of the Year"
- User asks about "colors used in recent films"
- User wants "architecture color trends"
- User needs "design trend" color research
- User asks "what colors are popular right now?"

## Trigger Phrases

| Natural Language | Action |
|------------------|--------|
| "What are the trending colors right now?" | Research across all categories |
| "What's the Pantone Color of the Year?" | Pantone-specific research |
| "What colors are popular in architecture?" | Architecture trend research |
| "Show me film color palettes" | Film color grading research |
| "Current web design color trends" | Design trend research |
| "What colors are trending for 2025-2026?" | Year-specific trend research |

## Parameters

- `--category <name>` — Focus category: pantone, architecture, film, design, cultural, all. Default: all
- `--year <YYYY>` or `--year <YYYY-YYYY>` — Year or range. Default: current year
- `--region <name>` — Regional focus (optional): global, north-america, europe, asia, nordic, mediterranean

## Research Process

### 1. Pantone Research

Search for:
- Pantone Color of the Year (current and recent 3 years)
- Pantone seasonal trend reports (Fashion, Home + Interiors)
- Pantone color palettes by season

**Sources to query**:
- Pantone official announcements
- Design press coverage of Pantone selections
- Industry analysis of Pantone trends

**Output fields**:
- Color name and code (e.g., "Peach Fuzz" Pantone 13-1023)
- Approximate HEX equivalent
- Context: why this color was selected
- How it appears in current design

### 2. Architecture Research

Search for:
- Contemporary architecture color palettes (last 12 months)
- Interior design color trends
- Notable building projects and their color choices
- Material color trends (concrete, wood, metal finishes)

**Sources to query**:
- Architectural Digest color features
- Dezeen color and material articles
- ArchDaily project color analysis
- Interior design trend reports

**Output fields**:
- Trending palette with HEX approximations
- Source projects or designers
- Material context (paint, tile, facade, furniture)
- Regional variations

### 3. Film Research

Search for:
- Notable color palettes from recent/acclaimed films
- Color grading trends in cinema
- Cinematographer color choices

**Sources to query**:
- Cinematography discussions and breakdowns
- StudioBinder color analysis articles
- Film color palette databases
- Award-season films with distinctive color work

**Output fields**:
- Film name, year, cinematographer
- Dominant palette (3-5 colors with HEX)
- Color grading style description
- Mood and narrative use of color

### 4. Design Trends Research

Search for:
- Current web design color trends
- Branding color trends
- UI/UX color patterns
- Print design color directions

**Sources to query**:
- Dribbble and Behance trend reports
- AIGA design trend articles
- Material Design and Apple HIG updates
- CSS/web design color trend articles

**Output fields**:
- Trending palettes with HEX values
- Usage context (web, mobile, print, branding)
- Style associations (glassmorphism, brutalism, soft UI)

### 5. Cultural Context Research

Search for:
- Regional color preferences
- Seasonal color associations
- Cultural color meanings (to avoid)
- Holiday and event color trends

**Output fields**:
- Regional palette preferences
- Cultural considerations for global audiences
- Seasonal appropriateness

## Output Format

Uses `templates/trend-report.md` template. Summary format:

```
Color Trends Report — 2025-2026

PANTONE
  Color of the Year 2025: Mocha Mousse (17-1230)
  ≈ #A47764  ██████  Warm, comforting, indulgent
  Recent: Peach Fuzz (2024), Viva Magenta (2023)

ARCHITECTURE
  Trending: Warm earth tones, terracotta, sage green
  #C67B5C  ██████  Terracotta
  #9CAF88  ██████  Sage
  #DCD0C0  ██████  Warm Stone
  Notable: [Project/source reference]

FILM
  "Dune: Part Two" (2024) — Greig Fraser
  #C4A35A  ██████  Desert Gold
  #2B2118  ██████  Shadow Brown
  #8B7355  ██████  Sand
  Style: Warm desaturated, golden-hour emphasis

DESIGN
  Web/UI: Gradients returning, purple-blue dominance
  #6C63FF  ██████  Electric Indigo
  #FF6B6B  ██████  Coral Pop
  #2D2B55  ██████  Deep Purple
  Pattern: Bold gradients with dark mode priority

Sources: [list of URLs searched]
```

## Important Notes

- All trend data comes from web search — results are as current as the search allows
- HEX values for Pantone colors are approximations (Pantone is a proprietary system)
- Film palettes are extracted from analysis, not official sources
- Always cite sources when reporting trends
- Acknowledge when information may be from a prior year vs. current
