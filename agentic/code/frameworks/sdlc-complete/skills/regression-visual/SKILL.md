# regression-visual

Detect visual and UI regressions through screenshot comparison and pixel-diff analysis.

## Triggers

- "visual regression"
- "UI diff"
- "screenshot comparison"
- "visual testing"
- "check for UI changes"
- "visual baseline"
- "pixel diff"
- "layout regression"

## Purpose

This skill manages visual regression detection by:
- Capturing screenshots across browsers and viewports
- Comparing current UI to baseline screenshots
- Detecting pixel-level differences with configurable thresholds
- Identifying layout shifts, color changes, and missing elements
- Running component-level visual tests
- Checking accessibility visual indicators
- Generating visual diff reports with side-by-side comparisons

## Behavior

When triggered, this skill:

1. **Identifies visual test scope**:
   - Determine which components/pages to test
   - Select browsers and devices (cross-browser testing)
   - Identify viewports for responsive testing
   - Check for existing visual baselines
   - Locate test configuration

2. **Captures screenshots**:
   - Run browser automation (Playwright, Puppeteer)
   - Take screenshots at each viewport size
   - Capture component states (hover, focus, error, disabled)
   - Handle dynamic content (hide timestamps, animations)
   - Store screenshots with metadata

3. **Compares to baseline**:
   - Load baseline screenshots
   - Perform pixel-by-pixel comparison
   - Calculate difference percentage
   - Apply threshold tolerance (e.g., 0.1%)
   - Generate diff images highlighting changes

4. **Categorizes differences**:
   - Layout shift (position/size changes)
   - Color changes (background, text, borders)
   - Typography changes (font, size, weight)
   - Spacing/alignment issues
   - Missing or extra elements
   - Visual accessibility issues

5. **Generates visual diff report**:
   - Side-by-side baseline vs current
   - Diff overlay highlighting changes
   - List of detected regressions by category
   - Severity assessment per change
   - Links to affected components

6. **Integrates with CI/CD**:
   - Run visual tests in pipeline
   - Block PRs if threshold exceeded
   - Upload screenshots to cloud storage
   - Comment on PRs with visual diff links

## Visual Regression Categories

### Layout Shift

```yaml
layout_shift:
  description: Position or dimension changes
  detection:
    - element_moved
    - element_resized
    - overflow_introduced
    - spacing_changed
    - alignment_broken

  example:
    component: "NavigationBar"
    issue: "Menu shifted 10px right"
    severity: medium
    cause: "CSS margin change"
    diff_percentage: 2.3
```

### Color Changes

```yaml
color_changes:
  description: Color, gradient, or opacity changes
  detection:
    - background_color_changed
    - text_color_changed
    - border_color_changed
    - gradient_modified
    - opacity_changed

  example:
    component: "PrimaryButton"
    issue: "Background color #007bff → #0056b3"
    severity: high
    cause: "Design system update not applied"
    diff_percentage: 0.8
```

### Typography Changes

```yaml
typography_changes:
  description: Font, size, weight, line-height changes
  detection:
    - font_family_changed
    - font_size_changed
    - font_weight_changed
    - line_height_changed
    - letter_spacing_changed

  example:
    component: "Heading"
    issue: "Font size 24px → 22px"
    severity: low
    cause: "CSS reset applied incorrectly"
    diff_percentage: 0.5
```

### Spacing/Alignment Issues

```yaml
spacing_alignment:
  description: Padding, margin, alignment issues
  detection:
    - padding_changed
    - margin_changed
    - text_alignment_changed
    - element_misalignment
    - grid_layout_broken

  example:
    component: "CardGrid"
    issue: "Cards no longer aligned in grid"
    severity: high
    cause: "Flexbox to Grid migration incomplete"
    diff_percentage: 4.2
```

### Missing/Extra Elements

```yaml
element_changes:
  description: Elements added, removed, or hidden
  detection:
    - element_missing
    - element_added
    - visibility_changed
    - display_none_applied
    - z_index_overlap

  example:
    component: "Footer"
    issue: "Privacy link missing"
    severity: critical
    cause: "Conditional rendering bug"
    diff_percentage: 1.2
```

### Accessibility Visual Indicators

```yaml
accessibility_visual:
  description: Focus indicators, contrast, icon visibility
  detection:
    - focus_outline_missing
    - color_contrast_reduced
    - screen_reader_text_visible
    - icon_missing_or_broken
    - keyboard_navigation_indicator_absent

  example:
    component: "FormInput"
    issue: "Focus outline removed"
    severity: critical
    cause: "CSS reset removed :focus styles"
    diff_percentage: 0.3
    accessibility_impact: "Keyboard users cannot see focus"
```

## Tool Integration

### Percy

```yaml
percy_integration:
  description: Visual testing platform with cloud diffing
  workflow:
    - capture: "percy snapshot <name>"
    - compare: "percy finalize"
    - review: "Percy dashboard for diffs"

  configuration:
    project_token: "PERCY_TOKEN"
    widths: [375, 768, 1280, 1920]
    min_height: 1024
    enable_javascript: true

  example_command:
    - "npx percy exec -- npm run test:visual"
```

### Chromatic

```yaml
chromatic_integration:
  description: Storybook visual testing platform
  workflow:
    - build_storybook: "npm run build-storybook"
    - publish: "npx chromatic --project-token=<token>"
    - review: "Chromatic dashboard"

  configuration:
    project_token: "CHROMATIC_TOKEN"
    exit_zero_on_changes: false
    auto_accept_changes: false

  example_command:
    - "npx chromatic --project-token=$CHROMATIC_TOKEN"
```

### BackstopJS

```yaml
backstopjs_integration:
  description: Open-source screenshot comparison tool
  workflow:
    - setup: "backstop init"
    - reference: "backstop reference"
    - test: "backstop test"
    - approve: "backstop approve"

  configuration_file: "backstop.json"
  configuration:
    viewports:
      - label: mobile
        width: 375
        height: 667
      - label: tablet
        width: 768
        height: 1024
      - label: desktop
        width: 1920
        height: 1080
    scenarios:
      - label: "Homepage"
        url: "http://localhost:3000"
        selectors: ["document"]
        delay: 500
        misMatchThreshold: 0.1

  example_command:
    - "backstop test --config=backstop.json"
```

### Playwright Screenshots

```yaml
playwright_integration:
  description: Cross-browser screenshot capture with Playwright
  workflow:
    - setup: "playwright install"
    - capture: "playwright test --project=visual"
    - compare: "Custom comparison or integrate with Percy/Chromatic"

  test_example: |
    test('visual regression - homepage', async ({ page }) => {
      await page.goto('http://localhost:3000');

      // Hide dynamic content
      await page.evaluate(() => {
        document.querySelectorAll('.timestamp').forEach(el => el.style.visibility = 'hidden');
      });

      // Take screenshot
      await expect(page).toHaveScreenshot('homepage.png', {
        maxDiffPixels: 100,  // Allow 100 pixels difference
      });
    });

  browsers: [chromium, firefox, webkit]
  viewports:
    - width: 375, height: 667   # Mobile
    - width: 768, height: 1024  # Tablet
    - width: 1920, height: 1080 # Desktop
```

## Diff Threshold Configuration

```yaml
diff_thresholds:
  critical_components:
    threshold: 0.01  # 0.01% difference allowed
    components:
      - authentication_flow
      - checkout_process
      - payment_forms
    action_on_exceed: fail

  standard_components:
    threshold: 0.1   # 0.1% difference allowed
    components:
      - navigation
      - footer
      - product_cards
    action_on_exceed: warn

  low_priority_components:
    threshold: 1.0   # 1% difference allowed
    components:
      - blog_posts
      - marketing_banners
      - testimonials
    action_on_exceed: info

  ignore_areas:
    - ".timestamp"
    - ".live-chat-widget"
    - ".advertisement"
    - "#dynamic-content"
```

## Responsive Design Testing

```yaml
responsive_viewports:
  mobile:
    - name: "iPhone SE"
      width: 375
      height: 667
      user_agent: "Mobile Safari"
    - name: "iPhone 14 Pro"
      width: 393
      height: 852
      user_agent: "Mobile Safari"
    - name: "Android (Pixel 7)"
      width: 412
      height: 915
      user_agent: "Chrome Mobile"

  tablet:
    - name: "iPad Mini"
      width: 768
      height: 1024
      user_agent: "Mobile Safari"
    - name: "iPad Pro 11"
      width: 834
      height: 1194
      user_agent: "Mobile Safari"

  desktop:
    - name: "Laptop (1366x768)"
      width: 1366
      height: 768
    - name: "Desktop (1920x1080)"
      width: 1920
      height: 1080
    - name: "Wide (2560x1440)"
      width: 2560
      height: 1440

  breakpoints:
    - 375   # Mobile
    - 768   # Tablet
    - 1024  # Small desktop
    - 1280  # Medium desktop
    - 1920  # Large desktop
```

## Visual Diff Report

```markdown
# Visual Regression Report

**Date**: 2026-01-28T15:30:00Z
**Baseline**: visual-baseline-v2.1.0
**Current**: HEAD (commit abc123)
**Total Comparisons**: 47
**Status**: ⚠️ Regressions Detected

## Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| Total Screens | 47 | - |
| Matches | 42 | ✅ |
| Differences | 5 | ⚠️ |
| Critical | 1 | ❌ |
| High Severity | 2 | ⚠️ |
| Medium Severity | 1 | ⚠️ |
| Low Severity | 1 | ℹ️ |

## Critical Regressions

### 1. Login Form - Focus Indicator Missing

**Component**: `LoginForm`
**Severity**: Critical
**Category**: Accessibility Visual
**Diff**: 0.3%

**Baseline**:
![Baseline](baselines/login-form-focused.png)

**Current**:
![Current](current/login-form-focused.png)

**Diff**:
![Diff](diffs/login-form-focused-diff.png)

**Issue**: Focus outline no longer visible on input fields

**Impact**:
- Accessibility: Keyboard users cannot see which field is focused
- WCAG 2.1 Level AA failure: 2.4.7 Focus Visible

**Root Cause**: CSS reset removed `:focus` styles

**Recommendation**: Restore focus outline or implement custom focus indicator

**Introduced By**: commit def456 - "Update CSS reset to modern-normalize"

## High Severity Regressions

### 2. Product Card Grid - Layout Broken

**Component**: `ProductGrid`
**Severity**: High
**Category**: Layout Shift
**Diff**: 4.2%

**Baseline**:
![Baseline](baselines/product-grid-desktop.png)

**Current**:
![Current](current/product-grid-desktop.png)

**Diff**:
![Diff](diffs/product-grid-desktop-diff.png)

**Issue**: Cards no longer aligned in grid, third card wraps to new row

**Impact**:
- User Experience: Inconsistent card spacing
- Layout: Grid breaks at 1366px viewport

**Root Cause**: Flexbox to CSS Grid migration incomplete

**Recommendation**: Complete Grid migration or revert to Flexbox

**Affected Viewports**: Desktop (1366x768, 1920x1080)

### 3. Primary Button - Color Change

**Component**: `PrimaryButton`
**Severity**: High
**Category**: Color Change
**Diff**: 0.8%

**Baseline**:
![Baseline](baselines/primary-button.png)

**Current**:
![Current](current/primary-button.png)

**Diff**:
![Diff](diffs/primary-button-diff.png)

**Issue**: Background color changed from #007bff to #0056b3

**Impact**:
- Brand Consistency: Not using design system primary color
- Contrast: New color has slightly lower contrast (4.8:1 vs 5.2:1)

**Root Cause**: Design token not applied, hardcoded color used

**Recommendation**: Replace hardcoded #0056b3 with CSS var(--color-primary)

## Medium Severity Regressions

### 4. Navigation Bar - Spacing Change

**Component**: `NavigationBar`
**Severity**: Medium
**Category**: Spacing/Alignment
**Diff**: 2.3%

**Issue**: Menu items shifted 10px right, logo padding increased

**Impact**: Minor visual inconsistency, still functional

**Recommendation**: Review spacing changes in commit ghi789

## Low Severity Regressions

### 5. Footer - Typography Size

**Component**: `Footer`
**Severity**: Low
**Category**: Typography Change
**Diff**: 0.5%

**Issue**: Copyright text font size reduced from 14px to 12px

**Impact**: Minor readability change, within acceptable range

**Recommendation**: Verify intentional change or revert

## Passing Comparisons (42)

All other components match baseline within threshold:
- Homepage hero section ✅
- Contact form ✅
- Dashboard widgets (x12) ✅
- Profile settings ✅
- Search results ✅
... (37 more)

## Recommendations

### Immediate Actions

- [ ] Fix critical accessibility issue: Restore focus indicators
- [ ] Fix product grid layout on desktop viewports
- [ ] Review and correct primary button color

### Process Improvements

- [ ] Add visual regression tests to CI pipeline
- [ ] Require visual approval before merging UI changes
- [ ] Update design token usage guidelines
- [ ] Add pre-commit hook for CSS changes

### Baseline Updates

If changes are intentional:
- [ ] Review diffs with design team
- [ ] Update visual baseline to v2.2.0
- [ ] Document breaking changes in changelog
- [ ] Notify stakeholders of visual changes

## Approval

To update baseline with approved changes:

```bash
# Review changes
aiwg baseline compare visual-baseline-v2.1.0

# Approve specific changes
aiwg baseline update visual-baseline-v2.1.0 \
  --approve footer-typography \
  --approve navigation-spacing \
  --justification "Design system v2.2 updates"

# Or create new baseline
aiwg baseline create visual-baseline-v2.2.0 \
  --based-on v2.1.0 \
  --changes "Design system v2.2 applied"
```

## Test Execution Details

**Tool**: Playwright + Percy
**Browsers**: Chromium, Firefox, WebKit
**Viewports**: Mobile (375px), Tablet (768px), Desktop (1920px)
**Total Screenshots**: 141 (47 components × 3 viewports)
**Duration**: 4m 32s
**Parallel Execution**: 4 workers

## Links

- [Full Percy Report](https://percy.io/project/build/123)
- [CI Pipeline Run](https://ci.example.com/run/456)
- [GitHub PR #789](https://github.com/org/repo/pull/789)
```

## Usage Examples

### Detect Visual Regressions

```
User: "Run visual regression tests"

Skill executes:
1. Identify test configuration (Playwright, Percy, BackstopJS)
2. Determine viewports and browsers
3. Capture screenshots
4. Compare to baseline
5. Generate diff report

Output:
"Visual Regression Test Complete

Status: ⚠️ Regressions Detected

Summary:
- Total: 47 screens tested
- Matches: 42 (89%)
- Differences: 5 (11%)

Critical Issues:
1. Login form focus indicator missing (accessibility)
2. Product grid layout broken on desktop
3. Primary button color changed

See full report: .aiwg/testing/visual-regression-report.md

Review diffs: https://percy.io/project/build/123"
```

### Create Visual Baseline

```
User: "Create visual baseline for v2.1.0"

Skill checks:
"Creating visual baseline for v2.1.0

Capturing screenshots:
- Components: 47
- Viewports: 3 (mobile, tablet, desktop)
- Browsers: 3 (Chromium, Firefox, WebKit)

Total screenshots: 141

Estimated time: 5 minutes"

Skill creates:
"Visual Baseline Created: visual-baseline-v2.1.0

Scope: All UI components
Format: PNG screenshots
Location: .aiwg/testing/baselines/visual/v2.1.0/

Files:
- 141 baseline screenshots
- metadata.json with viewport/browser info
- manifest.yaml with component inventory

Status: Active
Git Commit: abc123
Release: v2.1.0

Next: Baseline will be used for regression detection"
```

### Compare Specific Component

```
User: "Check for visual changes in LoginForm"

Skill analyzes:
"Visual Comparison: LoginForm

Viewports Tested:
- Mobile (375px): ✅ Match
- Tablet (768px): ✅ Match
- Desktop (1920px): ❌ Regression

Regression Details:
Component: LoginForm
Viewport: Desktop (1920px)
Category: Accessibility Visual
Severity: Critical
Diff: 0.3%

Issue: Focus outline missing on input fields

Baseline:
[Shows image with visible focus outline]

Current:
[Shows image without focus outline]

Diff:
[Highlights missing outline area]

Recommendation: Restore focus styles for accessibility"
```

## Integration

This skill uses:
- `regression-baseline`: Manage visual baselines
- `regression-bisect`: Find commits that introduced visual changes
- `regression-report`: Generate comprehensive regression reports
- `test-coverage`: Ensure visual tests cover critical UI paths
- `project-awareness`: Detect test framework and configuration

## Agent Orchestration

```yaml
agents:
  setup:
    agent: test-engineer
    focus: Configure visual testing tools and capture baselines

  analysis:
    agent: test-architect
    focus: Analyze visual regressions and categorize issues

  remediation:
    agent: frontend-developer
    focus: Fix visual regressions based on analysis

  validation:
    agent: design-lead
    focus: Approve intentional visual changes
```

## Configuration

### Visual Testing Setup

```yaml
visual_testing:
  tool: playwright  # percy | chromatic | backstopjs | playwright

  browsers:
    - chromium
    - firefox
    - webkit

  viewports:
    - { width: 375, height: 667, name: "mobile" }
    - { width: 768, height: 1024, name: "tablet" }
    - { width: 1920, height: 1080, name: "desktop" }

  diff_threshold:
    default: 0.1  # 0.1% pixel difference
    critical: 0.01  # 0.01% for critical components

  baseline_path: ".aiwg/testing/baselines/visual/"
  screenshot_path: ".aiwg/testing/screenshots/"
  diff_path: ".aiwg/testing/diffs/"

  ignore_selectors:
    - ".timestamp"
    - ".live-chat"
    - "#advertisement"
```

### CI/CD Integration

```yaml
ci_integration:
  on: [pull_request]

  steps:
    - name: Run visual regression tests
      run: npm run test:visual

    - name: Upload screenshots
      uses: actions/upload-artifact@v3
      with:
        name: visual-diffs
        path: .aiwg/testing/diffs/

    - name: Comment on PR
      uses: percy/percy-comment@v1
      with:
        build-url: ${{ steps.percy.outputs.build-url }}

  fail_on:
    critical_regressions: true
    high_severity_regressions: true
    threshold_exceeded: true
```

## Output Locations

- Baselines: `.aiwg/testing/baselines/visual/`
- Screenshots: `.aiwg/testing/screenshots/`
- Diffs: `.aiwg/testing/diffs/`
- Reports: `.aiwg/testing/visual-regression-report.md`
- Metadata: `.aiwg/testing/visual-metadata.json`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/testing/regression.yaml
- @agentic/code/frameworks/sdlc-complete/skills/regression-baseline/SKILL.md
- @agentic/code/frameworks/sdlc-complete/skills/regression-report/SKILL.md
- @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md
- @.claude/rules/executable-feedback.md
