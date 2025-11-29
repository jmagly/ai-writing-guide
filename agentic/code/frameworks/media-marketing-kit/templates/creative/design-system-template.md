# Design System Specification

**Card ID**: `CRE-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | Active | Deprecated
**System Name**: {BRAND_NAME} Design System
**Last Updated**: {DATE}
**Owner**: {OWNER_NAME}

---

## Design System Overview

### Purpose

{What this design system is for and why it exists}

### Scope

| Application | Included |
|-------------|----------|
| Marketing website | Yes/No |
| Product UI | Yes/No |
| Email templates | Yes/No |
| Social media | Yes/No |
| Print materials | Yes/No |
| Presentations | Yes/No |

### Design Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| {Principle 1} | {What it means} | {How it manifests} |
| {Principle 2} | {What it means} | {How it manifests} |
| {Principle 3} | {What it means} | {How it manifests} |
| {Principle 4} | {What it means} | {How it manifests} |

---

## Color System

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| {Primary} | #{HEX} | R,G,B | Primary actions, brand moments |
| {Primary Dark} | #{HEX} | R,G,B | Hover states, emphasis |
| {Primary Light} | #{HEX} | R,G,B | Backgrounds, highlights |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| {Secondary} | #{HEX} | R,G,B | Supporting elements |
| {Secondary Dark} | #{HEX} | R,G,B | Hover states |
| {Secondary Light} | #{HEX} | R,G,B | Backgrounds |

### Neutral Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Black | #{HEX} | R,G,B | Primary text |
| Gray 900 | #{HEX} | R,G,B | Headings |
| Gray 700 | #{HEX} | R,G,B | Body text |
| Gray 500 | #{HEX} | R,G,B | Secondary text |
| Gray 300 | #{HEX} | R,G,B | Borders |
| Gray 100 | #{HEX} | R,G,B | Backgrounds |
| White | #FFFFFF | 255,255,255 | Backgrounds |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | #{HEX} | Positive states, confirmations |
| Warning | #{HEX} | Caution states |
| Error | #{HEX} | Error states, destructive actions |
| Info | #{HEX} | Informational states |

### Color Accessibility

| Combination | Contrast Ratio | WCAG Level |
|-------------|----------------|------------|
| Primary on White | {X}:1 | AA/AAA |
| Text on Background | {X}:1 | AA/AAA |
| {Combination} | {X}:1 | AA/AAA |

---

## Typography

### Font Families

| Usage | Font | Fallback |
|-------|------|----------|
| Headings | {Font Name} | {Fallback stack} |
| Body | {Font Name} | {Fallback stack} |
| Code | {Font Name} | monospace |

### Type Scale

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| Display 1 | {px/rem} | {ratio} | {weight} | Hero headlines |
| Display 2 | {px/rem} | {ratio} | {weight} | Section headlines |
| H1 | {px/rem} | {ratio} | {weight} | Page titles |
| H2 | {px/rem} | {ratio} | {weight} | Section titles |
| H3 | {px/rem} | {ratio} | {weight} | Subsections |
| H4 | {px/rem} | {ratio} | {weight} | Component titles |
| Body Large | {px/rem} | {ratio} | {weight} | Introductory text |
| Body | {px/rem} | {ratio} | {weight} | Default body |
| Body Small | {px/rem} | {ratio} | {weight} | Captions, labels |
| Caption | {px/rem} | {ratio} | {weight} | Metadata, fine print |

### Font Weights

| Name | Value | Usage |
|------|-------|-------|
| Regular | 400 | Body text |
| Medium | 500 | Emphasis, subheadings |
| Semibold | 600 | Headings |
| Bold | 700 | Strong emphasis |

### Typography Guidelines

- Maximum line length: {characters}
- Paragraph spacing: {rem/px}
- Heading margin bottom: {rem/px}
- Letter spacing adjustments: {guidelines}

---

## Spacing System

### Base Unit

Base unit: {4px / 8px}

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | {value} | Tight spacing |
| sm | {value} | Small elements |
| md | {value} | Default spacing |
| lg | {value} | Section spacing |
| xl | {value} | Large sections |
| 2xl | {value} | Major sections |
| 3xl | {value} | Page sections |

### Layout Spacing

| Context | Spacing |
|---------|---------|
| Component padding | {value} |
| Card padding | {value} |
| Section padding | {value} |
| Page margin | {value} |

---

## Layout & Grid

### Grid System

| Property | Value |
|----------|-------|
| Columns | 12 |
| Gutter | {value} |
| Margin | {value} |
| Max width | {value} |

### Breakpoints

| Name | Min Width | Columns | Gutter |
|------|-----------|---------|--------|
| Mobile | 0 | 4 | {value} |
| Tablet | {value}px | 8 | {value} |
| Desktop | {value}px | 12 | {value} |
| Wide | {value}px | 12 | {value} |

### Container Widths

| Breakpoint | Max Width |
|------------|-----------|
| Mobile | 100% |
| Tablet | {value}px |
| Desktop | {value}px |
| Wide | {value}px |

---

## Components

### Buttons

**Primary Button**
| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | {color} | {color} | none |
| Hover | {color} | {color} | none |
| Active | {color} | {color} | none |
| Disabled | {color} | {color} | none |

**Secondary Button**
| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | transparent | {color} | {color} |
| Hover | {color} | {color} | {color} |
| Active | {color} | {color} | {color} |
| Disabled | transparent | {color} | {color} |

**Button Sizes**
| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| Small | {value} | {value} | {value} |
| Medium | {value} | {value} | {value} |
| Large | {value} | {value} | {value} |

### Form Elements

**Input Fields**
| State | Border | Background | Text |
|-------|--------|------------|------|
| Default | {color} | {color} | {color} |
| Focus | {color} | {color} | {color} |
| Error | {color} | {color} | {color} |
| Disabled | {color} | {color} | {color} |

**Form Spacing**
| Element | Spacing |
|---------|---------|
| Label to input | {value} |
| Input to helper | {value} |
| Field to field | {value} |

### Cards

| Property | Value |
|----------|-------|
| Background | {color} |
| Border | {value} |
| Border radius | {value} |
| Shadow | {value} |
| Padding | {value} |

### Navigation

{Navigation component specifications}

---

## Iconography

### Icon Style

| Property | Specification |
|----------|---------------|
| Style | Outlined / Filled / Dual-tone |
| Stroke width | {value}px |
| Grid size | {value}px |
| Corner radius | {value}px |

### Icon Sizes

| Size | Dimensions | Usage |
|------|------------|-------|
| Small | {value}px | Inline, tight spaces |
| Medium | {value}px | Default |
| Large | {value}px | Feature areas |

### Icon Library

Source: {Icon library name and link}

---

## Imagery

### Photography Style

| Attribute | Guideline |
|-----------|-----------|
| Subjects | {Who/what to show} |
| Lighting | {Style} |
| Color treatment | {Guidelines} |
| Composition | {Rules} |

### Image Aspect Ratios

| Context | Ratio | Usage |
|---------|-------|-------|
| Hero | {16:9} | Hero sections |
| Feature | {4:3} | Feature images |
| Thumbnail | {1:1} | Cards, grids |
| Portrait | {3:4} | People |

### Image Quality

| Context | Minimum Resolution |
|---------|-------------------|
| Web hero | {width}px |
| Print | {DPI} |
| Social | {dimensions} |

---

## Motion & Animation

### Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| Ease out | cubic-bezier(0, 0, 0.2, 1) | Elements entering |
| Ease in | cubic-bezier(0.4, 0, 1, 1) | Elements exiting |
| Ease in-out | cubic-bezier(0.4, 0, 0.2, 1) | On-screen |

### Duration Scale

| Name | Duration | Usage |
|------|----------|-------|
| Instant | 0ms | State changes |
| Fast | {value}ms | Micro-interactions |
| Normal | {value}ms | Standard transitions |
| Slow | {value}ms | Emphasis |

### Animation Principles

- {Principle 1}
- {Principle 2}
- {Principle 3}

---

## Accessibility

### Requirements

| Requirement | Standard | Our Compliance |
|-------------|----------|----------------|
| Color contrast | WCAG AA (4.5:1) | {Status} |
| Focus indicators | Visible focus states | {Status} |
| Touch targets | Min 44x44px | {Status} |
| Screen reader | ARIA labels | {Status} |

### Keyboard Navigation

| Element | Keys | Behavior |
|---------|------|----------|
| Buttons | Enter, Space | Activate |
| Links | Enter | Navigate |
| Forms | Tab | Move focus |
| Modals | Escape | Close |

---

## Implementation

### Design Tokens

**Format**: {JSON / YAML / CSS variables}

```json
{
  "color": {
    "primary": "#000000",
    "secondary": "#000000"
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px"
  }
}
```

### Component Library

| Platform | Library | Status |
|----------|---------|--------|
| Web | {Library name} | {Status} |
| iOS | {Library name} | {Status} |
| Android | {Library name} | {Status} |

### Asset Downloads

| Asset | Format | Location |
|-------|--------|----------|
| Figma library | {Link} | {URL} |
| Sketch library | {Link} | {URL} |
| Icon library | SVG | {URL} |
| Logo kit | Various | {URL} |

---

## Governance

### Contribution Process

1. {Step 1}
2. {Step 2}
3. {Step 3}

### Review Cadence

| Review Type | Frequency | Participants |
|-------------|-----------|--------------|
| Component review | {Frequency} | {Who} |
| Full audit | {Frequency} | {Who} |

### Change Log

| Date | Change | Author |
|------|--------|--------|
| {Date} | {What changed} | {Who} |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {DATE} | {Name} | Initial system |

---

*Template version: 1.0 | MMK Framework*
