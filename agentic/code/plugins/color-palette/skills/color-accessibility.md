---
name: color-accessibility
description: WCAG accessibility analysis for color palettes including contrast ratios, compliance checking, and remediation suggestions. Use when user needs to verify colors meet accessibility standards.
version: 1.0.0
---

# Color Accessibility Skill

## Purpose

Analyze color palettes for WCAG 2.1 accessibility compliance. Calculate contrast ratios for all color pairs, identify failing combinations, and suggest fixes to meet AA or AAA standards.

## When This Skill Applies

- User asks "are these colors accessible?"
- User wants to "check contrast ratios"
- User needs "WCAG compliance" for a palette
- User asks about "color accessibility"
- User wants to ensure colors work for colorblind users
- User mentions "AA" or "AAA" standards

## Trigger Phrases

| Natural Language | Action |
|------------------|--------|
| "Check if these colors are accessible" | Full WCAG analysis |
| "What's the contrast ratio?" | Calculate specific pair ratio |
| "Make this palette AA compliant" | Analyze + suggest fixes |
| "Is this readable?" | Text contrast check |
| "Color blind friendly?" | Color vision deficiency check |
| "Fix the accessibility of this palette" | Remediation suggestions |

## Parameters

- `--palette <colors>` — Comma-separated color values to analyze
- `--foreground <color>` — Specific foreground color (for pair check)
- `--background <color>` — Specific background color (for pair check)
- `--standard <level>` — Target standard: A, AA (default), AAA
- `--fix` — Include remediation suggestions for failing pairs
- `--matrix` — Show full contrast matrix for all pairs

## Analysis Process

### 1. Parse Colors

Accept colors in any format and normalize to HEX + RGB + HSL:
- HEX: `#1a1a2e`, `#fff`
- RGB: `rgb(26, 26, 46)`
- HSL: `hsl(240, 28%, 14%)`
- Named: `navy`, `coral`, `forestgreen`

### 2. Calculate Relative Luminance

For each color, calculate relative luminance per WCAG 2.1:

```
For each channel (R, G, B):
  sRGB = channel / 255
  linear = sRGB <= 0.04045
           ? sRGB / 12.92
           : ((sRGB + 0.055) / 1.055) ^ 2.4

L = 0.2126 * R_linear + 0.7152 * G_linear + 0.0722 * B_linear
```

### 3. Calculate Contrast Ratios

For every foreground/background pair:

```
ratio = (max(L1, L2) + 0.05) / (min(L1, L2) + 0.05)
```

### 4. Evaluate Against Standards

| Standard | Normal Text (< 18pt) | Large Text (>= 18pt or 14pt bold) | UI Components |
|----------|---------------------|-----------------------------------|---------------|
| A | No minimum | No minimum | No minimum |
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | 4.5:1 |

### 5. Generate Contrast Matrix

For N colors, generate an N x N matrix:

```
Contrast Matrix (AA Standard)

           #1a1a2e  #16213e  #0f3460  #e94560  #ffffff
#1a1a2e      —      1.2:1   1.8:1    5.4:1    14.2:1
                     FAIL    FAIL     PASS     PASS
#16213e    1.2:1      —      1.5:1    4.5:1    11.8:1
           FAIL               FAIL    PASS     PASS
#0f3460    1.8:1    1.5:1      —      3.0:1     7.9:1
           FAIL     FAIL              FAIL     PASS
#e94560    5.4:1    4.5:1    3.0:1      —       2.6:1
           PASS     PASS     FAIL              FAIL
#ffffff   14.2:1   11.8:1    7.9:1    2.6:1      —
           PASS     PASS     PASS     FAIL
```

### 6. Color Vision Deficiency Check

Simulate how the palette appears under common color vision deficiencies:

| Type | Prevalence | Affected Colors |
|------|-----------|----------------|
| Protanopia (no red) | ~1% males | Red-green confusion |
| Deuteranopia (no green) | ~1% males | Red-green confusion |
| Tritanopia (no blue) | ~0.003% | Blue-yellow confusion |
| Achromatopsia (no color) | ~0.003% | All hues lost |

Check that colors remain distinguishable under each simulation. Flag pairs that become indistinguishable.

### 7. Remediation Suggestions

When `--fix` is specified, for each failing pair suggest adjustments:

- Darken the darker color or lighten the lighter color
- Adjust saturation to increase perceived contrast
- Suggest the minimum lightness shift needed to pass
- Provide the adjusted color value

```
Failing pair: #0f3460 on #e94560 (3.0:1, needs 4.5:1)

Suggestions:
  Option A: Darken background → #0a2340 (ratio: 4.6:1) PASS
  Option B: Lighten foreground → #ff6b7f (ratio: 4.5:1) PASS
  Option C: Use white text instead → #ffffff on #e94560 (2.6:1) FAIL
            Use white on darkened → #ffffff on #c93050 (4.8:1) PASS
```

## Output Format

### Summary View (default)

```
Accessibility Report — AA Standard

Palette: #1a1a2e, #16213e, #0f3460, #e94560, #ffffff

Overall: 6/10 pairs pass AA (60%)

PASSING (6):
  #1a1a2e on #e94560  — 5.4:1  (AA normal text)
  #1a1a2e on #ffffff  — 14.2:1 (AAA normal + large)
  #16213e on #e94560  — 4.5:1  (AA normal text, borderline)
  #16213e on #ffffff  — 11.8:1 (AAA normal + large)
  #0f3460 on #ffffff  — 7.9:1  (AAA normal + large)
  #e94560 on #1a1a2e  — 5.4:1  (AA normal text)

FAILING (4):
  #1a1a2e on #16213e  — 1.2:1  (needs 4.5:1)
  #1a1a2e on #0f3460  — 1.8:1  (needs 4.5:1)
  #16213e on #0f3460  — 1.5:1  (needs 4.5:1)
  #e94560 on #ffffff  — 2.6:1  (needs 4.5:1)

Recommendations:
  - Avoid using dark colors on each other for text
  - #e94560 needs a darker variant for use on white backgrounds
  - Consider adding a dark text color (#1a1a2e) for light backgrounds
```

### Pair Check View

```
Contrast Check

Foreground: #e94560 (Coral Red)
Background: #1a1a2e (Dark Navy)

Contrast Ratio: 5.4:1

AA Normal Text (4.5:1):  PASS
AA Large Text  (3.0:1):  PASS
AAA Normal Text (7.0:1): FAIL (need 7.0:1)
AAA Large Text (4.5:1):  PASS
```

## Best Practices

1. **Test text on backgrounds, not just swatches** — A palette can look cohesive but fail for readability
2. **Check both directions** — Light text on dark AND dark text on light
3. **Include white and near-black** — Most palettes need a light and dark neutral for text
4. **Don't rely on color alone** — Use icons, patterns, or labels alongside color for meaning
5. **Test at actual sizes** — Large text thresholds are different from normal text
6. **Consider dark mode** — Recalculate for dark mode backgrounds
