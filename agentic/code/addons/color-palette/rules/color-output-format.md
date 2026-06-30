---
id: color-output-format
name: Color Output Format
enforcement: medium
scope: color-palette
description: Consistent formatting for all color output across the color-palette addon.
---

# Color Output Format

## Purpose

Ensure all color output from the color-palette addon uses a consistent, readable format that works across terminals and documentation.

## Rules

### 1. Always Show Multiple Representations

When displaying a color, include at minimum:
- HEX code (6-digit, lowercase, with `#` prefix)
- Visual swatch (ANSI color block if terminal supports it, or unicode block `██████`)
- Human-readable name (descriptive, not generic)

**Format**:
```
#rrggbb  ██████  Descriptive Name    (H:xxx S:xx% L:xx%)
```

### 2. HEX Normalization

- Always use 6-digit lowercase HEX: `#2d5a27` not `#2D5A27` or `#2d5a27ff`
- Expand 3-digit shorthand: `#fff` → `#ffffff`
- Strip alpha channel for display (note alpha separately if relevant)

### 3. Color Naming

Generate descriptive names, not generic labels:
- `Forest Green` not `Green`
- `Desert Gold` not `Yellow`
- `Steel Blue` not `Blue`
- `Burgundy Dark` not `Dark Red`

Use color name databases (X11, CSS named colors) as a starting point, then refine for specificity.

### 4. Palette Display Order

When displaying a palette:
1. Order by intended role (primary → secondary → accent → neutral) if roles are known
2. Otherwise order by hue (0-360 degrees)
3. Within same hue, order dark to light

### 5. Contrast Ratio Format

Always display contrast ratios as `X.X:1` with one decimal place:
- `4.5:1` not `4.51:1` or `4.5`
- Include pass/fail indicator: `4.5:1 PASS` or `2.3:1 FAIL`

### 6. Accessibility Indicators

Use clear indicators for compliance:
- `PASS` — meets the specified standard
- `FAIL` — does not meet the specified standard
- Specify which standard: `AA`, `AAA`, `AA Large Text`

### 7. No Color-Only Communication

Never convey meaning through color alone in output. Always pair color swatches with:
- Text labels
- HEX codes
- Pass/fail text indicators
