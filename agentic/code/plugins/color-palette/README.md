# Color Palette Addon

Standalone addon for color palette selection, analysis, and trend research. Helps users explore, evaluate, and select desirable color palettes using color theory fundamentals, current trend research, and cultural context from architecture, film, and design.

## Installation

```bash
aiwg use color-palette
```

## Skills

| Skill | Purpose |
|-------|---------|
| `color-palette` | Generate, analyze, compare, export, and suggest palettes |
| `color-trends` | Research current color trends (Pantone, architecture, film, design) |
| `color-accessibility` | WCAG accessibility analysis and contrast scoring |

## Usage

```bash
# Generate a palette from a seed color
/color-palette generate --seed "#2D5A27" --harmony triadic

# Research current color trends
/color-palette trends --category film

# Analyze an existing palette
/color-palette analyze --palette "#1a1a2e,#16213e,#0f3460,#e94560"

# Compare two palettes
/color-palette compare --a "#1a1a2e,#16213e,#0f3460" --b "#264653,#2a9d8f,#e9c46a"

# Export palette to CSS/Tailwind/design tokens
/color-palette export --palette "#264653,#2a9d8f,#e9c46a,#f4a261,#e76f51" --format tailwind

# Extract palette from an image
/color-palette from-image path/to/image.png

# Get suggestions for a project type
/color-palette suggest --industry healthcare --style modern --accessibility AA

# Check accessibility of a palette
/color-accessibility --palette "#1a1a2e,#e94560" --standard AA
```

## Color Theory

The addon supports these harmony models:

| Model | Description |
|-------|-------------|
| Complementary | Two colors opposite on the wheel |
| Analogous | Three adjacent colors on the wheel |
| Triadic | Three colors equally spaced (120 degrees apart) |
| Split-complementary | Base + two colors adjacent to its complement |
| Tetradic | Four colors forming a rectangle on the wheel |
| Monochromatic | Variations of a single hue (lightness/saturation shifts) |

## Export Formats

- **HEX** — Standard hex codes (`#264653`)
- **RGB** — RGB values (`rgb(38, 70, 83)`)
- **HSL** — HSL values (`hsl(195, 37%, 24%)`)
- **CSS Custom Properties** — `--color-primary: #264653;`
- **Tailwind Config** — `colors: { primary: '#264653' }`
- **Design Tokens** — JSON design token format

## Accessibility

Contrast ratios are calculated per WCAG 2.1:
- **AA Normal Text**: minimum 4.5:1
- **AA Large Text**: minimum 3:1
- **AAA Normal Text**: minimum 7:1
- **AAA Large Text**: minimum 4.5:1

The addon generates a full contrast matrix showing all foreground/background combinations with pass/fail indicators.

## Standalone

This addon works independently of any framework. It does not require SDLC, marketing, or any other framework to be installed.
