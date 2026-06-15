# Accessibility Checker — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

These are the full per-format accessibility review templates and the
remediation/testing checklist samples that back the Accessibility Checker. The
agent definition keeps the process, WCAG reference tables, the common-issues
reference, and a single compact inline anchor; the full templates live here.

## Accessibility Checklists

### Web Content Accessibility Review

```markdown
## Web Accessibility Review: [Page/Site Name]
### Date: [Date]
### Standard: WCAG 2.1 Level AA

### Page Information
| Field | Value |
|-------|-------|
| URL | [URL] |
| Page Type | [Type] |
| Review Scope | [Full site/Single page] |
| Reviewer | [Name] |

---

## 1. Perceivable

### 1.1 Text Alternatives
- [ ] All images have appropriate alt text
- [ ] Decorative images have empty alt (alt="")
- [ ] Complex images have extended descriptions
- [ ] Icons have accessible names
- [ ] Image maps have text alternatives

**Issues:**
| Element | Issue | Recommendation |
|---------|-------|----------------|
| [Element] | [Issue] | [Fix] |

### 1.2 Time-Based Media
- [ ] Videos have captions
- [ ] Videos have audio descriptions (if needed)
- [ ] Audio has transcripts
- [ ] Live content has captions

### 1.3 Adaptable
- [ ] Information structure preserved without CSS
- [ ] Meaningful sequence maintained
- [ ] Instructions don't rely on sensory characteristics
- [ ] Content orientation not restricted

### 1.4 Distinguishable
- [ ] Color not sole means of conveying info
- [ ] Audio control available
- [ ] **Contrast ratio minimum 4.5:1 (normal text)**
- [ ] **Contrast ratio minimum 3:1 (large text)**
- [ ] Text resizable to 200% without loss
- [ ] Images of text avoided (use real text)
- [ ] Non-text contrast minimum 3:1

**Contrast Check:**
| Element | Foreground | Background | Ratio | Pass/Fail |
|---------|------------|------------|-------|-----------|
| Body text | #XXXXXX | #XXXXXX | X.X:1 | ✓/✗ |
| Headings | #XXXXXX | #XXXXXX | X.X:1 | ✓/✗ |
| Links | #XXXXXX | #XXXXXX | X.X:1 | ✓/✗ |
| Buttons | #XXXXXX | #XXXXXX | X.X:1 | ✓/✗ |

---

## 2. Operable

### 2.1 Keyboard Accessible
- [ ] All functionality keyboard accessible
- [ ] No keyboard traps
- [ ] Keyboard shortcuts don't conflict

### 2.2 Enough Time
- [ ] Timing adjustable or can be extended
- [ ] Moving content can be paused
- [ ] Auto-updating content can be paused
- [ ] No time limits (or adjustable)

### 2.3 Seizures and Physical Reactions
- [ ] No content flashes more than 3 times/second
- [ ] Motion animation can be disabled

### 2.4 Navigable
- [ ] Skip to main content link present
- [ ] Page titles descriptive
- [ ] Focus order logical
- [ ] Link purpose clear from text
- [ ] Multiple ways to find pages
- [ ] Headings and labels descriptive
- [ ] Focus visible
- [ ] Location indicated (breadcrumbs, etc.)

### 2.5 Input Modalities
- [ ] Touch targets minimum 44×44 pixels
- [ ] Pointer gestures have alternatives
- [ ] Motion actuation has alternatives

---

## 3. Understandable

### 3.1 Readable
- [ ] Page language identified
- [ ] Language changes identified
- [ ] Unusual words explained
- [ ] Abbreviations explained

### 3.2 Predictable
- [ ] Focus doesn't change context unexpectedly
- [ ] Input doesn't change context unexpectedly
- [ ] Navigation consistent
- [ ] Components identified consistently

### 3.3 Input Assistance
- [ ] Errors identified and described
- [ ] Labels or instructions provided
- [ ] Error suggestions provided
- [ ] Error prevention (reversible, checked, confirmed)

---

## 4. Robust

### 4.1 Compatible
- [ ] HTML validates (no major errors)
- [ ] Name, role, value present for custom controls
- [ ] Status messages announced to screen readers

---

## Summary

### Compliance Score: [X]%

### Issues by Severity
| Severity | Count | Principle |
|----------|-------|-----------|
| Critical | X | [Principles] |
| Major | X | [Principles] |
| Minor | X | [Principles] |

### Top Priority Fixes
1. [Fix with impact]
2. [Fix with impact]
3. [Fix with impact]

### Certification
☐ **Passes WCAG 2.1 Level AA**
☐ **Does not pass** - remediation required
```

### Email Accessibility Review

```markdown
## Email Accessibility Review: [Email Name]

### Email Information
| Field | Value |
|-------|-------|
| Subject | [Subject line] |
| Campaign | [Campaign name] |
| Template | [Template name] |
| Reviewer | [Name] |

### Accessibility Checklist

**Structure:**
- [ ] Single-column layout (preferred) or proper reading order
- [ ] Tables used only for layout, not data (role="presentation")
- [ ] Semantic headings used (H1, H2, etc.)
- [ ] Reading order makes sense when linearized

**Images:**
- [ ] All images have alt text
- [ ] Decorative images have null alt (alt="")
- [ ] No essential information only in images
- [ ] Image file sizes optimized

**Text:**
- [ ] Real text used (not images of text)
- [ ] Font size minimum 14px
- [ ] Line height minimum 1.5
- [ ] Sufficient color contrast (4.5:1)
- [ ] Links distinguishable (not just color)

**Links & Buttons:**
- [ ] Link text is descriptive
- [ ] Buttons have minimum touch target (44×44px)
- [ ] CTA text clear out of context
- [ ] No "click here" or "read more" alone

**Color:**
- [ ] Information not conveyed by color alone
- [ ] Color contrast meets WCAG AA
- [ ] Works in dark mode / forced colors

**Email Client Compatibility:**
- [ ] Plain text alternative provided
- [ ] Renders without images enabled
- [ ] Works in Outlook, Gmail, Apple Mail

### Issues Found
| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| [Issue] | [Where] | H/M/L | [Solution] |

### Test Results
| Client | Desktop | Mobile | Issues |
|--------|---------|--------|--------|
| Outlook | ✓/✗ | ✓/✗ | [Notes] |
| Gmail | ✓/✗ | ✓/✗ | [Notes] |
| Apple Mail | ✓/✗ | ✓/✗ | [Notes] |
```

### Video/Multimedia Accessibility Review

```markdown
## Video Accessibility Review: [Video Name]

### Video Information
| Field | Value |
|-------|-------|
| Video Title | [Title] |
| Duration | [Length] |
| Platform | [Where hosted] |
| Use Case | [Marketing/Training/etc.] |

### Accessibility Requirements

**Captions:**
- [ ] Closed captions available
- [ ] Captions accurately reflect audio
- [ ] Speaker identification when needed
- [ ] Sound effects described [sound]
- [ ] Music identified [♪ music ♪]
- [ ] Caption timing synchronized
- [ ] Captions readable (contrast, speed)

**Audio Description:**
- [ ] Audio description track available (if needed)
- [ ] Key visual content described
- [ ] Extended AD if natural pauses insufficient

**Transcript:**
- [ ] Full transcript available
- [ ] Transcript includes all spoken content
- [ ] Transcript includes relevant visual descriptions
- [ ] Transcript accessible on same page

**Player Controls:**
- [ ] Keyboard accessible controls
- [ ] Pause/play functionality
- [ ] Volume control
- [ ] Fullscreen option
- [ ] Caption toggle
- [ ] Playback speed control

**Auto-play:**
- [ ] Video does not auto-play with sound
- [ ] User can stop/pause immediately
- [ ] Auto-play limited to 5 seconds (if used)

### Caption Quality Check
| Criterion | Pass | Notes |
|-----------|------|-------|
| Accuracy | ✓/✗ | [Notes] |
| Synchronization | ✓/✗ | [Notes] |
| Completeness | ✓/✗ | [Notes] |
| Readability | ✓/✗ | [Notes] |
| Formatting | ✓/✗ | [Notes] |

### Issues Found
| Issue | Timestamp | Severity | Fix |
|-------|-----------|----------|-----|
| [Issue] | [Time] | H/M/L | [Solution] |
```

### Social Media Accessibility Review

```markdown
## Social Media Accessibility Review: [Post/Campaign]

### Post Information
| Field | Value |
|-------|-------|
| Platform | [Platform] |
| Post Type | [Image/Video/Text/Carousel] |
| Campaign | [Campaign name] |

### Image Posts
- [ ] Alt text added (via platform feature)
- [ ] Alt text is descriptive (not promotional)
- [ ] Text in image also in post copy
- [ ] Sufficient contrast in graphics
- [ ] No flashing/strobing effects

**Alt Text Examples:**
| Image | Alt Text | Adequate |
|-------|----------|----------|
| [Description] | "[Alt text]" | ✓/✗ |

### Video Posts
- [ ] Captions burned in or platform captions
- [ ] Auto-captions reviewed for accuracy
- [ ] Key info not only visual
- [ ] No quick flashing

### Text Posts
- [ ] Plain language used
- [ ] Hashtags CamelCase (#AccessibilityMatters)
- [ ] Emojis not overused
- [ ] Emojis not in middle of sentences
- [ ] @mentions and links accessible

### Stories/Ephemeral Content
- [ ] Text readable (size, contrast)
- [ ] Stickers/overlays don't obscure content
- [ ] Music/audio has text alternative
- [ ] Auto-captions enabled

### Platform-Specific
| Platform | Feature | Used | Notes |
|----------|---------|------|-------|
| Instagram | Alt text field | ✓/✗ | [Note] |
| Twitter | Image descriptions | ✓/✗ | [Note] |
| LinkedIn | Alt text | ✓/✗ | [Note] |
| Facebook | Alt text/captions | ✓/✗ | [Note] |

### Issues Found
| Issue | Severity | Fix |
|-------|----------|-----|
| [Issue] | H/M/L | [Solution] |
```

### Document Accessibility Review (PDF/PPT)

```markdown
## Document Accessibility Review: [Document Name]

### Document Information
| Field | Value |
|-------|-------|
| Document Name | [Name] |
| Type | PDF/PowerPoint/Word |
| Pages | [Number] |
| Purpose | [Use case] |

### Structure
- [ ] Proper heading hierarchy
- [ ] Document title set
- [ ] Language specified
- [ ] Logical reading order
- [ ] Table of contents (if long)

### Text
- [ ] Real text (not scanned images)
- [ ] OCR applied if from scan
- [ ] Fonts readable
- [ ] Sufficient contrast

### Images
- [ ] Alt text for all images
- [ ] Decorative images marked
- [ ] Complex images have descriptions

### Tables
- [ ] Header rows identified
- [ ] Simple structure (avoid merged cells)
- [ ] Caption/summary provided

### Links
- [ ] Links have descriptive text
- [ ] URLs not used as link text
- [ ] Links are functional

### Forms (if applicable)
- [ ] Form fields labeled
- [ ] Instructions provided
- [ ] Error messages clear
- [ ] Tab order logical

### PDF-Specific
- [ ] Tagged PDF
- [ ] Bookmarks present
- [ ] Accessibility checker passed

### PowerPoint-Specific
- [ ] Reading order set per slide
- [ ] Slide titles unique
- [ ] Notes field used for descriptions
- [ ] Animations don't cause seizures

### Issues Found
| Issue | Page/Slide | Severity | Fix |
|-------|------------|----------|-----|
| [Issue] | [Location] | H/M/L | [Solution] |

### Accessibility Check Tool Results
| Tool | Errors | Warnings | Passed |
|------|--------|----------|--------|
| [Tool] | X | X | ✓/✗ |
```

## Remediation Guidance

### Quick Fixes

```markdown
## Common Accessibility Fixes

### Alt Text Guidelines
**Do:**
- Describe the content and function
- Be concise (typically <125 characters)
- Skip "image of" or "picture of"
- Match the surrounding context

**Don't:**
- Leave blank (unless decorative)
- Use file names
- Stuff with keywords
- Describe decorative images

**Examples:**
| Image Type | Good Alt | Bad Alt |
|------------|----------|---------|
| Product | "Red Nike Air Max running shoes" | "IMG_1234.jpg" |
| Chart | "Bar chart showing Q3 revenue up 15%" | "Chart" |
| Decorative | alt="" (empty) | "decorative line" |
| Logo link | "Company Name - home page" | "logo" |

### Color Contrast Tools
- WebAIM Contrast Checker
- Colour Contrast Analyser (CCA)
- Stark (Figma/Sketch plugin)
- Chrome DevTools audit

### Caption Guidelines
- Verbatim for formal content
- Edited for clarity for conversational
- Include [sounds] and [music]
- Identify speakers
- 1-2 lines, 32 characters max per line
```

## Accessibility Testing

### Testing Checklist

```markdown
## Accessibility Testing Checklist

### Automated Testing
- [ ] Run WAVE browser extension
- [ ] Run axe DevTools
- [ ] Run Lighthouse accessibility audit
- [ ] Check PDF with Adobe Acrobat checker
- [ ] Run email through accessibility scanner

### Manual Testing
- [ ] Navigate with keyboard only
- [ ] Test with screen reader (NVDA/VoiceOver/JAWS)
- [ ] Zoom to 200%, check layout
- [ ] Test with browser in high contrast mode
- [ ] Disable images, check content
- [ ] Test on mobile devices

### User Testing (Recommended)
- [ ] Test with users who have disabilities
- [ ] Observe screen reader users
- [ ] Test with keyboard-only users
- [ ] Get feedback on cognitive load
```
