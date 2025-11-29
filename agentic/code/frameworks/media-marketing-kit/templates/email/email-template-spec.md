# Email Template Specification

**Card ID**: `EML-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | In Development | QA | Production
**Template Name**: {TEMPLATE_NAME}
**Owner**: {OWNER_NAME}

---

## Template Overview

### Purpose

{What this template is designed for}

### Use Cases

- {Use case 1}
- {Use case 2}
- {Use case 3}

### Template Type

- [ ] Promotional
- [ ] Transactional
- [ ] Newsletter
- [ ] Nurture/Drip
- [ ] Automated/Triggered
- [ ] System notification

---

## Design Specifications

### Layout Structure

```
┌─────────────────────────────────┐
│           HEADER                │
│     [Logo]    [Nav Links]       │
├─────────────────────────────────┤
│           HERO                  │
│    [Image/Video Placeholder]    │
│    [Headline]                   │
│    [Subheadline]                │
│    [Primary CTA]                │
├─────────────────────────────────┤
│         BODY SECTION 1          │
│    [Content Block]              │
├─────────────────────────────────┤
│         BODY SECTION 2          │
│    [2-3 Column Layout]          │
├─────────────────────────────────┤
│           FOOTER                │
│    [Social Icons]               │
│    [Unsubscribe] [Preferences]  │
│    [Address] [Legal]            │
└─────────────────────────────────┘
```

### Dimensions

| Element | Desktop | Mobile |
|---------|---------|--------|
| Max width | 600px | 100% |
| Min width | 320px | 320px |
| Padding | 20px | 15px |
| Column gutter | 20px | 10px |

---

## Module Library

### Header Module

| Element | Specification |
|---------|---------------|
| Logo | Max 200px wide, linked to homepage |
| Logo alt text | "{Brand Name}" |
| Navigation | Optional, max 4 links |
| Background | {Color/#HEX} |
| Height | Auto, min 60px |

### Hero Module

| Element | Specification |
|---------|---------------|
| Image size | 600x300px (2:1 ratio) |
| Retina image | 1200x600px |
| Alt text | Required, descriptive |
| Headline | H1, max 60 characters |
| Subheadline | 100-150 characters |
| CTA button | Min 44x44px touch target |

### Content Block Modules

**Single column**:
| Element | Specification |
|---------|---------------|
| Width | 100% (max 560px with padding) |
| Image | 560px wide, auto height |
| Text | Left-aligned, 16px body |

**Two column**:
| Element | Specification |
|---------|---------------|
| Column width | 280px each (20px gutter) |
| Mobile behavior | Stack vertically |
| Image | 280px wide |

**Three column**:
| Element | Specification |
|---------|---------------|
| Column width | 180px each (20px gutters) |
| Mobile behavior | Stack or 2+1 |
| Image | 180px wide |

### Footer Module

| Element | Specification |
|---------|---------------|
| Social icons | 32x32px, max 6 icons |
| Unsubscribe | Required, prominent |
| Physical address | Required (CAN-SPAM) |
| Copyright | Current year |
| View in browser | Optional |

---

## Typography

### Font Stack

```css
font-family: {Primary}, {Fallback}, Arial, Helvetica, sans-serif;
```

### Type Hierarchy

| Element | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| H1 | 28px / 24px mobile | Bold | 1.2 | {#HEX} |
| H2 | 22px / 20px mobile | Bold | 1.3 | {#HEX} |
| H3 | 18px / 16px mobile | Bold | 1.4 | {#HEX} |
| Body | 16px / 16px mobile | Normal | 1.5 | {#HEX} |
| Small | 14px / 14px mobile | Normal | 1.4 | {#HEX} |
| Link | Inherit | Normal | Inherit | {#HEX} |
| Caption | 12px / 12px mobile | Normal | 1.4 | {#HEX} |

---

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary | #{HEX} | CTA buttons, links |
| Secondary | #{HEX} | Accents, icons |
| Background | #{HEX} | Email background |
| Content bg | #{HEX} | Content area |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| Heading | #{HEX} | All headings |
| Body | #{HEX} | Body text |
| Muted | #{HEX} | Secondary text |
| Link | #{HEX} | Hyperlinks |
| Link hover | #{HEX} | Hover state |

### Dark Mode

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | #{HEX} | #{HEX} |
| Text | #{HEX} | #{HEX} |
| CTA button | #{HEX} | #{HEX} |

---

## Button Styles

### Primary Button

```html
<a href="{URL}" style="
  display: inline-block;
  padding: 14px 28px;
  background-color: {#HEX};
  color: #ffffff;
  text-decoration: none;
  border-radius: {X}px;
  font-weight: bold;
  font-size: 16px;
">
  {Button Text}
</a>
```

### Secondary Button

```html
<a href="{URL}" style="
  display: inline-block;
  padding: 12px 24px;
  background-color: transparent;
  color: {#HEX};
  text-decoration: none;
  border: 2px solid {#HEX};
  border-radius: {X}px;
  font-weight: bold;
  font-size: 14px;
">
  {Button Text}
</a>
```

### Button States

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | {#HEX} | {#HEX} | {#HEX} |
| Hover | {#HEX} | {#HEX} | {#HEX} |
| Active | {#HEX} | {#HEX} | {#HEX} |

---

## Image Specifications

### Image Requirements

| Type | Dimensions | Format | Max Size |
|------|------------|--------|----------|
| Hero | 600x300 / 1200x600 @2x | JPG/PNG | 200KB |
| Feature | 560xAuto | JPG/PNG | 150KB |
| Product | 280x280 | PNG | 100KB |
| Icon | 64x64 | PNG/SVG | 10KB |
| Logo | 200x60 | PNG | 30KB |

### Alt Text Guidelines

- Descriptive, not decorative ("Blue sneakers on white background")
- Action-oriented for CTAs ("Shop the sale")
- Empty alt for decorative images (alt="")
- Max 125 characters

---

## Editable Regions

### Content Blocks

| Region ID | Type | Required | Constraints |
|-----------|------|----------|-------------|
| hero_image | Image | Yes | 600x300px |
| hero_headline | Text | Yes | Max 60 chars |
| hero_cta | Link | Yes | URL + text |
| body_content | HTML | Yes | Rich text |
| product_1 | Module | No | Product block |
| product_2 | Module | No | Product block |
| product_3 | Module | No | Product block |

### Dynamic Content Blocks

| Block ID | Variable | Rules |
|----------|----------|-------|
| {block_id} | {variable} | {Show if condition} |

---

## Personalization

### Merge Tags

| Tag | Default | Example |
|-----|---------|---------|
| {{first_name}} | Friend | Hi {{first_name}}, |
| {{company}} | your company | At {{company}}, |
| {{product_name}} | our product | Check out {{product_name}} |

### Conditional Content

```
{% if segment == "VIP" %}
  {VIP exclusive content}
{% else %}
  {Standard content}
{% endif %}
```

---

## Accessibility Requirements

### WCAG 2.1 Compliance

- [ ] Color contrast minimum 4.5:1 (body text)
- [ ] Color contrast minimum 3:1 (large text, buttons)
- [ ] All images have alt text
- [ ] Links have descriptive text
- [ ] Logical reading order
- [ ] No color-only indicators

### Screen Reader Support

- [ ] Role="presentation" on layout tables
- [ ] Proper semantic structure
- [ ] Skip navigation where appropriate
- [ ] Language attribute set

---

## Testing Requirements

### Email Clients

**Desktop**:
- [ ] Apple Mail (macOS)
- [ ] Outlook 2016/2019/365 (Windows)
- [ ] Outlook for Mac
- [ ] Thunderbird

**Webmail**:
- [ ] Gmail
- [ ] Yahoo Mail
- [ ] Outlook.com
- [ ] AOL Mail

**Mobile**:
- [ ] iOS Mail (iPhone, iPad)
- [ ] Gmail app (iOS, Android)
- [ ] Outlook app (iOS, Android)
- [ ] Samsung Mail

### Rendering Checks

- [ ] Images load correctly
- [ ] Fonts render properly
- [ ] Links work and track
- [ ] Buttons are tappable (min 44px)
- [ ] Text is readable at mobile size
- [ ] Dark mode renders correctly
- [ ] Plain text version works

---

## Code Requirements

### HTML Standards

- DOCTYPE: HTML 4.01 Transitional or XHTML 1.0
- Tables for layout (email compatibility)
- Inline CSS required
- VML for Outlook shapes/buttons

### Coding Best Practices

- [ ] Max width set on tables
- [ ] Border-collapse: collapse
- [ ] Cellpadding/cellspacing for spacing
- [ ] MSO conditionals for Outlook
- [ ] Background images with fallback color
- [ ] Web-safe fonts with fallbacks

### Sample Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Email Subject}</title>
  <!--[if mso]>
  <style>
    /* Outlook-specific styles */
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0;">
  <table role="presentation" width="100%">
    <!-- Email content -->
  </table>
</body>
</html>
```

---

## Version Control

### Template Versions

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | {DATE} | Initial template | {Name} |
| 1.1 | {DATE} | {Changes} | {Name} |

### File Locations

| File | Location |
|------|----------|
| HTML source | {Path/URL} |
| Design file | {Figma/Sketch URL} |
| Image assets | {Asset folder URL} |

---

## Approvals

| Role | Name | Status | Date |
|------|------|--------|------|
| Designer | | | |
| Developer | | | |
| Email Manager | | | |
| Brand | | | |

---

*Template version: 1.0 | MMK Framework*
