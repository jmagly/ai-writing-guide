# Wireframe/Interface Specification Template

## Purpose

Document interface design specifications to guide implementation. This template captures functional requirements, interaction patterns, content structure, and accessibility needs without prescribing pixel-perfect visual design.

## When to Use

- **Elaboration Phase**: Create wireframes for prioritized use cases to validate design direction
- **Construction Phase**: Detail wireframes for implementation; iterate based on usability testing
- **Transition Phase**: Validate implementation matches specifications; document final design

## Metadata

- ID: UI-{project}-{num} (e.g., UI-MYAPP-001)
- Owner: Product Designer
- Contributors: UX Lead, Software Implementer
- Reviewers: UX Lead, System Analyst
- Team: {team-name}
- Stakeholders: {end users, business stakeholders}
- Screen Type: Page | Modal | Panel | Component
- Status: draft | in-review | approved | implemented | deprecated
- Dates: created {YYYY-MM-DD} / updated {YYYY-MM-DD} / implemented {YYYY-MM-DD}
- Related: UC-{id}, US-{id}, PERSONA-{id}, J-{id}, COMP-{id}, TEST-{id}
- Links: {design-files, prototypes, implementation-code}

## Interface Overview

### Screen/Component Name

**{Descriptive Name}** (e.g., "Invoice Creation Form", "Search Results List", "User Profile Header")

### Purpose & User Goal

**What the user accomplishes on this interface**:

> "{User goal in one sentence}"

**Business Purpose**:

> "{Why this interface exists from business perspective}"

### Context

- **When User Arrives**: {navigation path, trigger event, deep link}
- **Where in Journey**: J-{id} Phase {n} - {journey phase name}
- **Frequency of Use**: {daily | weekly | occasional | rare}
- **User State**: {first-time | returning | expert | error-recovery}

## Layout & Structure

### Information Hierarchy

List content/components in priority order (top to bottom, left to right):

1. **{Component 1}**: {purpose}
2. **{Component 2}**: {purpose}
3. **{Component 3}**: {purpose}

### Wireframe Sketch

**Tool-Agnostic Reference**: Link to design file OR describe structure in text/ASCII.

**Example ASCII Wireframe**:

```
+------------------------------------------+
| [Logo]  Navigation: Home | Products | Account |
+------------------------------------------+
| Page Title: {Screen Name}                |
|                                          |
| [Breadcrumb: Home > Section > Page]     |
+------------------------------------------+
|                                          |
| Primary Content Area:                    |
|   [Component 1: Description]            |
|   [Component 2: Description]            |
|                                          |
|   +-----------------------------------+  |
|   | [Call-to-Action Button]           |  |
|   +-----------------------------------+  |
|                                          |
| Secondary Content:                       |
|   [Component 3: Description]            |
+------------------------------------------+
| Footer: Links | Help | Legal             |
+------------------------------------------+
```

### Responsive Breakpoints

#### Desktop (>1024px)

- {Layout description}

#### Tablet (768px - 1023px)

- {Layout changes: stacked vs. side-by-side, hidden elements}

#### Mobile (<767px)

- {Layout changes: navigation collapse, touch-optimized spacing}

### Grid & Spacing

**Grid System**: {12-column | 8-column | custom} (reference design system if applicable)

**Spacing Units**: {reference design system spacing scale, e.g., 4px, 8px, 16px, 32px}

## Component Inventory

### Navigation Elements

#### Primary Navigation

- **Type**: {header bar | sidebar | tabs | breadcrumb}
- **Items**: {list navigation items}
- **Active State Indicator**: {underline | highlight | icon}
- **Behavior**: {sticky | scrolls | collapses on mobile}

#### Secondary Navigation

- {Sub-navigation or contextual links}

### Content Display

#### Headings & Text

- **Page Title**: {H1 text or pattern}
- **Section Headings**: {H2, H3 hierarchy}
- **Body Text**: {paragraphs, lists, emphasis}
- **Help Text**: {tooltips, inline help, placeholder text}

#### Data Display

##### Tables

- **Columns**: {column names, data types, sortable?}
- **Rows**: {typical row count, pagination, infinite scroll}
- **Actions**: {row-level actions: edit, delete, view}
- **Empty State**: {message when no data}

##### Lists

- **Item Structure**: {what each list item contains}
- **Ordering**: {sort options, default order}
- **Filtering**: {available filters}

##### Cards

- **Card Content**: {image, title, description, metadata, actions}
- **Grid Layout**: {cards per row by breakpoint}

#### Media

- **Images**: {purpose, aspect ratio, alt text requirements}
- **Icons**: {purpose, size, accessible labels}
- **Charts/Graphs**: {type, data source, interaction}

### Interactive Elements

#### Buttons & Calls-to-Action

| Button | Type | States | Action |
|--------|------|--------|--------|
| {Button label} | {primary/secondary/tertiary} | {default, hover, active, disabled, loading} | {what happens on click} |
| {Button label} | {type} | {states} | {action} |

**Button Hierarchy**:

- **Primary**: {most important action per screen - limit to 1-2}
- **Secondary**: {supporting actions}
- **Tertiary**: {low-priority actions: cancel, back}

#### Form Fields

| Field Label | Type | Required? | Validation Rules | Error Messages |
|-------------|------|-----------|------------------|----------------|
| {Label} | {text/email/password/select/checkbox/radio} | {Y/N} | {rules} | {message} |
| {Label} | {type} | {Y/N} | {rules} | {message} |

**Field Specifications**:

- **Placeholder Text**: {example values to guide input}
- **Help Text**: {additional guidance below field}
- **Character Limits**: {max length, display counter?}
- **Auto-fill Support**: {autocomplete attribute values}
- **Default Values**: {pre-populated when applicable}

#### Links

- **Text Links**: {where they appear, destination}
- **Link Styling**: {underline, color, hover state}
- **External Link Indicator**: {icon or text to indicate new window}

#### Tooltips & Popovers

- **Trigger**: {hover | click | focus}
- **Content**: {brief explanation or additional detail}
- **Placement**: {top | bottom | left | right}

### Feedback Elements

#### Messages

##### Success Messages

- **Trigger**: {when displayed}
- **Content**: "{Example success message}"
- **Dismiss**: {auto-dismiss after {n} seconds | manual close}

##### Error Messages

- **Trigger**: {validation failure, system error}
- **Content**: "{Example error message with actionable guidance}"
- **Placement**: {inline below field | top of form | modal}

##### Warning Messages

- **Trigger**: {potentially destructive action, important notice}
- **Content**: "{Example warning}"

##### Informational Messages

- **Trigger**: {helpful tips, status updates}
- **Content**: "{Example info message}"

#### Loading States

- **Full-Page Load**: {spinner, skeleton screen, progress bar}
- **Component Load**: {inline spinner, shimmer effect}
- **Button Load**: {spinner replacing button text, disabled state}

#### Progress Indicators

- **Type**: {stepped progression, progress bar, percentage}
- **Steps**: {step 1, step 2, step 3}
- **Current Step Indication**: {highlight, checkmark for completed}

## Interaction States

### Screen States

Document how interface changes based on data and user actions:

#### Initial Load

- {What user sees on first render}
- {Loading state if data fetch required}

#### Loaded with Data

- {Normal state with content displayed}

#### Empty State

- {What shows when no data available}
- **Message**: "{Helpful empty state message}"
- **Action**: {CTA to create first item or change filters}

#### Error State

- {What shows when data load fails}
- **Error Message**: "{User-friendly error with recovery guidance}"
- **Recovery Actions**: {retry, contact support, go back}

#### Success State

- {What shows after successful action}
- {Confirmation message, next steps}

### Component States

#### Interactive Component States

- **Default**: {initial appearance}
- **Hover**: {visual change on mouse hover}
- **Focus**: {keyboard focus indicator - must be distinct and visible}
- **Active**: {appearance while being clicked/tapped}
- **Disabled**: {when action not available - with explanation}
- **Selected**: {when item is chosen from set}

#### Form Field States

- **Empty**: {placeholder visible}
- **Filled**: {with user input}
- **Valid**: {passes validation - optional indicator}
- **Invalid**: {fails validation - error styling + message}
- **Read-Only**: {displays value but not editable}

## Navigation & Flow

### Entry Points

How users arrive at this interface:

1. **{Entry point 1}**: {navigation path or link source}
2. **{Entry point 2}**: {deep link, notification, search result}

### Exit Points

Where users go next:

1. **{Exit point 1}**: {next screen/action after primary CTA}
2. **{Exit point 2}**: {cancel or back action}
3. **{Exit point 3}**: {navigation away}

### Related Screens

- UI-{id}: {related screen name} - {relationship: parent, child, sibling}
- UI-{id}: {related screen name}

### Modals & Overlays

If this interface contains modals:

#### Modal: {Modal Name}

- **Trigger**: {button click, automatic on condition}
- **Content**: {form, confirmation, information}
- **Actions**: {primary action, cancel}
- **Dismiss**: {click outside, ESC key, close button}
- **Size**: {small | medium | large | full-screen}

## Accessibility Requirements

### WCAG Compliance Level

**Target**: {WCAG 2.1 Level A | AA | AAA}

### Keyboard Navigation

#### Tab Order

1. {First focusable element}
2. {Second focusable element}
3. {etc. - logical reading order}

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| {Key combo} | {action} |
| ESC | {dismiss modal, cancel action} |
| Enter | {submit form, activate button} |

#### Focus Management

- **Focus Indicators**: {all interactive elements have visible focus ring}
- **Focus Trap**: {modals trap focus until dismissed}
- **Skip Links**: {skip to main content link at top of page}

### Screen Reader Support

#### ARIA Labels

| Element | ARIA Attribute | Value/Purpose |
|---------|----------------|---------------|
| {Element} | {aria-label, aria-labelledby, aria-describedby} | {text or ID} |
| {Icon button} | aria-label | "{Descriptive label for icon-only button}" |
| {Form field} | aria-required | "true" |

#### ARIA Roles

- {Custom widget using role="{role}"}

#### Live Regions

- **Error Messages**: {aria-live="assertive" for critical errors}
- **Success Messages**: {aria-live="polite" for confirmations}
- **Loading States**: {aria-busy="true"}

### Visual Accessibility

#### Color Contrast

- **Normal Text**: {minimum 4.5:1 contrast ratio}
- **Large Text**: {minimum 3:1 contrast ratio}
- **Interactive Elements**: {non-color indicators for states}

#### Text Sizing

- **Zoom to 200%**: {layout does not break, content remains accessible}
- **Minimum Text Size**: {16px for body text, 14px minimum}

#### Motion & Animation

- **Respect prefers-reduced-motion**: {disable or reduce animations}

### Assistive Technology Testing

Plan to test with:

- **Screen Readers**: {NVDA, JAWS, VoiceOver, TalkBack}
- **Keyboard Only**: {all functionality accessible}
- **Voice Control**: {clickable targets labeled}

## Content Requirements

### Microcopy

#### Page Title

- **Text**: "{Page title}"
- **Context**: {when it changes based on state or data}

#### Section Headings

- {Heading 1}: {guidelines for when/how it's used}
- {Heading 2}

#### Button Labels

- **Primary CTA**: "{Action verb + object}"
- **Secondary Action**: "{Action verb + object}"
- **Avoid**: {vague labels like "Submit", "OK", "Click Here"}

#### Error Messages

| Error Condition | Message Template |
|-----------------|------------------|
| {Required field empty} | "{Field name} is required." |
| {Invalid format} | "{Field name} must be {format}. Example: {example}." |
| {System error} | "We couldn't {action}. Please try again or contact support." |

#### Help Text

- {Field 1 help text}: "{Guidance on what to enter and why}"
- {Field 2 help text}

#### Empty State Messages

- **No Data**: "{Helpful message explaining why empty and what to do}"
- **No Search Results**: "No results for '{query}'. Try different keywords or filters."

### Placeholder Text

| Field | Placeholder |
|-------|-------------|
| {Field name} | "{Example value or format guidance}" |

### Tone & Voice

- **Tone**: {formal | conversational | technical | friendly}
- **Active Voice**: {use "Create report" not "Report creation"}
- **User-Centric**: {use "your account" not "the account"}

## Validation Rules

### Client-Side Validation

#### Field-Level Validation

| Field | Rule | Error Message | When Validated |
|-------|------|---------------|----------------|
| {Field} | {required, format, min/max length, range} | {message} | {on blur, on submit} |

#### Form-Level Validation

- **Cross-Field Rules**: {e.g., end date must be after start date}
- **Business Rules**: {e.g., quantity cannot exceed inventory}

### Server-Side Validation

- {Validations that require server check: uniqueness, authorization}

### Error Prevention

- **Input Masks**: {format phone numbers, dates as user types}
- **Autocomplete**: {suggest valid values}
- **Constraints**: {disable invalid selections}

## Responsive Behavior

### Mobile Adaptations

#### Touch Targets

- **Minimum Size**: {44x44px for tappable elements}
- **Spacing**: {adequate spacing to prevent mis-taps}

#### Mobile-Specific Patterns

- **Navigation**: {hamburger menu, bottom nav, tab bar}
- **Forms**: {appropriate input types for mobile keyboards}
- **Tables**: {horizontal scroll, collapse to cards, priority columns}

#### Gestures

- **Swipe**: {actions triggered by swipe - with fallback buttons}
- **Pinch-to-Zoom**: {allowed on images, maps}
- **Pull-to-Refresh**: {if applicable}

### Tablet Adaptations

- {Hybrid patterns between mobile and desktop}

## Design System Integration

### Components Used

Reference design system components (if applicable):

- **Button**: {design system component name and variant}
- **Input**: {component name}
- **Card**: {component name}

If no design system exists, note custom components requiring creation.

### Design Tokens

- **Colors**: {reference design system color tokens}
- **Typography**: {text styles from design system}
- **Spacing**: {spacing scale from design system}

### Deviations from Design System

If this interface requires custom design:

- **{Custom element}**: {rationale for deviation}

## Data Requirements

### Data Sources

- **{Data 1}**: {API endpoint, database table, static content}
- **{Data 2}**: {source}

### Data Model

| Field | Type | Required? | Source | Display Format |
|-------|------|-----------|--------|----------------|
| {field} | {string/number/date/boolean} | {Y/N} | {API/user input} | {format} |

### Data Refresh

- **Real-Time**: {fields that update automatically}
- **On-Demand**: {refresh button, pull-to-refresh}
- **Polling**: {frequency if auto-refresh}

### Data Privacy

- **Sensitive Data**: {fields requiring masking, encryption, redaction}
- **User Consent**: {data collection requiring explicit permission}

## Performance Requirements

### Load Time

- **Target**: {page renders in <{n} seconds on {connection type}}
- **Progressive Enhancement**: {critical content loads first}

### Perceived Performance

- **Skeleton Screens**: {show layout while loading}
- **Optimistic UI**: {update interface immediately, sync later}

### Data Limits

- **Pagination**: {items per page}
- **Infinite Scroll**: {load {n} items at a time}
- **Caching**: {cache static content, data expiry}

## Traceability

### Use Cases Implemented

- UC-{id}: {use case title} - {steps implemented by this interface}

### User Stories Satisfied

- US-{id}: {user story title}

### Journey Phase

- J-{id} Phase {n}: {journey phase this interface supports}

### Personas Served

- PERSONA-{id}: {primary persona}
- PERSONA-{id}: {secondary persona}

### Components

- COMP-{id}: {backend component providing data/logic}

### Tests

- TEST-{id}: {unit tests for interface logic}
- TEST-{id}: {accessibility tests}
- TEST-{id}: {usability test plan}

## Notes & Open Questions

- {Design decisions requiring stakeholder input}
- {Technical constraints affecting design}
- {Assumptions requiring validation}

## Revision History

| Date | Change | Author |
|------|--------|--------|
| {YYYY-MM-DD} | Initial wireframe | {name} |
| {YYYY-MM-DD} | Updated based on {usability test/stakeholder feedback} | {name} |
| {YYYY-MM-DD} | Final spec for implementation | {name} |

---

## Wireframe Specification Guidance

### Wireframe Fidelity Levels

#### Low-Fidelity (Lo-Fi)

- **Purpose**: Early exploration, rapid iteration
- **Format**: Sketches, boxes-and-arrows, minimal detail
- **Use When**: Inception/Elaboration, validating concepts

#### Mid-Fidelity (Mid-Fi)

- **Purpose**: Defining structure, layout, interaction patterns
- **Format**: Grayscale, placeholder text, realistic content structure
- **Use When**: Elaboration/Construction, design handoff
- **This Template**: Designed for mid-fidelity specs

#### High-Fidelity (Hi-Fi)

- **Purpose**: Visual design, branding, polish
- **Format**: Full color, real images, branded styling
- **Use When**: Construction/Transition, marketing materials
- **Note**: This template focuses on functional specs, not visual design

### Wireframes vs. Prototypes

- **Wireframe**: Static representation of interface structure
- **Prototype**: Interactive simulation of workflow

Use wireframes to document specifications; prototypes to validate flows.

### Tool-Agnostic Approach

This template is intentionally tool-agnostic. Create wireframes in:

- Design tools (Figma, Sketch, Adobe XD)
- Diagramming tools (Lucidchart, Miro, Mural)
- Paper sketches (photograph and link)
- HTML mockups
- ASCII art (for simple layouts)

Link to visual assets but ensure this text specification is complete.

### Common Pitfalls

- **Pixel perfection too early**: Focus on structure and function before polish
- **Missing states**: Don't forget loading, error, empty states
- **Accessibility afterthought**: Design for keyboard and screen readers from start
- **No validation guidance**: Specify error handling and messaging
- **Vague content**: Use realistic content length, not "lorem ipsum"

### Validation & Handoff

#### Design Review Checklist

- [ ] All interactive states documented
- [ ] Accessibility requirements specified
- [ ] Error handling defined
- [ ] Responsive behavior described
- [ ] Content requirements clear
- [ ] Traceability to requirements established

#### Developer Handoff

- [ ] Wireframe specification complete
- [ ] Visual design (if applicable) finalized
- [ ] Assets exported and linked
- [ ] Design system components identified
- [ ] Open questions resolved
- [ ] Implementation notes documented

#### Testing Handoff

- [ ] Success criteria defined
- [ ] Usability test scenarios written
- [ ] Accessibility test plan created
- [ ] Acceptance criteria clear
