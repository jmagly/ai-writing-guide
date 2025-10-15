# User Journey Map Template

## Purpose

Map end-to-end user experiences across touchpoints to identify pain points, opportunities, and design requirements. Journey maps reveal the emotional and practical reality of user workflows, informing requirements, service design, and reliability targets.

## When to Use

- **Inception Phase**: Map critical user journeys to identify scope and high-level requirements
- **Elaboration Phase**: Detail journeys for prioritized use cases; identify pain points driving design
- **Construction Phase**: Validate implemented flows match intended journey; identify friction
- **Transition Phase**: Use journey maps to define user acceptance scenarios

## Metadata

- ID: J-{project}-{num} (e.g., J-MYAPP-001)
- Owner: Product Designer
- Contributors: UX Lead, Requirements Analyst, UX Researcher
- Reviewers: UX Lead, Product Strategist, System Analyst
- Team: {team-name}
- Stakeholders: {business stakeholders, end-user representatives}
- Journey Type: Current State | Future State | Service Blueprint
- Status: draft | validated | active | deprecated
- Dates: created {YYYY-MM-DD} / updated {YYYY-MM-DD} / validated {YYYY-MM-DD}
- Related: PERSONA-{id}, UC-{id}, US-{id}, SLO-{id}, UR-{id}
- Links: {research-findings, analytics-data, service-maps}

## Journey Overview

### Journey Title

**{Descriptive Journey Name}** (e.g., "Emergency Incident Reporting", "Quarterly Financial Close")

### Journey Scope

- **Start Point**: {where journey begins - trigger event or user need}
- **End Point**: {where journey concludes - goal achieved or abandoned}
- **Frequency**: {how often users complete this journey: daily | weekly | monthly | annual | rare}
- **Duration**: {typical time span: minutes | hours | days | weeks}

### Persona

**PERSONA-{id}: {Persona Name}**

Primary persona experiencing this journey. Reference persona template for full context.

### User Goal

**What the user is trying to accomplish** (outcome, not steps):

> "{Goal statement in user's words}"

### Business Goal

**What the organization seeks to achieve** through supporting this journey:

- {Business objective 1}
- {Business objective 2}

## Journey Phases

Divide the journey into 3-7 high-level phases representing distinct mindsets or contexts.

### Phase 1: {Phase Name}

**User Mindset**: {what user is thinking/feeling at this stage}

#### Touchpoints

| Touchpoint | Channel | User Action | System/Service Response | Duration |
|------------|---------|-------------|-------------------------|----------|
| {Touchpoint name} | {web, mobile, email, phone, in-person} | {what user does} | {what system/service does} | {time} |
| {Touchpoint name} | {channel} | {action} | {response} | {time} |

#### User Thoughts & Questions

What the user is thinking at this phase:

- "{Thought or question 1}"
- "{Thought or question 2}"

#### User Emotions

**Emotion Level**: {frustrated | neutral | satisfied | delighted}

**Emotional Drivers**:

- {What's causing positive or negative emotion}

#### Pain Points

Problems, friction, or frustrations in this phase:

1. **{Pain Point Title}**: {description}
   - **Severity**: Critical | High | Medium | Low
   - **Frequency**: Always | Often | Sometimes | Rare
   - **Impact**: {time wasted, errors, abandonment risk}

#### Opportunities

Ideas for improvement:

1. **{Opportunity Title}**: {description}
   - **Potential Impact**: {improved satisfaction, reduced time, increased completion}
   - **Feasibility**: {easy | moderate | complex}

---

### Phase 2: {Phase Name}

{Repeat structure above}

---

### Phase 3: {Phase Name}

{Repeat structure above}

---

{Add additional phases as needed}

## Journey Metrics

### Success Metrics

Quantifiable measures of journey effectiveness:

- **Completion Rate**: {current %} → {target %}
- **Time to Complete**: {current duration} → {target duration}
- **Error Rate**: {current %} → {target %}
- **Abandonment Rate**: {current %} → {target %}

### Satisfaction Metrics

Qualitative measures of experience quality:

- **Customer Satisfaction (CSAT)**: {current score} → {target score}
- **Net Promoter Score (NPS)**: {current score} → {target score}
- **Customer Effort Score (CES)**: {current score} → {target score}

### Business Metrics

Organizational impact:

- **Cost per Journey**: {current cost} → {target cost}
- **Support Tickets Generated**: {current count} → {target count}
- **Revenue/Conversion Impact**: {current value} → {target value}

## Cross-Journey Dependencies

### Upstream Journeys

Journeys that typically precede this one:

- J-{id}: {journey title} - {how it connects}

### Downstream Journeys

Journeys that typically follow this one:

- J-{id}: {journey title} - {how it connects}

### Alternative Paths

- **If {condition}**: User may take J-{id} instead
- **If {condition}**: Journey branches to J-{id}

## Behind-the-Scenes (Service Blueprint)

**Optional**: For service design, document what happens "backstage" to support the user journey.

### Frontstage (User-Visible)

- {Touchpoints user sees and interacts with}

### Backstage (Internal)

- {Systems, processes, employees supporting the experience}
- {Handoffs between departments or systems}
- {Data flows and integrations}

### Support Processes

- {Infrastructure, policies, technology enabling the journey}

## Requirements Generated

### Use Cases

Journey phases map to use case scenarios:

- UC-{id}: {use case title} - {covers phase 1-2}
- UC-{id}: {use case title} - {covers phase 3-4}

### User Stories

Derived from pain points and opportunities:

- US-{id}: {user story title} - {addresses pain point from phase X}
- US-{id}: {user story title} - {enables opportunity from phase Y}

### Non-Functional Requirements

#### Performance

- **Response Time**: {acceptable latency based on user tolerance in journey}
- **Availability**: {required uptime based on journey frequency and criticality}
- **Throughput**: {concurrent users expected during peak journey volume}

#### Reliability (SLO/SLI)

Critical journeys require Service Level Objectives:

- SLO-{id}: {SLO title} - {reliability target for this journey}

#### Usability

- **Learnability**: {how quickly users must complete journey on first try}
- **Efficiency**: {target time reduction vs. current state}
- **Error Tolerance**: {acceptable error rate before frustration}

#### Accessibility

- **WCAG Level**: {A | AA | AAA based on persona needs}
- **Assistive Tech**: {screen readers, keyboard-only, voice control}

## Research Validation

### Research Methods Used

- **User Interviews**: {n participants, date range}
- **Contextual Inquiry**: {n observations, date range}
- **Analytics Review**: {date range, metrics examined}
- **Journey Workshops**: {participants, date}
- **Usability Testing**: {n sessions, date range}

### Data Sources

- UR-{id}: {research findings reference}
- {Analytics platform}: {dashboard or report link}
- {Customer feedback}: {survey, support tickets}

### Confidence Level

- **High**: Validated with {n} users across {x} research methods
- **Medium**: Based on {limited research / secondary data / expert judgment}
- **Low**: Hypothesis requiring validation

### Validation Date

- **Last Validated**: {YYYY-MM-DD}
- **Next Review**: {YYYY-MM-DD} (recommend per major release or quarterly)

## Journey Visualization

**Tool-Agnostic Reference**: Journey maps are typically visualized horizontally with phases as columns and swim-lanes for touchpoints, emotions, thoughts, pain points, and opportunities.

### Recommended Elements

- **Horizontal Timeline**: Left-to-right flow through phases
- **Emotion Curve**: Line graph showing emotional highs and lows across journey
- **Touchpoints**: Icons or labels per phase
- **Pain Points**: Red/negative indicators
- **Opportunities**: Green/positive indicators
- **Quotes**: User voice throughout

### Visualization Format

- {Link to visual diagram if created: Miro, Mural, Figma, Lucidchart, hand-drawn photo}
- {Or describe structure in text/ASCII if no tool used}

**Example ASCII Structure**:

```
Phase 1: Discovery | Phase 2: Evaluation | Phase 3: Purchase | Phase 4: Onboarding
-------------------|---------------------|------------------|--------------------
Touchpoint: Web    | Touchpoint: Demo    | Touchpoint: Form | Touchpoint: Email
Emotion: Curious   | Emotion: Skeptical  | Emotion: Anxious | Emotion: Relieved
Pain: Info hidden  | Pain: Slow response | Pain: Too long   | Pain: Confusing
Opportunity: FAQ   | Opportunity: Chat   | Opportunity: Pre-fill | Opportunity: Video
```

## Design & Implementation Guidance

### Design Principles for This Journey

Principles to guide design decisions specific to this journey:

1. **{Principle 1}**: {explanation based on journey insights}
2. **{Principle 2}**: {explanation}

### Key Design Requirements

- **{Requirement 1}**: {driven by pain point or opportunity}
- **{Requirement 2}**: {driven by user emotion or expectation}

### Validation Tests

How to test if implementation matches intended journey:

- **Usability Test Scenario**: "{Task description matching journey goal}"
- **Success Criteria**: {task completion, time, satisfaction score}
- **Test Plan**: TEST-{id}

## Risks & Constraints

### Journey Risks

Factors that could prevent journey success:

- **{Risk 1}**: {description, likelihood, impact}
- **{Risk 2}**: {description}

### External Dependencies

Elements outside product control affecting journey:

- **{Dependency 1}**: {third-party service, manual process, policy}
- **{Dependency 2}**: {dependency}

### Constraints

Limitations shaping journey experience:

- **Technical**: {platform limitations, integration constraints}
- **Regulatory**: {compliance requirements, privacy laws}
- **Business**: {budget, timeline, resource limitations}

## Journey Variations

### Edge Cases

Variations in journey based on conditions:

- **If {condition}**: {how journey changes}
- **If {condition}**: {alternative path}

### Multi-Persona Considerations

If multiple personas complete this journey:

- **PERSONA-{id}**: {how experience differs for this persona}
- **PERSONA-{id}**: {how experience differs for this persona}

## Notes

{Additional context, open questions, conflicting research findings, assumptions requiring validation}

## Revision History

| Date | Change | Author |
|------|--------|--------|
| {YYYY-MM-DD} | Initial draft based on {research} | {name} |
| {YYYY-MM-DD} | Validated with {n} users | {name} |
| {YYYY-MM-DD} | Updated after {feature launch/research} | {name} |

---

## Journey Mapping Guidance

### Journey Map vs. User Flow

- **Journey Map**: End-to-end experience including emotions, thoughts, channels (holistic)
- **User Flow**: Step-by-step task sequence within product (tactical)

Journey maps inform user flows but operate at different altitudes.

### Current State vs. Future State

- **Current State Journey**: Map existing experience to identify pain points (research-based)
- **Future State Journey**: Envision improved experience with product/service (design vision)

Start with current state to ground in reality, then create future state to guide design.

### Journey Map vs. Service Blueprint

- **Journey Map**: User perspective (frontstage)
- **Service Blueprint**: Adds backstage processes, systems, handoffs supporting user experience

Service blueprints are useful when journey involves multiple departments or complex systems.

### Choosing Journey Scope

- **Macro Journey**: High-level (e.g., "Become a customer" - weeks/months)
- **Micro Journey**: Detailed (e.g., "Complete checkout" - minutes)

Match scope to decision-making needs: macro for strategy, micro for design.

### Common Pitfalls

- **Too many phases**: 3-7 phases is ideal; more creates noise
- **Product-centric**: Focus on user goals, not product features
- **Missing emotions**: Emotions drive behavior; don't skip this
- **No validation**: Journey maps are hypotheses - test with real users
- **One-time exercise**: Journeys evolve; revisit regularly

### Integration with Development

- Link journey phases to epics or features in backlog
- Use journey pain points to prioritize user stories
- Reference journey maps in design reviews: "This addresses phase 3 pain point"
- Test implemented features against journey success metrics
- Update journey maps after launch based on analytics and feedback
