---
name: color-palette
description: Generate, analyze, compare, export, and suggest color palettes using color theory. Use when user asks about colors, palettes, color schemes, or needs help choosing colors for a project.
version: 1.0.0
---

# Color Palette Skill

## Purpose

Provide comprehensive color palette tooling: generate palettes from seed colors, analyze existing palettes, compare options, export to development formats, and suggest palettes based on project context.

## When This Skill Applies

- User asks to "generate a color palette" or "pick colors"
- User provides a color and wants complementary/matching colors
- User asks to "analyze this palette" or "check these colors"
- User wants to export colors to CSS, Tailwind, or design tokens
- User asks to compare two palettes
- User needs color suggestions for a project type or mood
- User wants to extract colors from an image

## Trigger Phrases

| Natural Language | Action |
|------------------|--------|
| "Generate a palette from #3498db" | Generate palette with seed color |
| "What colors go with forest green?" | Generate complementary/harmony palettes |
| "Analyze this palette: #1a1a2e, #e94560" | Run harmony + contrast + mood analysis |
| "Compare these two palettes" | Side-by-side comparison |
| "Export my palette as Tailwind config" | Format conversion |
| "Suggest colors for a fintech app" | Industry-aware suggestion |
| "Extract colors from this image" | Dominant color extraction |
| "I need a dark mode version of this palette" | Light/dark variant generation |

## Subcommands

### generate

Generate a palette from a seed color, mood, or theme.

**Parameters**:
- `--seed <color>` — Starting color (HEX, RGB, or HSL)
- `--harmony <model>` — Harmony model (complementary, analogous, triadic, split-complementary, tetradic, monochromatic). Default: analogous
- `--count <N>` — Number of colors to generate. Default: 5
- `--mood <text>` — Mood descriptor (professional, playful, calm, energetic, luxurious, natural)
- `--temperature <warm|cool|neutral>` — Color temperature bias

**Process**:

1. Parse the seed color into HSL for manipulation
2. Apply the selected harmony model:

| Model | Algorithm |
|-------|-----------|
| Complementary | Seed + (hue + 180 degrees) |
| Analogous | Seed + (hue +/- 30 degrees) |
| Triadic | Seed + (hue + 120) + (hue + 240) |
| Split-complementary | Seed + (hue + 150) + (hue + 210) |
| Tetradic | Seed + (hue + 90) + (hue + 180) + (hue + 270) |
| Monochromatic | Seed at varied lightness (20%, 40%, 60%, 80%) and saturation |

3. Adjust for mood if specified:
   - Professional: reduce saturation 10-20%, medium lightness
   - Playful: increase saturation 10-20%, varied lightness
   - Calm: reduce saturation 20-30%, shift toward blue/green hues
   - Energetic: increase saturation, shift toward warm hues
   - Luxurious: deep tones, add gold (#C9A96E) or dark accent
   - Natural: earth tones, greens, warm browns

4. Generate tints and shades to fill count if needed
5. Output the palette with visualization

**Output Format**:

```
Palette: Triadic from #2D5A27

  #2D5A27  ██████  Forest Green    (H:113 S:37% L:25%)
  #27355A  ██████  Navy Shadow     (H:220 S:37% L:25%)
  #5A2735  ██████  Burgundy Dark   (H:347 S:37% L:25%)
  #4A8A3F  ██████  Leaf Green      (H:113 S:37% L:39%)  [tint]
  #3F558A  ██████  Steel Blue      (H:220 S:37% L:39%)  [tint]

Harmony: Triadic (120 degree separation)
Temperature: Cool-neutral
Mood: Natural, grounded, trustworthy
```

### analyze

Analyze an existing palette for harmony, contrast, accessibility, and mood.

**Parameters**:
- `--palette <colors>` — Comma-separated color values

**Process**:

1. Parse all colors into HEX, RGB, and HSL
2. Identify the closest harmony model
3. Calculate all pairwise contrast ratios (WCAG formula)
4. Determine color temperature (average hue warmth)
5. Assess color psychology associations
6. Score overall palette coherence

**Output**: Uses `templates/palette-report.md` template.

### compare

Compare two or more palettes side-by-side.

**Parameters**:
- `--a <colors>` — First palette
- `--b <colors>` — Second palette
- `--criteria <list>` — What to compare (harmony, contrast, accessibility, mood, temperature). Default: all

**Output**:

```
Palette Comparison

              Palette A              Palette B
Colors:       #264653,#2a9d8f,...    #1a1a2e,#16213e,...
Harmony:      Analogous              Monochromatic
Temperature:  Cool                   Cool
Mood:         Calm, trustworthy      Dark, mysterious
WCAG AA:      4/6 pairs pass         3/6 pairs pass
Avg Contrast: 5.2:1                  4.1:1
Winner:       ← Better accessibility → Stronger mood coherence
```

### export

Export palette in a target development format.

**Parameters**:
- `--palette <colors>` — Colors to export
- `--format <fmt>` — Target format: hex, rgb, hsl, css, tailwind, tokens
- `--names <list>` — Optional semantic names (primary, secondary, accent, etc.)

**Output by format**:

#### CSS Custom Properties
```css
:root {
  --color-primary: #264653;
  --color-secondary: #2a9d8f;
  --color-accent: #e9c46a;
  --color-warning: #f4a261;
  --color-danger: #e76f51;
}
```

#### Tailwind Config
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#264653',
        secondary: '#2a9d8f',
        accent: '#e9c46a',
        warning: '#f4a261',
        danger: '#e76f51',
      },
    },
  },
}
```

#### Design Tokens (JSON)
```json
{
  "color": {
    "primary": { "value": "#264653", "type": "color" },
    "secondary": { "value": "#2a9d8f", "type": "color" },
    "accent": { "value": "#e9c46a", "type": "color" },
    "warning": { "value": "#f4a261", "type": "color" },
    "danger": { "value": "#e76f51", "type": "color" }
  }
}
```

#### HEX List
```
#264653
#2a9d8f
#e9c46a
#f4a261
#e76f51
```

#### RGB
```
rgb(38, 70, 83)
rgb(42, 157, 143)
rgb(233, 196, 106)
rgb(244, 162, 97)
rgb(231, 111, 81)
```

#### HSL
```
hsl(195, 37%, 24%)
hsl(173, 58%, 39%)
hsl(43, 74%, 66%)
hsl(27, 87%, 67%)
hsl(12, 76%, 61%)
```

### from-image

Extract dominant colors from an image.

**Parameters**:
- Positional: path to image file
- `--count <N>` — Number of dominant colors to extract. Default: 5

**Process**:

1. Read the image file
2. If the platform supports image analysis (multimodal), analyze the image directly to identify dominant colors
3. Report extracted palette with approximate HEX values
4. Optionally run analysis on the extracted palette

**Note**: Accuracy depends on the AI model's visual capabilities. For pixel-perfect extraction, recommend external tools like `imagemagick` or `colorthief`.

### suggest

Suggest palettes based on project type, mood, or industry.

**Parameters**:
- `--industry <name>` — Industry vertical (healthcare, fintech, education, food, fashion, tech, legal, nonprofit)
- `--style <name>` — Visual style (modern, classic, bold, minimal, organic, retro)
- `--mood <name>` — Desired mood (trustworthy, energetic, calm, luxurious, playful, professional)
- `--accessibility <level>` — Required WCAG level (A, AA, AAA)
- `--count <N>` — Number of suggestions. Default: 3

**Process**:

1. Research industry color conventions:

| Industry | Common Palettes | Reasoning |
|----------|----------------|-----------|
| Healthcare | Blues, greens, whites | Trust, cleanliness, calm |
| Fintech | Navy, teal, gold accents | Trust, stability, premium |
| Education | Bright primaries, warm accents | Energy, approachability |
| Food | Warm reds, oranges, greens | Appetite, freshness |
| Fashion | Black, white, bold accent | Sophistication, contrast |
| Tech | Blues, purples, gradients | Innovation, reliability |
| Legal | Navy, burgundy, gold | Authority, tradition |
| Nonprofit | Greens, earth tones, warm hues | Growth, community |

2. Apply style modifiers (modern = cleaner tones, retro = muted/dusty, bold = high saturation)
3. Apply mood adjustments
4. Verify accessibility compliance if level specified
5. Generate 3 distinct options with rationale

**Output**:

```
Palette Suggestions: Healthcare + Modern + AA

Option 1: "Clinical Trust"
  #1B4965  ██████  Deep Teal
  #5FA8D3  ██████  Sky Blue
  #BEE9E8  ██████  Mint Wash
  #62B6CB  ██████  Ocean
  #CAE9FF  ██████  Ice Blue
  Rationale: Classic healthcare blues with modern teal anchor.
  AA compliant: Yes (all text pairs meet 4.5:1)

Option 2: "Wellness Green"
  #2D6A4F  ██████  Forest
  #40916C  ██████  Sage
  #74C69D  ██████  Mint
  #B7E4C7  ██████  Seafoam
  #D8F3DC  ██████  Whisper Green
  Rationale: Nature-forward palette conveying growth and wellness.
  AA compliant: Yes (dark-on-light pairs meet 4.5:1)

Option 3: "Modern Care"
  #2B2D42  ██████  Charcoal
  #8D99AE  ██████  Cool Gray
  #EDF2F4  ██████  Snow
  #EF233C  ██████  Alert Red
  #D90429  ██████  Emergency
  Rationale: High-contrast modern palette with clear alert hierarchy.
  AA compliant: Yes (strong contrast ratios)
```

## Color Theory Reference

### Harmony Models

The color wheel is divided into 360 degrees of hue. Harmony models define mathematical relationships between hues:

- **Complementary** (180 degrees): Maximum contrast, vibrant when used together
- **Analogous** (30 degrees): Harmonious, found in nature, low contrast
- **Triadic** (120 degrees): Balanced, vibrant even at low saturation
- **Split-complementary** (150/210 degrees): Contrast with less tension than complementary
- **Tetradic** (90 degree intervals): Rich palette, works best with one dominant color
- **Monochromatic** (single hue): Unified, elegant, relies on value/saturation contrast

### Color Psychology

| Color Family | Associations | Common Uses |
|-------------|--------------|-------------|
| Red | Energy, urgency, passion, danger | CTAs, errors, food brands |
| Orange | Creativity, enthusiasm, warmth | Accents, notifications, food |
| Yellow | Optimism, attention, caution | Highlights, warnings |
| Green | Growth, health, nature, money | Success states, eco brands |
| Blue | Trust, calm, professionalism | Corporate, tech, healthcare |
| Purple | Luxury, creativity, mystery | Premium brands, creative tools |
| Pink | Playfulness, compassion, romance | Fashion, beauty, youth brands |
| Brown | Stability, earthiness, warmth | Organic brands, vintage |
| Black | Sophistication, power, elegance | Luxury, fashion, typography |
| White | Cleanliness, simplicity, space | Backgrounds, minimalism |
| Gray | Neutrality, balance, professionalism | UI surfaces, text |

### Contrast Ratio Calculation

The WCAG 2.1 contrast ratio formula:

```
Relative luminance L = 0.2126 * R + 0.7152 * G + 0.0722 * B
(where R, G, B are linearized: value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)^2.4)

Contrast ratio = (L1 + 0.05) / (L2 + 0.05)
(where L1 is the lighter color's luminance, L2 is the darker)
```

### Temperature

- **Warm**: Hues 0-60 and 300-360 (reds, oranges, yellows, magentas)
- **Cool**: Hues 120-270 (greens, blues, purples)
- **Neutral**: Hues 60-120 and 270-300 (yellow-greens, violet transitions), or desaturated colors

## Terminal Visualization

When displaying palettes in the terminal, use ANSI 24-bit color escape sequences for color blocks:

```
\033[48;2;R;G;Bm      \033[0m   # Background color block
```

Display format:
```
#RRGGBB  ██████  Color Name    (H:xxx S:xx% L:xx%)
```

If the terminal does not support 24-bit color, fall back to the closest 256-color or 16-color ANSI code.

## Light/Dark Mode Variants

When generating light/dark mode variants:

**Light mode** (from a base palette):
- Background: lightest color or white
- Surface: second-lightest or tinted white
- Text: darkest color or near-black
- Primary: mid-range saturated color
- Accent: most vibrant color

**Dark mode** (from a base palette):
- Background: darkest color or near-black
- Surface: slightly lighter than background
- Text: lightest color or near-white
- Primary: lighter/more saturated variant of light-mode primary
- Accent: same hue, increased lightness for visibility

Ensure all text/background pairs meet WCAG AA (4.5:1) in both modes.
