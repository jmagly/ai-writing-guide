# Persona Template

## Purpose

Document validated user archetypes based on research data. Personas inform requirements, design decisions, and testing
scenarios by representing real user needs, behaviors, and contexts.

## When to Use

- **Inception Phase**: Create primary and secondary personas from user research
- **Elaboration Phase**: Validate personas through additional research; refine as understanding deepens
- **Construction Phase**: Reference personas when prioritizing features and making design trade-offs
- **Transition Phase**: Use personas to define user acceptance testing scenarios

## Metadata

- ID: PERSONA-{project}-{num} (e.g., PERSONA-MYAPP-001)
- Owner: Product Designer
- Contributors: UX Lead, Requirements Analyst, UX Researcher
- Reviewers: UX Lead, Product Strategist
- Team: {team-name}
- Stakeholders: {business stakeholders, end-user representatives}
- Type: Primary | Secondary | Anti-persona
- Status: draft | validated | active | deprecated
- Dates: created {YYYY-MM-DD} / updated {YYYY-MM-DD} / validated {YYYY-MM-DD}
- Related: US-{id}, UC-{id}, J-{id} (journeys), UR-{id} (research)
- Links: {research-findings, interview-transcripts, survey-data}

## Persona Overview

### Persona Name

**{Descriptive Name}** (memorable, authentic - not stereotypical)

### Representative Quote

> "{One-sentence quote that captures persona essence, goals, or frustrations}"

This quote should reflect the persona's voice and primary motivation or pain point.

### Photo/Visual Reference

**Optional**: If using visual representation, note reference only (tool-agnostic). Avoid stock photo cliches.

## Demographics & Context

### Role & Responsibility

- **Job Title/Role**: {current role}
- **Industry/Domain**: {sector or context}
- **Experience Level**: {years in role/domain}
- **Organizational Context**: {team size, reporting structure, decision authority}

### Technical Proficiency

- **Overall Tech Comfort**: {novice | intermediate | advanced | expert}
- **Relevant Tools Used**: {tools/systems currently in workflow}
- **Learning Preference**: {hands-on, documentation, guided tutorials, trial-and-error}

### Environment & Constraints

- **Work Environment**: {office, remote, field, mixed}
- **Primary Devices**: {desktop, laptop, mobile, tablet, specialized hardware}
- **Connectivity**: {reliable high-speed | intermittent | mobile-only | offline-required}
- **Time Constraints**: {always rushed | scheduled blocks | flexible}

## Goals & Motivations

### Primary Goals

What this persona is fundamentally trying to accomplish (not product-specific):

1. **{Goal 1}**: {description}
2. **{Goal 2}**: {description}
3. **{Goal 3}**: {description}

### Secondary Goals

Supporting or aspirational goals:

- {Secondary goal 1}
- {Secondary goal 2}

### Success Criteria

How this persona defines success:

- **Quantitative**: {metrics they track: speed, accuracy, volume}
- **Qualitative**: {feelings: confidence, control, recognition}
- **Organizational**: {career advancement, team success, stakeholder satisfaction}

## Pain Points & Frustrations

### Current Problems

Problems this persona faces in existing workflows (research-based):

1. **{Pain Point 1}**: {description, frequency, impact}
   - **Quote**: "{supporting quote from research}"
   - **Impact**: {time wasted, errors, frustration level}

2. **{Pain Point 2}**: {description}

3. **{Pain Point 3}**: {description}

### Workarounds & Hacks

How they currently cope with limitations:

- {Workaround 1}: {manual process, spreadsheet tracking, tribal knowledge}
- {Workaround 2}

### Unmet Needs

Needs not addressed by current solutions:

- {Unmet need 1}: {why current solutions fail}
- {Unmet need 2}

## Behaviors & Preferences

### Work Patterns

- **Task Frequency**: {daily | weekly | monthly | occasional}
- **Session Duration**: {quick checks | focused blocks | all-day usage}
- **Multitasking**: {single focus | context-switching | parallel workflows}
- **Collaboration Style**: {solo | paired | team-coordinated}

### Decision-Making Style

- **Information Needs**: {detailed data | high-level summary | visual dashboards}
- **Risk Tolerance**: {conservative | measured | aggressive}
- **Authority Level**: {decision-maker | recommender | executor}

### Communication Preferences

- **Feedback Style**: {immediate alerts | digest summaries | on-demand}
- **Documentation**: {inline help | external docs | video tutorials | peer support}
- **Support Channels**: {self-service | chat | email | phone}

### Tool Adoption Patterns

- **Adoption Speed**: {early adopter | pragmatist | skeptic}
- **Customization**: {uses defaults | moderate tweaking | heavy customization}
- **Integration Expectations**: {standalone OK | must integrate with existing tools}

## Accessibility & Inclusion

### Accessibility Needs

Document known or common accessibility requirements for this persona:

- **Visual**: {screen reader, magnification, high contrast, color blindness}
- **Auditory**: {captions, transcripts, visual alerts}
- **Motor**: {keyboard-only, voice control, large touch targets}
- **Cognitive**: {simple language, clear navigation, reduce distractions}

### Language & Localization

- **Primary Language**: {language}
- **Literacy Level**: {technical jargon OK | plain language required}
- **Cultural Context**: {regional norms, regulatory environment}

## Persona Scenario (Day in the Life)

### Typical Workflow

Narrative description of how this persona moves through their day and encounters problems this product might solve:

> {Morning routine...}
>
> {Key interaction moments...}
>
> {Decision points...}
>
> {End-of-day wrap-up...}

This scenario should reveal:

- When and why they need the product
- What triggers product usage
- What happens before and after product interaction
- Environmental and social context

## Requirements Implications

### Use Cases This Persona Drives

- UC-{id}: {use case title}
- UC-{id}: {use case title}

### User Stories Derived

- US-{id}: {user story title}
- US-{id}: {user story title}

### Non-Functional Requirements

- **Performance**: {response time expectations based on persona tolerance}
- **Usability**: {complexity level persona can handle}
- **Accessibility**: {WCAG level required, assistive tech support}
- **Localization**: {language, regional formats}
- **Security**: {authentication tolerance, privacy sensitivity}

### Feature Prioritization

- **Must-Have**: {features critical to this persona's primary goals}
- **Should-Have**: {features addressing secondary goals}
- **Nice-to-Have**: {features reducing friction but not blocking}

## Research Validation

### Research Sources

- UR-{id}: {research activity title, date}
- UR-{id}: {research activity title, date}

### Participant Count

- **Interviews**: {n participants matching this persona}
- **Surveys**: {n respondents}
- **Observations**: {n sessions}
- **Analytics**: {user segment size, behavior patterns}

### Confidence Level

- **High**: Validated with {n} participants across {x} research activities
- **Medium**: Based on {limited research / secondary sources / assumptions}
- **Low**: Hypothesis requiring validation

### Validation Cadence

- **Last Validated**: {YYYY-MM-DD}
- **Next Review**: {YYYY-MM-DD} (recommend quarterly or per major release)

## Anti-Patterns (What This Persona Is NOT)

Clarify misconceptions to prevent scope creep or feature bloat:

- **Not**: {common misconception about user needs}
- **Not**: {adjacent persona that might be confused with this one}
- **Not**: {extreme edge case that shouldn't drive core design}

## Related Artifacts

### User Journeys

- J-{id}: {journey map title} - {journey this persona experiences}

### Wireframes/Designs

- UI-{id}: {screen/component designed specifically for this persona}

### Tests

- TEST-{id}: {usability test plan validating persona assumptions}
- TEST-{id}: {user acceptance test scenarios based on persona workflows}

## Notes

{Additional context, edge cases, open questions, conflicting research findings}

## Revision History

| Date | Change | Author |
|------|--------|--------|
| {YYYY-MM-DD} | Initial creation | {name} |
| {YYYY-MM-DD} | Validated with {n} interviews | {name} |
| {YYYY-MM-DD} | Updated based on {research/feedback} | {name} |

---

## Persona Creation Guidance

### Evidence-Based Personas

- **Grounded in Research**: Base personas on interviews, surveys, observations, analytics - not assumptions
- **Represent Real Users**: Avoid stereotypes, marketing caricatures, or aspirational users
- **Focus on Behaviors**: Goals and pain points matter more than demographics
- **Validate Continuously**: Personas are hypotheses - update as you learn

### Number of Personas

- **Primary Personas**: 2-4 personas representing distinct user needs (design for these)
- **Secondary Personas**: Additional personas with unique needs not fully addressed by primary (accommodate where possible)
- **Anti-Personas**: 1-2 personas you explicitly choose NOT to serve (prevents scope creep)

### Persona vs. Market Segment

- **Persona**: Behavioral archetype focused on goals, workflows, pain points
- **Market Segment**: Demographic/firmographic group for marketing/sales targeting

Personas inform product design; segments inform go-to-market strategy.

### Common Pitfalls

- **Fictional demographics**: Don't invent details not supported by research
- **Too many personas**: More than 5-6 personas dilutes focus
- **One-size-fits-all**: If all personas have identical needs, you don't have real personas
- **Static personas**: Personas should evolve as you learn more about users

### Integration with Development

- Reference personas in user story definitions: "As {Persona Name}, I want..."
- Use persona names in design reviews: "Would Rachel understand this workflow?"
- Test with persona-matching participants during usability testing
- Track which personas are served by each feature in backlog
