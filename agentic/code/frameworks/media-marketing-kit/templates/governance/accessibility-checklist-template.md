# Accessibility Checklist Template (WCAG 2.1 AA)

---

**Document ID**: GOV-004
**Template Version**: 1.0.0
**Last Updated**: 2025-11-28
**Owner**: Accessibility Lead / QA
**Status**: Active

---

## YAML Frontmatter

```yaml
accessibility_review:
  review_id: "[REVIEW-ID]"
  content_id: "[Associated Content/Campaign ID]"
  reviewer_name: "[Name]"
  review_date: "[YYYY-MM-DD]"

content_details:
  content_type: "[Website | Landing Page | Email | PDF | Video | Social Media | Mobile App | Other]"
  content_title: "[Title]"
  url: "[URL or file location]"
  platform: "[Web | iOS | Android | Desktop App | Other]"

compliance_target:
  wcag_version: "[WCAG 2.1 | WCAG 2.2]"
  conformance_level: "[A | AA | AAA]"
  target_compliance: "[AA - Recommended]"

testing_methodology:
  automated_tools: "[WAVE, axe DevTools, Lighthouse, Pa11y, etc.]"
  manual_testing: "[Yes | No]"
  screen_reader_tested: "[NVDA | JAWS | VoiceOver | TalkBack | None]"
  keyboard_tested: "[Yes | No]"

compliance_status:
  overall_status: "[Pass | Conditional Pass | Fail]"
  critical_issues: "[Number]"
  serious_issues: "[Number]"
  moderate_issues: "[Number]"
  minor_issues: "[Number]"

approval:
  approved_by: "[Accessibility Lead Name]"
  approval_date: "[YYYY-MM-DD]"
  retest_required: "[Yes | No]"
```

---

## Purpose

This checklist ensures marketing content meets WCAG 2.1 Level AA accessibility standards, making content usable by people with disabilities and compliant with ADA, Section 508, and international accessibility laws.

---

## 1. Perceivable - Information must be presentable to users

### 1.1 Text Alternatives (WCAG 1.1)

#### 1.1.1 Non-Text Content (Level A)

**Images**:
- [ ] **PASS** | [ ] **FAIL** - All `<img>` elements have `alt` attributes
- [ ] **PASS** | [ ] **FAIL** - Alt text descriptive and meaningful (not "image" or filename)
- [ ] **PASS** | [ ] **FAIL** - Decorative images have empty alt text (`alt=""`)
- [ ] **PASS** | [ ] **FAIL** - Complex images (charts, diagrams) have extended descriptions
- [ ] **PASS** | [ ] **FAIL** - Logo alt text = company/product name (not "logo")

**Example Good Alt Text**:
- Image: Woman presenting to colleagues in conference room
- Alt: "Marketing director presenting Q4 campaign strategy to team in boardroom"
- NOT: "image123.jpg" or "woman in meeting"

**Forms and Controls**:
- [ ] **PASS** | [ ] **FAIL** - Form inputs have associated `<label>` elements
- [ ] **PASS** | [ ] **FAIL** - Icon buttons have `aria-label` or visible text
- [ ] **PASS** | [ ] **FAIL** - CAPTCHAs provide audio alternative

**Media and Embeds**:
- [ ] **PASS** | [ ] **FAIL** - Audio-only content has text transcript
- [ ] **PASS** | [ ] **FAIL** - Video-only content has audio description or transcript

**Issues Identified**:
```text
[List images missing alt text, inadequate descriptions, etc.]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

### 1.2 Time-Based Media (WCAG 1.2)

#### 1.2.1 Audio-only and Video-only (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Audio-only content (podcast, audio clip) has text transcript
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Video-only content (no audio) has text alternative or audio description

#### 1.2.2 Captions (Prerecorded) (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - All prerecorded videos have synchronized captions
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Captions accurate (not auto-generated without review)
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Captions include speaker identification
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Captions include important sound effects [applause], [music]

**Caption Quality**:
- [ ] **PASS** | [ ] **FAIL** - Captions synchronized with audio (not delayed)
- [ ] **PASS** | [ ] **FAIL** - Captions readable (font size, contrast, background)
- [ ] **PASS** | [ ] **FAIL** - Captions cover all spoken dialogue and relevant sounds

#### 1.2.3 Audio Description or Media Alternative (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Video with visual-only information has audio description track OR full text transcript

#### 1.2.5 Audio Description (Prerecorded) (Level AA)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Prerecorded video has audio description track for visual information not conveyed in audio

**Example**: If video shows product features without narration, audio description explains what's shown.

**Issues Identified**:
```text
[List videos missing captions, inadequate audio descriptions, etc.]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

### 1.3 Adaptable Content (WCAG 1.3)

#### 1.3.1 Info and Relationships (Level A)

**Semantic HTML**:
- [ ] **PASS** | [ ] **FAIL** - Headings use `<h1>` to `<h6>` (not styled `<div>` or `<span>`)
- [ ] **PASS** | [ ] **FAIL** - Lists use `<ul>`, `<ol>`, `<li>` elements
- [ ] **PASS** | [ ] **FAIL** - Tables use `<table>`, `<th>`, `<td>` with `<caption>`
- [ ] **PASS** | [ ] **FAIL** - Data tables have `<th scope="col">` and `<th scope="row">`
- [ ] **PASS** | [ ] **FAIL** - Form fields grouped with `<fieldset>` and `<legend>`

**ARIA Landmarks**:
- [ ] **PASS** | [ ] **FAIL** - Page uses semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) or ARIA roles
- [ ] **PASS** | [ ] **FAIL** - Each page has exactly one `<main>` landmark or `role="main"`

**Programmatic Relationships**:
- [ ] **PASS** | [ ] **FAIL** - Related form inputs grouped logically
- [ ] **PASS** | [ ] **FAIL** - Instructions for form fields programmatically associated (`aria-describedby`)

#### 1.3.2 Meaningful Sequence (Level A)

- [ ] **PASS** | [ ] **FAIL** - Content reading order makes sense when CSS disabled
- [ ] **PASS** | [ ] **FAIL** - Tab order follows visual flow (top to bottom, left to right)
- [ ] **PASS** | [ ] **FAIL** - No `tabindex` values > 0 (disrupts natural tab order)

#### 1.3.3 Sensory Characteristics (Level A)

- [ ] **PASS** | [ ] **FAIL** - Instructions don't rely solely on shape ("click the round button")
- [ ] **PASS** | [ ] **FAIL** - Instructions don't rely solely on size ("click the large button")
- [ ] **PASS** | [ ] **FAIL** - Instructions don't rely solely on location ("click the button on the right")
- [ ] **PASS** | [ ] **FAIL** - Instructions don't rely solely on sound ("when you hear the beep")

**Example**:
- Bad: "Click the green button on the right"
- Good: "Click the 'Submit' button (green, located on the right)"

#### 1.3.4 Orientation (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Content not restricted to single orientation (portrait or landscape only)
- [ ] **PASS** | [ ] **FAIL** - Content adapts to device orientation changes
- [ ] **N/A** - (Exception: Bank check scanning may require specific orientation)

#### 1.3.5 Identify Input Purpose (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Form fields use `autocomplete` attributes for personal data (name, email, phone, address)

**Example**:
```html
<input type="email" name="email" autocomplete="email">
<input type="tel" name="phone" autocomplete="tel">
```

**Issues Identified**:
```text
[List structural issues, semantic HTML violations, etc.]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

### 1.4 Distinguishable Content (WCAG 1.4)

#### 1.4.1 Use of Color (Level A)

- [ ] **PASS** | [ ] **FAIL** - Color not sole means of conveying information
- [ ] **PASS** | [ ] **FAIL** - Links distinguishable from text without relying on color alone (underline, icon, bold)
- [ ] **PASS** | [ ] **FAIL** - Form errors indicated with text/icons, not just red color
- [ ] **PASS** | [ ] **FAIL** - Charts/graphs have patterns or labels, not just color coding

**Example**:
- Bad: "Fields in red are required"
- Good: "Required fields are marked with an asterisk (*) and labeled 'Required'"

#### 1.4.2 Audio Control (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Auto-playing audio can be paused/stopped
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Auto-playing audio < 3 seconds OR has pause/stop control

#### 1.4.3 Contrast (Minimum) (Level AA) - CRITICAL

**Text Contrast**:
- [ ] **PASS** | [ ] **FAIL** - Normal text (< 18pt or < 14pt bold) has 4.5:1 contrast ratio
- [ ] **PASS** | [ ] **FAIL** - Large text (≥ 18pt or ≥ 14pt bold) has 3:1 contrast ratio
- [ ] **PASS** | [ ] **FAIL** - Interactive elements (buttons, links) have 4.5:1 contrast
- [ ] **PASS** | [ ] **FAIL** - Placeholder text has 4.5:1 contrast (or visible label provided)

**Non-Text Contrast**:
- [ ] **PASS** | [ ] **FAIL** - UI components (buttons, form borders) have 3:1 contrast against adjacent colors
- [ ] **PASS** | [ ] **FAIL** - Graphical objects (icons, charts) have 3:1 contrast

**Contrast Testing**:
- Tool Used: [WebAIM Contrast Checker, Colour Contrast Analyser, Chrome DevTools]
- Background Color: [Hex]
- Text Color: [Hex]
- Contrast Ratio: [X:1]

**Common Failures**:
```text
[List low-contrast text, buttons, or UI elements with actual vs. required ratios]
```

#### 1.4.4 Resize Text (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Text can be resized to 200% without loss of content or functionality
- [ ] **PASS** | [ ] **FAIL** - No horizontal scrolling at 200% zoom (for 1280px width)
- [ ] **PASS** | [ ] **FAIL** - No overlapping or clipped text at 200% zoom

#### 1.4.5 Images of Text (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Text presented as HTML/CSS, not images (except logos)
- [ ] **PASS** | [ ] **FAIL** - If images of text used, they're essential (logos, branding) or customizable

#### 1.4.10 Reflow (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Content reflows to 320px width without horizontal scrolling
- [ ] **PASS** | [ ] **FAIL** - No content loss at 400% zoom (1280px → 320px effective width)
- [ ] **N/A** - (Exception: Content requiring 2D layout like maps, diagrams)

#### 1.4.11 Non-Text Contrast (Level AA)

- [ ] **PASS** | [ ] **FAIL** - UI components have 3:1 contrast (button borders, form field borders)
- [ ] **PASS** | [ ] **FAIL** - Focus indicators have 3:1 contrast
- [ ] **PASS** | [ ] **FAIL** - Graphical objects (icons, chart elements) have 3:1 contrast

#### 1.4.12 Text Spacing (Level AA)

- [ ] **PASS** | [ ] **FAIL** - No loss of content when user increases:
  - Line height (line spacing) to 1.5x font size
  - Paragraph spacing to 2x font size
  - Letter spacing to 0.12x font size
  - Word spacing to 0.16x font size

#### 1.4.13 Content on Hover or Focus (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Tooltips/popovers can be dismissed without moving pointer
- [ ] **PASS** | [ ] **FAIL** - Pointer can move over triggered content without it disappearing
- [ ] **PASS** | [ ] **FAIL** - Tooltip/popover remains visible until dismissed or no longer relevant

**Issues Identified**:
```text
[List contrast failures, text sizing issues, reflow problems, etc.]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

## 2. Operable - User interface must be operable

### 2.1 Keyboard Accessible (WCAG 2.1)

#### 2.1.1 Keyboard (Level A) - CRITICAL

- [ ] **PASS** | [ ] **FAIL** - All interactive elements accessible via keyboard (Tab, Enter, Space, Arrow keys)
- [ ] **PASS** | [ ] **FAIL** - No keyboard trap (users can navigate away from all elements)
- [ ] **PASS** | [ ] **FAIL** - Dropdown menus operable with keyboard
- [ ] **PASS** | [ ] **FAIL** - Modal dialogs closable with Esc key
- [ ] **PASS** | [ ] **FAIL** - Custom controls (sliders, accordions) keyboard accessible

**Keyboard Testing**:
- [ ] Tested navigation with Tab / Shift+Tab
- [ ] Tested activation with Enter and Space
- [ ] Tested dropdown menus with Arrow keys
- [ ] Tested escape functionality with Esc

**Common Failures**:
```text
[List elements not reachable by keyboard: clickable <div>s without tabindex, dropdowns requiring mouse hover, etc.]
```

#### 2.1.2 No Keyboard Trap (Level A)

- [ ] **PASS** | [ ] **FAIL** - User can move focus away from every component using keyboard alone
- [ ] **PASS** | [ ] **FAIL** - No infinite loops in tab order

#### 2.1.4 Character Key Shortcuts (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Single-character keyboard shortcuts can be turned off, remapped, or only active when component focused

**Issues Identified**:
```text
[List keyboard accessibility issues]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

### 2.2 Enough Time (WCAG 2.2)

#### 2.2.1 Timing Adjustable (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - User can turn off, adjust, or extend time limits (before time expires)
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Warning given with option to extend (at least 20 seconds before expiry)
- [ ] **N/A** - (Exception: Real-time events like auctions, time limit > 20 hours)

#### 2.2.2 Pause, Stop, Hide (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Auto-updating content (news tickers, carousels) can be paused, stopped, or hidden
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Moving, blinking, scrolling content (> 5 seconds) can be paused
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Auto-advancing carousels have pause button

**Issues**: [Describe]

---

### 2.3 Seizures and Physical Reactions (WCAG 2.3)

#### 2.3.1 Three Flashes or Below Threshold (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - No content flashes more than 3 times per second
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - No large flashing areas (could trigger seizures)

**Issues**: [Describe]

---

### 2.4 Navigable (WCAG 2.4)

#### 2.4.1 Bypass Blocks (Level A)

- [ ] **PASS** | [ ] **FAIL** - "Skip to main content" link present and functional
- [ ] **PASS** | [ ] **FAIL** - Skip link visible on keyboard focus
- [ ] **PASS** | [ ] **FAIL** - Landmark regions used (`<main>`, `<nav>`, etc.)

#### 2.4.2 Page Titled (Level A)

- [ ] **PASS** | [ ] **FAIL** - Page has unique, descriptive `<title>` element
- [ ] **PASS** | [ ] **FAIL** - Title describes page topic or purpose

**Example**:
- Good: "Campaign Strategy Template | Marketing Framework"
- Bad: "Page 1" or "Untitled"

#### 2.4.3 Focus Order (Level A)

- [ ] **PASS** | [ ] **FAIL** - Focus order follows logical reading sequence
- [ ] **PASS** | [ ] **FAIL** - Tab order matches visual layout

#### 2.4.4 Link Purpose (In Context) (Level A)

- [ ] **PASS** | [ ] **FAIL** - Link text describes destination ("Download Brand Guidelines" not "Click Here")
- [ ] **PASS** | [ ] **FAIL** - Links with same text go to same destination
- [ ] **PASS** | [ ] **FAIL** - Generic links ("Read More") have context from heading or paragraph

**Common Failures**:
- "Click Here" links without context
- Multiple "Learn More" links on same page going to different places
- "Read More" without associated heading

#### 2.4.5 Multiple Ways (Level AA)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Multiple ways to find pages (navigation menu, search, sitemap)

#### 2.4.6 Headings and Labels (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Headings descriptive and meaningful
- [ ] **PASS** | [ ] **FAIL** - Form labels clear and descriptive
- [ ] **PASS** | [ ] **FAIL** - Headings organized hierarchically (h1 > h2 > h3, no skipping)

**Heading Structure Test**:
- [ ] Only one `<h1>` per page
- [ ] Headings don't skip levels (h2 directly after h1, not h1 > h3)

#### 2.4.7 Focus Visible (Level AA) - CRITICAL

- [ ] **PASS** | [ ] **FAIL** - Keyboard focus indicator visible for all interactive elements
- [ ] **PASS** | [ ] **FAIL** - Focus indicator meets 3:1 contrast ratio (WCAG 2.2)
- [ ] **PASS** | [ ] **FAIL** - Focus indicator not removed by CSS (`outline: none` only if custom focus style provided)

**Focus Testing**:
- [ ] Tested with Tab key - all interactive elements show visible focus
- [ ] Focus indicator distinguishable from unfocused state

**Issues Identified**:
```text
[List navigation issues, missing focus indicators, poor link text, etc.]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

### 2.5 Input Modalities (WCAG 2.5)

#### 2.5.1 Pointer Gestures (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Multipoint gestures (pinch-to-zoom) have single-pointer alternative
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Path-based gestures (swiping) have simple tap/click alternative

#### 2.5.2 Pointer Cancellation (Level A)

- [ ] **PASS** | [ ] **FAIL** - Click actions execute on "up" event (not "down" event)
- [ ] **PASS** | [ ] **FAIL** - User can abort by moving pointer away before releasing

#### 2.5.3 Label in Name (Level A)

- [ ] **PASS** | [ ] **FAIL** - Visible label text matches accessible name (for voice control users)

**Example**:
- Button shows "Search" → `aria-label` or accessible name should include "Search"

#### 2.5.4 Motion Actuation (Level A)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Functions triggered by device motion (shake, tilt) have UI control alternative
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Motion actuation can be disabled

**Issues**: [Describe]

---

## 3. Understandable - Information must be understandable

### 3.1 Readable (WCAG 3.1)

#### 3.1.1 Language of Page (Level A)

- [ ] **PASS** | [ ] **FAIL** - Page has `lang` attribute in `<html>` tag (`<html lang="en">`)
- [ ] **PASS** | [ ] **FAIL** - Language code accurate (en, es, fr, de, etc.)

#### 3.1.2 Language of Parts (Level AA)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Inline foreign language has `lang` attribute (`<span lang="fr">Bonjour</span>`)

**Issues**: [Describe]

---

### 3.2 Predictable (WCAG 3.2)

#### 3.2.1 On Focus (Level A)

- [ ] **PASS** | [ ] **FAIL** - Focus alone doesn't trigger context change (no auto-submit on tab, no popups on focus)

#### 3.2.2 On Input (Level A)

- [ ] **PASS** | [ ] **FAIL** - Changing form input doesn't auto-submit form
- [ ] **PASS** | [ ] **FAIL** - Selecting dropdown option doesn't change page (unless warned)

**Example**:
- Bad: Country dropdown auto-redirects on selection
- Good: Country dropdown + "Submit" button

#### 3.2.3 Consistent Navigation (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Navigation menu in same location across pages
- [ ] **PASS** | [ ] **FAIL** - Repeated components (header, footer) in same relative order

#### 3.2.4 Consistent Identification (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Icons/buttons with same function have same label across pages
- [ ] **PASS** | [ ] **FAIL** - Search icon always labeled "Search" (not "Find" on one page, "Search" on another)

**Issues**: [Describe]

---

### 3.3 Input Assistance (WCAG 3.3)

#### 3.3.1 Error Identification (Level A)

- [ ] **PASS** | [ ] **FAIL** - Form errors identified in text (not just red border)
- [ ] **PASS** | [ ] **FAIL** - Error messages describe what's wrong ("Email format invalid" not "Error")
- [ ] **PASS** | [ ] **FAIL** - Error location identified (which field has error)

#### 3.3.2 Labels or Instructions (Level A)

- [ ] **PASS** | [ ] **FAIL** - All form inputs have visible labels
- [ ] **PASS** | [ ] **FAIL** - Required fields clearly marked (text, not just asterisk)
- [ ] **PASS** | [ ] **FAIL** - Input format explained (e.g., "MM/DD/YYYY" for date)

#### 3.3.3 Error Suggestion (Level AA)

- [ ] **PASS** | [ ] **FAIL** - Error messages suggest corrections when possible
- [ ] **PASS** | [ ] **FAIL** - Suggestions don't compromise security (no password hints)

**Example**:
- Bad: "Invalid email"
- Good: "Email format invalid. Include @ symbol (e.g., name@example.com)"

#### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Submissions can be reversed (undo function)
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Data checked and user given opportunity to correct before final submission
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Confirmation page shown before final submission (for legal/financial transactions)

**Applies to**: Legal commitments, financial transactions, data deletion, test submissions

**Issues Identified**:
```text
[List form accessibility issues]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

## 4. Robust - Content must be robust enough for assistive technologies

### 4.1 Compatible (WCAG 4.1)

#### 4.1.1 Parsing (Level A) - Deprecated in WCAG 2.2

- [ ] **PASS** | [ ] **FAIL** - HTML validates (no duplicate IDs, proper nesting)
- [ ] **PASS** | [ ] **FAIL** - Elements have complete start/end tags

**Note**: This criterion is deprecated in WCAG 2.2 but still useful for compatibility.

#### 4.1.2 Name, Role, Value (Level A) - CRITICAL

- [ ] **PASS** | [ ] **FAIL** - All UI components have accessible name (via label, aria-label, or aria-labelledby)
- [ ] **PASS** | [ ] **FAIL** - Custom controls (non-standard HTML) have ARIA roles
- [ ] **PASS** | [ ] **FAIL** - Dynamic content changes announced to screen readers (aria-live)

**Common Custom Controls**:
- Accordions: Use `role="button"`, `aria-expanded`, `aria-controls`
- Tabs: Use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- Modals: Use `role="dialog"`, `aria-modal`, `aria-labelledby`
- Tooltips: Use `role="tooltip"`, `aria-describedby`

**ARIA Testing**:
- [ ] Dynamic content (loading spinners, success messages) announced via `aria-live`
- [ ] Form validation errors announced to screen reader
- [ ] Expandable sections have `aria-expanded="true/false"`

#### 4.1.3 Status Messages (Level AA)

- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Status messages announced without receiving focus
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Success messages use `role="status"` or `aria-live="polite"`
- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A** - Error messages use `role="alert"` or `aria-live="assertive"`

**Example**:
```html
<div role="status" aria-live="polite">Item added to cart</div>
<div role="alert" aria-live="assertive">Form submission failed</div>
```

**Issues Identified**:
```text
[List ARIA issues, missing labels, custom control problems, etc.]
```

**Severity**: [ ] Critical | [ ] Serious | [ ] Moderate | [ ] Minor | [ ] None

---

## 5. Assistive Technology Testing

### 5.1 Screen Reader Testing

**Screen Reader Used**: [ ] NVDA (Windows) | [ ] JAWS (Windows) | [ ] VoiceOver (Mac/iOS) | [ ] TalkBack (Android) | [ ] None

**Testing Results**:
- [ ] **PASS** | [ ] **FAIL** - All content readable by screen reader
- [ ] **PASS** | [ ] **FAIL** - Heading structure navigable (H key in NVDA/JAWS)
- [ ] **PASS** | [ ] **FAIL** - Landmarks navigable (D key for landmarks)
- [ ] **PASS** | [ ] **FAIL** - Form fields announce label and role
- [ ] **PASS** | [ ] **FAIL** - Links announce link text and destination (if available)
- [ ] **PASS** | [ ] **FAIL** - Images announce alt text
- [ ] **PASS** | [ ] **FAIL** - Buttons announce button name and role
- [ ] **PASS** | [ ] **FAIL** - Dynamic content changes announced

**Screen Reader Issues**:
```text
[Describe elements not announced correctly, navigation issues, confusing reading order, etc.]
```

---

### 5.2 Keyboard-Only Navigation

**Keyboard Testing**:
- [ ] **PASS** | [ ] **FAIL** - All interactive elements reachable with Tab
- [ ] **PASS** | [ ] **FAIL** - Tab order logical
- [ ] **PASS** | [ ] **FAIL** - Focus visible on all interactive elements
- [ ] **PASS** | [ ] **FAIL** - Buttons activate with Enter and Space
- [ ] **PASS** | [ ] **FAIL** - Dropdowns navigate with Arrow keys
- [ ] **PASS** | [ ] **FAIL** - Modals close with Esc key
- [ ] **PASS** | [ ] **FAIL** - No keyboard traps

**Keyboard Navigation Issues**:
```text
[Describe keyboard navigation problems]
```

---

### 5.3 Automated Testing Tools

**Tools Used**:
- [ ] WAVE (WebAIM)
- [ ] axe DevTools (Deque)
- [ ] Lighthouse (Google Chrome)
- [ ] Pa11y
- [ ] Tenon.io
- [ ] SiteImprove
- [ ] Other: [Specify]

**Automated Test Results**:
- Errors Detected: [X]
- Warnings Detected: [X]
- Contrast Failures: [X]

**Note**: Automated tools catch ~30% of issues. Manual testing required for full compliance.

**Tool Report**: [Link to WAVE/axe report or attach screenshot]

---

## 6. Accessibility Compliance Summary

### 6.1 Issue Severity Breakdown

**Critical Issues** (Level A failures - must fix):
- Total: [X]
- Categories: [List categories]

**Serious Issues** (Level AA failures - should fix):
- Total: [X]
- Categories: [List categories]

**Moderate Issues** (Best practice violations):
- Total: [X]
- Categories: [List categories]

**Minor Issues** (Enhancements):
- Total: [X]
- Categories: [List categories]

---

### 6.2 WCAG Conformance Level

**Conformance Assessment**:
- [ ] **Level A**: All Level A criteria met
- [ ] **Level AA**: All Level A + AA criteria met (RECOMMENDED)
- [ ] **Level AAA**: All criteria met (aspirational)
- [ ] **Not Conformant**: One or more Level A or AA failures

**Estimated Conformance**: [Pass Level AA | Fail Level AA | Pass Level A | Fail Level A]

---

### 6.3 Recommendation

- [ ] **APPROVED** - Meets WCAG 2.1 AA, accessible
- [ ] **CONDITIONAL APPROVAL** - Minor issues, approve with recommended fixes
- [ ] **REVISION REQUIRED** - Accessibility issues must be addressed before publication
- [ ] **REJECTED** - Critical accessibility barriers, cannot publish

**Required Fixes Before Approval**:
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

**Recommended Improvements** (Optional):
1. [Recommendation 1]
2. [Recommendation 2]

---

## 7. Approval and Sign-Off

### 7.1 Accessibility Lead Approval

**Reviewer Name**: [Name]
**Title**: [Accessibility Lead / QA / UX Designer]
**Email**: [Email]
**Review Date**: [YYYY-MM-DD]

**Approval Status**: [ ] Approved | [ ] Conditional | [ ] Revision Required | [ ] Rejected

**Signature**: [Digital signature or email confirmation]

---

### 7.2 Retest Schedule

**If Revision Required**:
- **Expected Fix Completion**: [YYYY-MM-DD]
- **Retest Date**: [YYYY-MM-DD]
- **Retest Scope**: [ ] Full retest | [ ] Spot-check fixes only

---

## 8. Resources and References

### 8.1 Testing Tools

**Browser Extensions**:
- WAVE: https://wave.webaim.org/extension/
- axe DevTools: https://www.deque.com/axe/devtools/
- Accessibility Insights: https://accessibilityinsights.io/

**Contrast Checkers**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Colour Contrast Analyser: https://www.tpgi.com/color-contrast-checker/

**Screen Readers**:
- NVDA (Free, Windows): https://www.nvaccess.org/
- VoiceOver (Built-in, Mac/iOS)
- TalkBack (Built-in, Android)

### 8.2 WCAG References

- WCAG 2.1 Quick Reference: https://www.w3.org/WAI/WCAG21/quickref/
- Understanding WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/
- How to Meet WCAG: https://www.w3.org/WAI/WCAG21/quickref/

### 8.3 Training Resources

- WebAIM: https://webaim.org/
- Deque University: https://dequeuniversity.com/
- A11y Project: https://www.a11yproject.com/

---

## Template Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-28 | MMK Framework Team | Initial template creation |

---

**END OF TEMPLATE**
