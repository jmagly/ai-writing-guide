# Accessibility Checklist Template

## Purpose

Validate interface accessibility compliance against WCAG 2.1 guidelines. This checklist ensures products are usable by people with disabilities and meet legal/regulatory requirements.

## When to Use

- **Elaboration Phase**: Include accessibility requirements in design specifications
- **Construction Phase**: Validate implementations per iteration before considering features "done"
- **Transition Phase**: Conduct final accessibility audit before release; prepare VPAT/ACR if required

## Metadata

- ID: A11Y-{project}-{num} (e.g., A11Y-MYAPP-001)
- Owner: UX Lead
- Contributors: Product Designer, Software Implementer, Test Engineer
- Reviewers: UX Lead, Accessibility Specialist
- Team: {team-name}
- Scope: {entire application | specific feature | component}
- WCAG Level Target: {A | AA | AAA}
- Standards: {WCAG 2.1, Section 508, ADA, EN 301 549, etc.}
- Status: draft | in-review | passed | failed | remediated
- Dates: created {YYYY-MM-DD} / tested {YYYY-MM-DD} / remediated {YYYY-MM-DD}
- Related: UI-{id}, COMP-{id}, TEST-{id}, REQ-{id}
- Links: {test-results, VPAT, remediation-plan}

## Testing Scope

### Component/Feature Under Test

- UI-{id}: {screen/component name}
- Release: {version number or iteration}

### Applicable Standards

- **WCAG 2.1 Level**: {A (minimum) | AA (recommended) | AAA (enhanced)}
- **Section 508**: {if U.S. federal compliance required}
- **ADA**: {if applicable for U.S. businesses}
- **EN 301 549**: {if European accessibility required}
- **Local Laws**: {other regional requirements}

### Testing Methodology

- [x] Automated testing (tools listed below)
- [x] Manual testing (keyboard, zoom, screen reader)
- [ ] User testing with people with disabilities

### Testing Environment

- **Browsers Tested**: {Chrome, Firefox, Safari, Edge - versions}
- **Screen Readers Tested**: {NVDA, JAWS, VoiceOver, TalkBack, Narrator}
- **Devices**: {desktop, mobile, tablet}
- **Operating Systems**: {Windows, macOS, iOS, Android}

## WCAG 2.1 Compliance Checklist

### Principle 1: Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

#### 1.1 Text Alternatives

Provide text alternatives for non-text content.

##### 1.1.1 Non-text Content (Level A)

- [ ] **All images have alt text**
  - Informative images: describe information conveyed
  - Functional images (links, buttons): describe function
  - Decorative images: use `alt=""` (empty alt)
  - Complex images: provide extended description via `aria-describedby` or adjacent text

- [ ] **Icons have accessible labels**
  - Icon-only buttons use `aria-label` or `aria-labelledby`
  - Icon-with-text buttons have visible text or `aria-label`

- [ ] **Form inputs have labels**
  - Use `<label>` element associated with input
  - Or use `aria-label` or `aria-labelledby`
  - Placeholder text does NOT replace label

- [ ] **CAPTCHAs have alternatives**
  - Provide alternative challenge format (audio, logic, etc.)

**Testing Method**: Automated (axe, WAVE), Manual inspection

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 1.2 Time-based Media

Provide alternatives for time-based media (audio, video).

##### 1.2.1 Audio-only and Video-only (Level A)

- [ ] **Pre-recorded audio-only has transcript**
- [ ] **Pre-recorded video-only has audio description or transcript**

##### 1.2.2 Captions (Level A)

- [ ] **Pre-recorded video has captions**
  - Captions synchronized with audio
  - Include speaker identification, sound effects, music

##### 1.2.3 Audio Description or Media Alternative (Level A)

- [ ] **Pre-recorded video has audio description OR transcript**

##### 1.2.4 Captions (Live) (Level AA)

- [ ] **Live audio has captions** (webinars, live streams)

##### 1.2.5 Audio Description (Level AA)

- [ ] **Pre-recorded video has audio description**

**Note**: Level AAA criteria (1.2.6-1.2.9) omitted unless targeting AAA.

**Testing Method**: Manual review of media content

**Issues Found**:

| ID | Media | Issue | Severity | Status | Assignee |
|----|-------|-------|----------|--------|----------|
|    |       |       |          |        |          |

---

#### 1.3 Adaptable

Create content that can be presented in different ways without losing information.

##### 1.3.1 Info and Relationships (Level A)

- [ ] **Semantic HTML used correctly**
  - Headings: `<h1>` through `<h6>` in hierarchical order
  - Lists: `<ul>`, `<ol>`, `<li>` for list content
  - Tables: `<th>` for headers, `<caption>` for table title, `scope` attribute
  - Forms: `<fieldset>` and `<legend>` for grouped inputs

- [ ] **Heading hierarchy logical**
  - Single `<h1>` per page
  - No skipped heading levels (h2 → h4)

- [ ] **ARIA landmarks used**
  - `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` OR equivalent ARIA roles

- [ ] **Tables are data tables, not layout**
  - Use CSS Grid/Flexbox for layout, NOT tables

##### 1.3.2 Meaningful Sequence (Level A)

- [ ] **Reading order is logical**
  - Content order in DOM matches visual order
  - Tab order follows reading order

##### 1.3.3 Sensory Characteristics (Level A)

- [ ] **Instructions don't rely solely on sensory characteristics**
  - Avoid "Click the round button" → use "Click the Save button"
  - Avoid "See instructions below" without clear heading/label

##### 1.3.4 Orientation (Level AA)

- [ ] **Content works in both portrait and landscape**
  - No orientation lock unless essential (e.g., piano app)

##### 1.3.5 Identify Input Purpose (Level AA)

- [ ] **Input fields use autocomplete attribute**
  - Use `autocomplete="name"`, `autocomplete="email"`, etc.
  - Enables autofill for users with cognitive disabilities

**Testing Method**: Automated (axe, WAVE), Manual inspection, Reading order test (CSS off)

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 1.4 Distinguishable

Make it easier for users to see and hear content.

##### 1.4.1 Use of Color (Level A)

- [ ] **Color is not the only visual means of conveying information**
  - Links indicated by underline, not just color
  - Required fields marked with asterisk/text, not just red
  - Charts use patterns/labels, not just color

##### 1.4.2 Audio Control (Level A)

- [ ] **Auto-playing audio can be paused or volume controlled**
  - Audio longer than 3 seconds has controls

##### 1.4.3 Contrast (Minimum) (Level AA)

- [ ] **Normal text has 4.5:1 contrast ratio**
  - Text < 24px (or < 19px bold)
  - Includes placeholder text, disabled text

- [ ] **Large text has 3:1 contrast ratio**
  - Text ≥ 24px (or ≥ 19px bold)

- [ ] **UI components have 3:1 contrast**
  - Buttons, form fields, focus indicators
  - Component states distinguishable

- [ ] **Graphical objects have 3:1 contrast**
  - Icons, charts, infographics

**Testing Method**: Automated (axe, WAVE), Color contrast analyzer

**Contrast Ratios Measured**:

| Element | Foreground | Background | Ratio | Pass? |
|---------|------------|------------|-------|-------|
|         | {hex}      | {hex}      | :1    | Y/N   |

##### 1.4.4 Resize Text (Level AA)

- [ ] **Text can be resized to 200% without loss of content or functionality**
  - Test: Zoom browser to 200%, verify no content cut off

##### 1.4.5 Images of Text (Level AA)

- [ ] **Text is used instead of images of text**
  - Logos are exception
  - Use CSS/fonts for styled text, not images

##### 1.4.10 Reflow (Level AA)

- [ ] **Content reflows at 320px width without horizontal scrolling**
  - Responsive design works down to 320px
  - Exception: data tables, diagrams, toolbars

##### 1.4.11 Non-text Contrast (Level AA)

- [ ] **UI components have 3:1 contrast against adjacent colors**
  - Form field borders visible
  - Button boundaries clear
  - Focus indicators distinct

##### 1.4.12 Text Spacing (Level AA)

- [ ] **Content adapts to increased text spacing**
  - Test: Apply CSS spacing overrides, verify no text cut off
  - Line height 1.5x, paragraph spacing 2x, letter spacing 0.12x

##### 1.4.13 Content on Hover or Focus (Level AA)

- [ ] **Tooltips/popovers are dismissible, hoverable, and persistent**
  - Dismissible: ESC key or moving pointer closes
  - Hoverable: Pointer can move over tooltip without closing
  - Persistent: Stays visible until user dismisses

**Testing Method**: Automated (axe, WAVE), Manual zoom test, Contrast analyzer

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

### Principle 2: Operable

User interface components and navigation must be operable.

#### 2.1 Keyboard Accessible

Make all functionality available from a keyboard.

##### 2.1.1 Keyboard (Level A)

- [ ] **All functionality available via keyboard**
  - No mouse-only interactions
  - Custom widgets operable with keyboard

##### 2.1.2 No Keyboard Trap (Level A)

- [ ] **Keyboard focus can always move away**
  - Modals allow ESC to close
  - Dropdowns allow ESC to close
  - Embedded content doesn't trap focus

##### 2.1.4 Character Key Shortcuts (Level A)

- [ ] **Single-character shortcuts can be turned off, remapped, or active only on focus**
  - Prevents conflicts with screen readers

**Testing Method**: Manual keyboard-only navigation (unplug mouse)

**Keyboard Navigation Test**:

- [ ] Tab through page in logical order
- [ ] Shift+Tab reverses tab order
- [ ] Enter activates buttons/links
- [ ] Space activates buttons, toggles checkboxes
- [ ] Arrow keys navigate custom widgets (dropdowns, tabs, sliders)
- [ ] ESC closes modals/dropdowns
- [ ] No keyboard traps

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 2.2 Enough Time

Provide users enough time to read and use content.

##### 2.2.1 Timing Adjustable (Level A)

- [ ] **Time limits can be turned off, adjusted, or extended**
  - Session timeouts warn with option to extend
  - Minimum 20 seconds warning

##### 2.2.2 Pause, Stop, Hide (Level A)

- [ ] **Auto-updating content can be paused, stopped, or hidden**
  - Carousels, slideshows, scrolling text have controls

**Testing Method**: Manual inspection

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 2.3 Seizures and Physical Reactions

Do not design content that can cause seizures.

##### 2.3.1 Three Flashes or Below Threshold (Level A)

- [ ] **No content flashes more than 3 times per second**
  - Applies to animations, videos, GIFs

**Testing Method**: Manual inspection of animations

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 2.4 Navigable

Provide ways to help users navigate, find content, and determine where they are.

##### 2.4.1 Bypass Blocks (Level A)

- [ ] **Skip navigation link provided**
  - "Skip to main content" link at top of page
  - Or ARIA landmarks (`<main>`, `<nav>`) for screen reader users

##### 2.4.2 Page Titled (Level A)

- [ ] **Pages have descriptive titles**
  - `<title>` describes page topic/purpose
  - Title is unique per page

##### 2.4.3 Focus Order (Level A)

- [ ] **Focus order is logical**
  - Tab order matches visual/reading order

##### 2.4.4 Link Purpose (In Context) (Level A)

- [ ] **Link text describes destination**
  - Avoid "Click here", "Read more" without context
  - Use "Read more about {topic}" or aria-label

##### 2.4.5 Multiple Ways (Level AA)

- [ ] **Multiple ways to find pages**
  - Navigation menu + search
  - Or sitemap, breadcrumbs, related links

##### 2.4.6 Headings and Labels (Level AA)

- [ ] **Headings and labels are descriptive**
  - Headings describe following content
  - Form labels describe field purpose

##### 2.4.7 Focus Visible (Level AA)

- [ ] **Keyboard focus indicator is visible**
  - Do NOT remove `:focus` outline
  - Custom focus styles have 3:1 contrast

**Testing Method**: Manual keyboard navigation, Screen reader test

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 2.5 Input Modalities

Make it easier for users to operate functionality through various inputs.

##### 2.5.1 Pointer Gestures (Level A)

- [ ] **Multi-point or path-based gestures have single-pointer alternative**
  - Pinch-to-zoom has +/- buttons
  - Swipe has arrow buttons

##### 2.5.2 Pointer Cancellation (Level A)

- [ ] **Click actions complete on up-event (mouseup/touchend)**
  - Prevents accidental activation
  - Allows user to drag pointer away to cancel

##### 2.5.3 Label in Name (Level A)

- [ ] **Accessible name includes visible label text**
  - If button shows "Submit", accessible name includes "Submit"
  - Enables voice control users

##### 2.5.4 Motion Actuation (Level A)

- [ ] **Functionality triggered by motion has UI alternative**
  - Shake-to-undo has undo button
  - Tilt-to-scroll has scroll buttons

**Testing Method**: Manual inspection, Touch device testing

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

### Principle 3: Understandable

Information and operation of user interface must be understandable.

#### 3.1 Readable

Make text content readable and understandable.

##### 3.1.1 Language of Page (Level A)

- [ ] **Page language is declared**
  - `<html lang="en">` (or appropriate language code)

##### 3.1.2 Language of Parts (Level AA)

- [ ] **Language changes are marked**
  - `<span lang="es">Hola</span>` for foreign language phrases

**Testing Method**: Automated (axe, WAVE), Manual inspection

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 3.2 Predictable

Make web pages appear and operate in predictable ways.

##### 3.2.1 On Focus (Level A)

- [ ] **Focus does not change context**
  - Focusing a field doesn't submit form
  - Focusing a link doesn't navigate

##### 3.2.2 On Input (Level A)

- [ ] **Input does not change context**
  - Selecting radio button doesn't submit form
  - Typing doesn't navigate away

##### 3.2.3 Consistent Navigation (Level AA)

- [ ] **Navigation is consistent across pages**
  - Main menu in same location/order
  - Same navigation mechanism throughout

##### 3.2.4 Consistent Identification (Level AA)

- [ ] **Components with same functionality are identified consistently**
  - Search icon always labeled "Search"
  - Edit icon always labeled "Edit"

**Testing Method**: Manual inspection, Multi-page review

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

#### 3.3 Input Assistance

Help users avoid and correct mistakes.

##### 3.3.1 Error Identification (Level A)

- [ ] **Errors are identified in text**
  - Form validation errors described in text
  - Not solely by color or icon

##### 3.3.2 Labels or Instructions (Level A)

- [ ] **Labels and instructions provided for inputs**
  - Required fields marked
  - Format instructions provided (e.g., date format)

##### 3.3.3 Error Suggestion (Level AA)

- [ ] **Error messages suggest corrections**
  - "Email format invalid" → "Enter email as name@example.com"

##### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)

- [ ] **Critical actions are reversible, checked, or confirmed**
  - Financial transactions require confirmation
  - Legal submissions show review page
  - Data deletion requires confirmation

**Testing Method**: Manual form submission testing

**Error Handling Test**:

- [ ] Submit form with errors
- [ ] Errors announced by screen reader
- [ ] Focus moves to first error
- [ ] Errors listed at top of form
- [ ] Each field shows inline error
- [ ] Error messages are actionable

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

### Principle 4: Robust

Content must be robust enough to be interpreted by a wide variety of user agents.

#### 4.1 Compatible

Maximize compatibility with current and future user agents, including assistive technologies.

##### 4.1.1 Parsing (Level A) - DEPRECATED in WCAG 2.2

- [ ] **HTML is valid** (still best practice)
  - No duplicate IDs
  - Elements properly nested
  - Start/end tags correct

##### 4.1.2 Name, Role, Value (Level A)

- [ ] **All UI components have accessible name and role**
  - Standard HTML elements have implicit roles
  - Custom widgets use ARIA roles

##### 4.1.3 Status Messages (Level AA)

- [ ] **Status messages announced to screen readers**
  - Use `role="status"` or `aria-live="polite"` for non-critical messages
  - Use `role="alert"` or `aria-live="assertive"` for critical messages

**Testing Method**: Automated (axe, WAVE), Screen reader testing

**ARIA Usage Review**:

- [ ] ARIA roles used correctly (not overriding semantic HTML)
- [ ] ARIA attributes valid for roles
- [ ] Dynamic content changes announced
- [ ] Loading states announced

**Issues Found**:

| ID | Element | Issue | Severity | Status | Assignee |
|----|---------|-------|----------|--------|----------|
|    |         |       |          |        |          |

---

## Automated Testing Results

### Tools Used

- **axe DevTools**: {version, date}
- **WAVE**: {date}
- **Lighthouse**: {score, date}
- **Pa11y**: {version, date}
- {Other tools}

### Automated Test Summary

| Tool | Date | Critical | Serious | Moderate | Minor | Passed? |
|------|------|----------|---------|----------|-------|---------|
| axe  |      |          |         |          |       | Y/N     |
| WAVE |      |          |         |          |       | Y/N     |

### Critical Issues (Automated)

| ID | Tool | WCAG Criterion | Element | Issue | Status |
|----|------|----------------|---------|-------|--------|
|    |      |                |         |       |        |

---

## Manual Testing Results

### Screen Reader Testing

#### NVDA (Windows)

- **Version**: {version}
- **Browser**: {Chrome/Firefox version}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**:

| ID | Location | Issue | Severity | Status | Assignee |
|----|----------|-------|----------|--------|----------|
|    |          |       |          |        |          |

#### JAWS (Windows)

- **Version**: {version}
- **Browser**: {IE/Chrome version}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**: {same table format}

#### VoiceOver (macOS)

- **Version**: {macOS version}
- **Browser**: {Safari version}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**: {same table format}

#### VoiceOver (iOS)

- **Version**: {iOS version}
- **Device**: {iPhone/iPad model}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**: {same table format}

#### TalkBack (Android)

- **Version**: {Android version}
- **Device**: {device model}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**: {same table format}

### Keyboard-Only Testing

- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**:

| ID | Location | Issue | Severity | Status | Assignee |
|----|----------|-------|----------|--------|----------|
|    |          |       |          |        |          |

### Zoom/Magnification Testing

- **Zoom Level**: 200%
- **Browser**: {name, version}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Issues Found**: {same table format}

### Mobile Touch Testing

- **Device**: {model}
- **Date Tested**: {YYYY-MM-DD}
- **Tester**: {name}

**Touch Target Sizing**:

- [ ] All interactive elements ≥ 44x44px
- [ ] Adequate spacing between targets

**Issues Found**: {same table format}

---

## User Testing with People with Disabilities

**Optional but highly recommended**

### Participants

- **Participant 1**: {disability type, assistive tech used, date tested}
- **Participant 2**: {disability type, assistive tech used, date tested}

### Tasks

1. {Task description}
2. {Task description}

### Findings

| Participant | Task | Success? | Issues | Severity |
|-------------|------|----------|--------|----------|
|             |      | Y/N      |        |          |

---

## Accessibility Issues Summary

### Total Issues by Severity

| Severity | Count | Definition |
|----------|-------|------------|
| Critical | {n}   | Blocks core functionality; WCAG Level A failure |
| Serious  | {n}   | Significant barrier; WCAG Level AA failure |
| Moderate | {n}   | Noticeable barrier; best practice violation |
| Minor    | {n}   | Minor inconvenience; enhancement opportunity |

### Acceptance Criteria

- [ ] **Zero Critical issues**
- [ ] **Zero Serious issues** (or documented remediation plan)
- [ ] **Moderate issues ≤ {threshold}** (or accepted as technical debt)

### Overall Status

**WCAG 2.1 Level {A/AA/AAA} Compliance**: {PASS | FAIL | CONDITIONAL PASS}

**Conditions** (if conditional):

- {Issue requiring remediation before full pass}

---

## Remediation Plan

### Critical Issues (Must Fix)

| ID | Issue | WCAG | Assigned To | Due Date | Status |
|----|-------|------|-------------|----------|--------|
|    |       |      |             |          |        |

### Serious Issues (Should Fix)

| ID | Issue | WCAG | Assigned To | Due Date | Status |
|----|-------|------|-------------|----------|--------|
|    |       |      |             |          |        |

### Moderate/Minor Issues (Nice to Fix)

| ID | Issue | WCAG | Priority | Notes |
|----|-------|------|----------|-------|
|    |       |      | P1/P2/P3 |       |

---

## Accessibility Statement

**For publication on website** (after remediation):

> {Organization Name} is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards.
>
> **Conformance Status**: {Fully conformant | Partially conformant | Not conformant} with WCAG 2.1 Level {AA}.
>
> **Feedback**: Contact {accessibility@example.com} for accessibility concerns.
>
> **Assessment Date**: {YYYY-MM-DD}

---

## VPAT/Accessibility Conformance Report (ACR)

**If required for enterprise/government sales**

Link to completed VPAT: {file path or URL}

VPAT documents conformance with:

- WCAG 2.1 (web content)
- Revised Section 508 (U.S. federal)
- EN 301 549 (European)

---

## Notes

{Additional context, known limitations, future improvements, vendor dependencies}

## Revision History

| Date | Change | Author |
|------|--------|--------|
| {YYYY-MM-DD} | Initial accessibility test | {name} |
| {YYYY-MM-DD} | Remediation completed | {name} |
| {YYYY-MM-DD} | Re-test after fixes | {name} |

---

## Accessibility Testing Guidance

### When to Test

- **Design Phase**: Review wireframes/designs for potential issues
- **Per Iteration**: Test new features before considering "done"
- **Before Release**: Comprehensive audit of entire product
- **Ongoing**: Regression testing as product evolves

### Testing Cadence

- **Automated**: Every commit (CI/CD integration)
- **Manual**: Per feature (iteration)
- **User Testing**: Pre-release (quarterly)

### Severity Definitions

#### Critical

- Completely blocks access to core functionality
- WCAG Level A failure
- Legal compliance risk
- Examples: No keyboard access, missing alt text on critical images, color-only information

#### Serious

- Significant barrier to access
- WCAG Level AA failure
- Poor user experience for people with disabilities
- Examples: Insufficient contrast, missing focus indicators, unclear error messages

#### Moderate

- Noticeable inconvenience
- Best practice violation
- Affects some users in some contexts
- Examples: Verbose screen reader announcements, non-semantic HTML, missing autocomplete

#### Minor

- Small usability issue
- Enhancement opportunity
- Minimal impact
- Examples: Inconsistent labeling, redundant links, overly complex language

### Recommended Tools

#### Automated Testing

- **axe DevTools** (browser extension): Comprehensive WCAG checker
- **WAVE** (browser extension): Visual accessibility review
- **Lighthouse** (Chrome DevTools): Accessibility audit + performance
- **Pa11y** (CLI): CI/CD integration
- **Deque axe-core** (library): JavaScript testing framework integration

#### Manual Testing Tools

- **Color Contrast Analyzer**: Measure contrast ratios
- **HeadingsMap** (browser extension): Validate heading structure
- **ANDI** (bookmarklet): Screen reader simulation
- **Accessible Name & Description Inspector** (browser DevTools)

#### Screen Readers

- **NVDA** (Windows): Free, most popular
- **JAWS** (Windows): Commercial, widely used
- **VoiceOver** (macOS/iOS): Built-in to Apple devices
- **TalkBack** (Android): Built-in to Android devices
- **Narrator** (Windows): Built-in to Windows

### Common Pitfalls

- **Over-reliance on automated testing**: Catches only ~30% of issues
- **Testing late**: Retrofitting accessibility is expensive
- **Testing without assistive tech**: Must test with real screen readers
- **Skipping keyboard testing**: Many developers forget keyboard-only users
- **Removing focus indicators**: Never remove `:focus` styles
- **Using ARIA incorrectly**: No ARIA is better than bad ARIA

### Integration with Development

#### Definition of Done

Accessibility criteria should be in DoD:

- [ ] Automated accessibility tests pass (0 Critical issues)
- [ ] Manual keyboard navigation verified
- [ ] Screen reader tested (minimum 1 platform)
- [ ] Color contrast validated
- [ ] Semantic HTML used

#### CI/CD Integration

Automate accessibility testing in pipeline:

```bash
# Example: Pa11y in CI
pa11y --threshold 0 --level error https://staging.example.com
```

Fail build on Critical issues.

#### Accessibility Champions

- Designate team member as accessibility advocate
- Provide training on WCAG, screen readers
- Review code/designs for accessibility

### Resources

- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM**: https://webaim.org/ (excellent guides and training)
- **A11y Project**: https://www.a11yproject.com/ (accessible checklist)
- **Deque University**: https://dequeuniversity.com/ (comprehensive training)
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
