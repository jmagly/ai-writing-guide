# UX Templates

Templates for user experience research, design specification, and validation. These templates capture user insights and design decisions WITHOUT prescribing specific tools or visual design systems.

## Purpose

UX templates ensure that products are designed based on evidence (user research), structured around user needs (personas and journeys), specified for implementation (wireframes), and validated for accessibility (compliance checklists).

## Core Principles

1. **Evidence-Based**: Ground design in user research, not assumptions
2. **User-Centered**: Focus on user goals, not features
3. **Tool-Agnostic**: Specify WHAT to capture, not HOW to create visuals
4. **Accessibility First**: Build inclusive design from the start
5. **Traceability**: Link UX artifacts to requirements, design, and tests

## Templates

### P0 - Critical Templates

These four templates are essential for any product development effort:

#### persona-template.md

**Purpose**: Document user archetypes based on research

**Owner**: Product Designer

**When to Use**:

- Inception: Create primary/secondary personas from research
- Elaboration: Validate and refine personas
- Construction: Reference when prioritizing features
- Transition: Use for user acceptance testing scenarios

**Key Sections**:

- Demographics, goals, pain points, behaviors
- Accessibility needs
- Requirements implications (use cases, user stories driven by persona)
- Research validation (confidence level, sources)

**Output**: PERSONA-{project}-{num}

**Links to**:

- Use Cases (UC-): Which personas drive which use cases
- User Journeys (J-): Journeys this persona experiences
- User Stories (US-): Stories written from persona perspective

---

#### user-journey-map-template.md

**Purpose**: Map end-to-end user experiences across touchpoints

**Owner**: Product Designer

**When to Use**:

- Inception: Map critical journeys to identify scope
- Elaboration: Detail journeys for prioritized use cases
- Construction: Validate implemented flows
- Transition: Define user acceptance scenarios

**Key Sections**:

- Journey phases (3-7 high-level stages)
- Touchpoints, emotions, thoughts per phase
- Pain points and opportunities
- Metrics (completion rate, time, satisfaction)
- Requirements generated (use cases, SLOs, non-functional requirements)

**Output**: J-{project}-{num}

**Links to**:

- Personas (PERSONA-): Who experiences this journey
- Use Cases (UC-): Journey phases map to use case scenarios
- SLO/SLI: Critical journeys require reliability targets
- Wireframes (UI-): Screens supporting journey touchpoints

---

#### wireframe-specification-template.md

**Purpose**: Document interface design specifications for implementation

**Owner**: Product Designer

**When to Use**:

- Elaboration: Create wireframes for prioritized use cases
- Construction: Detail wireframes for implementation; iterate based on testing
- Transition: Validate implementation matches specifications

**Key Sections**:

- Layout and structure (responsive breakpoints)
- Component inventory (navigation, forms, data display, feedback)
- Interaction states (loading, error, empty, success)
- Navigation and flow (entry/exit points)
- Accessibility requirements (keyboard, screen reader, ARIA)
- Content requirements (microcopy, error messages)
- Validation rules
- Traceability (use cases, personas, journeys)

**Output**: UI-{project}-{num}

**Links to**:

- Use Cases (UC-): Which use case steps this interface implements
- Personas (PERSONA-): Primary and secondary users
- Journeys (J-): Which journey phase this supports
- Components (COMP-): Backend components providing data
- Tests (TEST-): Accessibility and usability tests

---

#### accessibility-checklist.md

**Purpose**: Validate WCAG 2.1 compliance

**Owner**: UX Lead

**When to Use**:

- Elaboration: Include accessibility requirements in design specs
- Construction: Validate per iteration before "done"
- Transition: Final audit before release; prepare VPAT if needed

**Key Sections**:

- WCAG 2.1 compliance checklist (Perceivable, Operable, Understandable, Robust)
- Automated testing results (axe, WAVE, Lighthouse)
- Manual testing results (keyboard, screen reader, zoom)
- User testing with people with disabilities
- Remediation plan
- Accessibility statement

**Output**: A11Y-{project}-{num}

**Links to**:

- Wireframes (UI-): Screens/components tested
- Components (COMP-): Implementation tested
- Tests (TEST-): Automated accessibility tests

---

## Template Usage by SDLC Phase

### Inception Phase

**Focus**: Understand users and define scope

**Templates to Create**:

1. **Personas**: Create 2-4 primary personas from user research (interviews, surveys, analytics)
2. **User Journeys**: Map 2-3 critical user journeys end-to-end
3. **Accessibility Targets**: Define WCAG compliance level (A, AA, AAA)

**Exit Criteria**:

- Personas validated with research (high confidence)
- Critical user journeys mapped
- Accessibility targets defined

**Artifacts**:

- PERSONA-{project}-001, 002, 003
- J-{project}-001, 002, 003
- Accessibility target documented in project intake

---

### Elaboration Phase

**Focus**: Detail design for prioritized use cases

**Templates to Create**:

1. **Wireframes**: Create wireframes for prioritized use cases
2. **Accessibility Design Review**: Review wireframes against accessibility checklist
3. **Journey Refinement**: Detail journey maps with touchpoints and metrics

**Exit Criteria**:

- Wireframes completed for core use cases
- Accessibility requirements specified in wireframes
- Wireframes linked to personas, journeys, use cases

**Artifacts**:

- UI-{project}-001, 002, 003... (one per major screen/component)
- A11Y-{project}-001 (design review)
- Updated journey maps with detailed touchpoints

---

### Construction Phase (Per Iteration)

**Focus**: Implement, test, iterate

**Templates to Use**:

1. **Wireframes**: Iterate based on usability testing feedback
2. **Accessibility Checklist**: Validate each feature before "done"
3. **Journey Validation**: Test implemented flows against journey maps

**Definition of Done** (UX Criteria):

- [ ] Design matches approved wireframes
- [ ] Accessibility checklist completed (0 Critical issues)
- [ ] Keyboard navigation verified
- [ ] Screen reader tested (minimum 1 platform)
- [ ] Responsive breakpoints validated
- [ ] Usability test conducted (if user-facing feature)

**Artifacts**:

- Updated UI-{project}-{num} based on feedback
- A11Y-{project}-{num} per iteration
- Usability test findings (if P1 templates added)

---

### Transition Phase

**Focus**: Final validation and release preparation

**Templates to Use**:

1. **Accessibility Audit**: Comprehensive accessibility test of entire product
2. **Journey Validation**: Validate end-to-end journeys work as intended
3. **Persona Validation**: Conduct user acceptance testing with persona-matching participants

**Exit Criteria**:

- Final accessibility audit passes (WCAG Level {target})
- Critical user journeys achieve success metrics
- User acceptance testing with personas confirms usability

**Artifacts**:

- A11Y-{project}-FINAL (comprehensive audit)
- VPAT/ACR (if required for enterprise/government sales)
- User acceptance test results
- Accessibility statement for website

---

## Integration with Development Workflow

### Traceability

UX artifacts link bidirectionally with requirements, design, and tests:

```
PERSONA → Use Cases → User Stories → Wireframes → Components → Tests
   ↓
Journey → Use Cases → SLO/SLI → Reliability Tests
   ↓
Wireframes → Accessibility Checklist → Accessibility Tests
```

### Card Metadata

All UX templates follow card metadata standard:

- **ID Prefixes**:
  - `PERSONA-{project}-{num}`: Personas
  - `J-{project}-{num}`: User Journeys
  - `UI-{project}-{num}`: Wireframes/Interface Specs
  - `A11Y-{project}-{num}`: Accessibility Checklists

- **Standard Metadata Fields**:
  - Owner, Contributors, Reviewers, Team, Stakeholders
  - Status: draft | in-review | validated | active | deprecated
  - Dates: created, updated, validated
  - Related: UC-, US-, PERSONA-, J-, UI-, COMP-, TEST-
  - Links: research-findings, design-files, prototypes

### Agent Roles

#### UX Lead

**Templates Reviewed**:

- persona-template.md (approve)
- user-journey-map-template.md (prioritize, validate)
- wireframe-specification-template.md (review for consistency, accessibility)
- accessibility-checklist.md (enforce compliance)

**Responsibilities**:

- Define UX strategy and accessibility targets
- Review designs for consistency and accessibility
- Govern design system (if P1 templates added)
- Plan usability testing

---

#### Product Designer

**Templates Created**:

- persona-template.md (create, validate)
- user-journey-map-template.md (create)
- wireframe-specification-template.md (primary deliverable)
- accessibility-checklist.md (validate designs)

**Responsibilities**:

- Conduct/synthesize user research into personas and journeys
- Create wireframes for use cases
- Ensure accessibility requirements in designs
- Iterate based on usability testing

---

#### Software Implementer

**Templates Used**:

- wireframe-specification-template.md (implementation guide)
- accessibility-checklist.md (validate implementation)
- persona-template.md (understand users)

**Responsibilities**:

- Implement designs per wireframe specifications
- Ensure keyboard navigation, ARIA, semantic HTML
- Run automated accessibility tests (axe, Pa11y)
- Fix accessibility issues per remediation plan

---

#### Test Engineer

**Templates Used**:

- accessibility-checklist.md (test plan)
- wireframe-specification-template.md (acceptance criteria)
- user-journey-map-template.md (test scenarios)

**Responsibilities**:

- Integrate automated accessibility tests in CI/CD
- Conduct manual accessibility testing (keyboard, screen reader)
- Validate implementations match wireframe specs
- Test user journeys end-to-end

---

## Tool Recommendations (NOT Required)

These templates are tool-agnostic. Teams can use any tools for creating visual assets:

### Design Tools

- Figma, Sketch, Adobe XD
- Balsamiq, Axure, InVision
- Paper sketches + photos
- HTML/CSS mockups

### Prototyping

- Figma, InVision, Marvel
- Axure, Framer
- Coded prototypes

### User Research

- UserTesting.com, Lookback, Dovetail
- Google Forms, Typeform (surveys)
- Zoom, Teams (remote interviews)
- Analytics: Google Analytics, Mixpanel, Amplitude

### Accessibility Testing

- **Automated**: axe DevTools, WAVE, Lighthouse, Pa11y
- **Screen Readers**: NVDA (free), JAWS, VoiceOver, TalkBack
- **Contrast**: Color Contrast Analyzer, WebAIM Contrast Checker

### Journey Mapping

- Miro, Mural, FigJam
- Lucidchart, Visio
- Whiteboard + sticky notes

**Key Principle**: Templates capture WHAT to document. Tools create HOW it looks visually. Link visual assets in template metadata but ensure text specification is complete.

---

## Success Metrics

### Immediate Success (P0 Templates Implemented)

- [ ] Product Designer can create personas using template
- [ ] Personas are linked to use cases
- [ ] User journeys are mapped for critical workflows
- [ ] Wireframes specify functional requirements for implementation
- [ ] Accessibility checklist validates WCAG compliance
- [ ] UX criteria included in Definition of Done

### Maturity Indicators

#### Level 1: Ad-hoc

- UX mentioned but not structured
- No templates or processes
- No validation or metrics

#### Level 2: Documented (P0 Achieved)

- Templates exist and are used
- Basic processes defined
- Manual validation
- **Target for minimum viable UX practice**

#### Level 3: Systematized (P1 - Future)

- Integrated workflows
- Automated validation (accessibility tests in CI/CD)
- Metrics-driven (track task success, satisfaction, accessibility)
- Design system established

#### Level 4: Optimized (P2 - Future)

- Continuous user research program
- Advanced accessibility (VPAT, user testing with people with disabilities)
- Competitive advantage through UX

---

## Common Pitfalls

### Personas

- Creating fictional demographics not based on research
- Too many personas (stick to 2-4 primary)
- Static personas (update as you learn)
- Personas as marketing segments (focus on behaviors, not demographics)

### User Journeys

- Product-centric instead of user-centric (focus on user goals, not features)
- Too many phases (3-7 is ideal)
- Missing emotions (emotions drive behavior)
- One-time exercise (update after launch based on analytics)

### Wireframes

- Pixel perfection too early (structure before polish)
- Missing states (loading, error, empty)
- Accessibility afterthought (design for keyboard/screen reader from start)
- No validation guidance (specify error handling)

### Accessibility

- Over-reliance on automated testing (catches only ~30% of issues)
- Testing late (retrofitting is expensive)
- Skipping manual testing (must test with screen readers)
- Removing focus indicators (never remove `:focus`)

---

## Next Steps (P1 Templates - Future)

When team matures, consider adding:

1. **Design System Documentation Template**: Document component library, design tokens, patterns
2. **Usability Test Plan Template**: Structure user validation testing
3. **User Research Findings Template**: Systematically capture research insights

See recommendations document for full P1/P2 roadmap.

---

## Resources

### WCAG & Accessibility

- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- WebAIM: https://webaim.org/
- A11y Project: https://www.a11yproject.com/

### UX Methods

- Nielsen Norman Group: https://www.nngroup.com/
- UX Collective: https://uxdesign.cc/
- Interaction Design Foundation: https://www.interaction-design.org/

### User Research

- IDEO Design Kit: https://www.designkit.org/
- 18F Methods: https://methods.18f.gov/

### Design Systems

- Design Systems Repo: https://designsystemsrepo.com/
- Figma Design Systems: https://www.figma.com/community/design-systems

---

## Questions?

For guidance on using these templates, consult:

- **UX Lead**: Strategy, accessibility targets, design review
- **Product Designer**: Persona creation, wireframing, journey mapping
- **System Analyst**: Traceability to requirements
- **Test Architect**: Accessibility testing integration

Or reference:

- `docs/sdlc/actors-and-templates.md`: Role-to-template mappings
- `docs/agents/sdlc/ux-lead.md`: UX Lead agent workflows
- `docs/agents/product-designer.md`: Product Designer agent workflows
