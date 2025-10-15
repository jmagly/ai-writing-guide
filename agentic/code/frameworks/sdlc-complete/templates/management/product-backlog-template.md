# Product Backlog Template

## Metadata

- **ID**: `BACKLOG-{project}` (e.g., BACKLOG-PLATFORM)
- **Type**: Management Artifact
- **Owner**: Product Owner
- **Contributors**: Business Analyst, Requirements Analyst, Stakeholders
- **Team**: Product Management
- **Status**: Active | Frozen | Archived
- **Created**: YYYY-MM-DD
- **Last Updated**: YYYY-MM-DD
- **Last Refined**: YYYY-MM-DD
- **Related**:
  - Vision: `VISION-{id}`
  - Business Case: `BC-{id}`
  - Epics: `EP-{project}-###`
  - Sprints: `SPRINT-{project}-###`
  - Roadmap: `ROADMAP-{id}`

## Purpose

The product backlog is a prioritized, dynamic list of all features, enhancements, fixes, and technical work needed to deliver the product vision. It serves as the single source of truth for what the team will build and why.

**Key Principles**:

- **Single Source of Truth**: All work originates from the product backlog
- **Continuously Refined**: Regular grooming keeps items current and ready
- **Prioritized**: Top items are most valuable and ready for execution
- **Dynamic**: Priorities shift based on learning and business needs
- **Value-Focused**: Items explicitly link to business outcomes

## Backlog Structure

### 1. Backlog Items

Each backlog item represents a unit of value to be delivered. Items can be:

- **Epics**: Large initiatives spanning multiple sprints (2-6 months)
- **Features**: Significant capabilities delivering user value (1-4 sprints)
- **User Stories**: Small, implementable slices of functionality (1-5 days)
- **Technical Debt**: Code improvements, refactoring, architecture work
- **Bugs**: Defects requiring remediation
- **Spikes**: Time-boxed research or investigation

### 2. Item Attributes

Each backlog item must include:

- **ID**: Unique identifier (EP-{project}-###, US-{project}-###)
- **Title**: Concise description of value delivered
- **Type**: Epic, Feature, Story, Bug, Spike, Tech Debt
- **Priority**: Critical, High, Medium, Low (or numeric ranking)
- **Status**: Draft, Ready, In Progress, Done, Blocked, Rejected
- **Size Estimate**: Story points, T-shirt size, or effort estimate
- **Business Value**: Quantified or qualitative benefit
- **Owner**: Who is accountable for this item
- **Sprint**: Assigned sprint or "Backlog" if unscheduled
- **Dependencies**: Upstream/downstream items blocking or blocked by this
- **Acceptance Criteria**: Clear definition of done

### 3. Backlog Organization

**By Priority** (Primary View):

1. **Now** (Next 1-2 sprints): Fully refined, ready to pull
2. **Next** (2-4 sprints out): Partially refined, needs detail
3. **Later** (Future quarters): Placeholders, rough ideas
4. **Icebox**: Deferred indefinitely, parking lot

**By Theme** (Secondary View):

- User Experience
- Performance & Scalability
- Security & Compliance
- Technical Debt
- Business Operations
- Integration & APIs

## Prioritization Framework

### Prioritization Criteria

Rank backlog items using a consistent framework. Choose one that fits your context:

#### MoSCoW Method

- **Must Have**: Critical for this release, non-negotiable
- **Should Have**: Important but not critical, defer if needed
- **Could Have**: Desirable if time permits
- **Won't Have**: Out of scope for this release

#### WSJF (Weighted Shortest Job First)

Calculate priority score:

```text
WSJF Score = (Business Value + Time Criticality + Risk Reduction) / Job Size

Business Value: 1-10 (revenue impact, customer satisfaction)
Time Criticality: 1-10 (deadline urgency, competitive pressure)
Risk Reduction: 1-10 (technical risk, compliance risk)
Job Size: Story points or effort estimate
```

#### Value vs. Effort Matrix

Plot items on 2x2 grid:

- **Quick Wins**: High value, low effort - do first
- **Strategic**: High value, high effort - plan carefully
- **Fill-ins**: Low value, low effort - do if capacity
- **Money Pits**: Low value, high effort - avoid

### Prioritization Process

1. **Business Value Assessment**: Product Owner scores business impact
2. **Technical Assessment**: Development team estimates effort and risk
3. **Stakeholder Input**: Gather feedback from key stakeholders
4. **Scoring**: Apply chosen framework to calculate priority
5. **Ranking**: Order backlog by priority score
6. **Review**: Validate top 20 items make strategic sense
7. **Communicate**: Share prioritization rationale with team

### Re-Prioritization Triggers

Re-evaluate backlog priority when:

- Market conditions change (competitor release, regulatory shift)
- Business goals shift (new revenue target, strategic pivot)
- Technical landscape changes (platform upgrade, security vulnerability)
- Customer feedback reveals new insights
- Iteration review shows different velocity or capacity
- Critical bug or production incident occurs

## Refinement Process

### Refinement Cadence

- **Weekly Refinement Sessions**: 1-2 hours per week, entire team
- **Ad-Hoc Refinement**: As needed for urgent items
- **Quarterly Backlog Review**: Deep review of future quarters

### Refinement Activities

#### For "Now" Items (Next 1-2 Sprints)

- **Decompose**: Break epics into stories, stories into tasks
- **Detail**: Add acceptance criteria, technical notes, mockups
- **Estimate**: Team consensus on story points or effort
- **Clarify**: Answer questions, resolve ambiguities
- **Validate**: Confirm business value and priority
- **Dependencies**: Identify and resolve blockers

#### For "Next" Items (2-4 Sprints Out)

- **Rough Size**: T-shirt estimate (S, M, L, XL)
- **Context**: Why this matters, who needs it
- **Dependencies**: High-level integration points
- **Risks**: Technical or business unknowns

#### For "Later" Items (Future Quarters)

- **Placeholder**: One-liner description
- **Theme**: Which strategic theme or epic
- **Value Hypothesis**: Expected business outcome

### Definition of Ready

An item is "Ready" for sprint planning when:

- [ ] Story statement is clear (As a... I want... So that...)
- [ ] Acceptance criteria are defined and testable
- [ ] Business value is quantified or qualified
- [ ] Dependencies are identified and resolved
- [ ] Team has estimated size (story points)
- [ ] No blocking questions remain
- [ ] Product Owner has confirmed priority
- [ ] Technical approach is feasible (no major unknowns)

## Backlog Health Metrics

Track these indicators to maintain backlog quality:

### Velocity Alignment

- **Ready Items**: At least 2 sprints of "Ready" work (2x average velocity)
- **Refined Items**: At least 4 sprints of partially refined work

### Backlog Growth

- **Inflow Rate**: New items added per sprint
- **Outflow Rate**: Items completed per sprint
- **Net Growth**: Inflow - Outflow (should be near zero or negative)

### Age Distribution

- **Staleness**: Percentage of items >90 days old
- **Freshness**: Percentage of items refined in last 30 days

### Priority Distribution

- **Critical**: <10% of backlog
- **High**: 20-30% of backlog
- **Medium**: 40-50% of backlog
- **Low**: 20-30% of backlog

## Backlog Grooming Best Practices

### Do's

- **Keep it Lean**: Limit backlog to 6-12 months of work
- **Prune Regularly**: Remove or archive stale items quarterly
- **Involve the Team**: Developers estimate, testers validate criteria
- **Link to Strategy**: Every item traces to business goal or user need
- **Size Appropriately**: Stories fit in one sprint, epics span multiple
- **Update Continuously**: Backlog reflects current reality, not wishful thinking

### Don'ts

- **Over-Detail Future Work**: Don't write acceptance criteria for items >3 sprints out
- **Commit Too Early**: Don't assign items to specific sprints >2 sprints out
- **Ignore Technical Debt**: Balance feature work with sustainability
- **Let Backlog Bloat**: Don't keep every idea forever, say no
- **Skip Estimation**: Without sizing, planning is impossible
- **Lose Traceability**: Every item should link to business justification

## Integration with Iteration Planning

### Sprint Planning Input

Product backlog provides:

- **Candidate Stories**: Top-ranked, ready items
- **Priority Order**: Which stories to pull first
- **Business Context**: Why these items matter now
- **Acceptance Criteria**: Definition of done for each story

### Sprint Planning Output

Sprint planning produces:

- **Sprint Backlog**: Committed subset of product backlog
- **Sprint Goal**: Coherent objective unifying sprint work
- **Task Breakdown**: Stories decomposed into technical tasks
- **Capacity Allocation**: Team commitment based on velocity

### Post-Sprint Updates

After sprint review:

- **Mark Completed**: Move done stories to completed status
- **Update Estimates**: Refine remaining story points based on actuals
- **Re-Prioritize**: Adjust backlog based on feedback and learnings
- **Add New Items**: Incorporate new requests or bugs discovered

## Automation Guidance

**What to Automate**:

- Backlog item creation from intake forms or issue templates
- Priority scoring calculation (WSJF, value/effort)
- Staleness warnings (items >90 days without update)
- Velocity-based "Ready" backlog health checks
- Dependency tree visualization
- Traceability link validation

**What to Keep Manual**:

- Business value judgment
- Priority ranking final decisions
- Acceptance criteria definition
- Story decomposition and splitting
- Refinement discussion and consensus

## Template Customization

**For Small Teams (<5 people)**:

- Simplify to single backlog view (no Now/Next/Later)
- Use simple priority (High/Medium/Low) instead of scoring
- Refine backlog during sprint planning (no separate session)
- Limit backlog to 3 months of work

**For Large Programs (Multiple Teams)**:

- Maintain team-specific backlogs plus program backlog
- Add "Team" attribute to backlog items
- Program-level prioritization, team-level refinement
- Cross-team dependency tracking
- Portfolio-level backlog health rollup

**For Kanban/Flow-Based Teams**:

- Remove sprint assignments, focus on priority order
- Add WIP limits to "In Progress" items
- Track cycle time instead of velocity
- Use cumulative flow diagram for health metrics

## Related Templates

- `/docs/sdlc/templates/management/sprint-backlog-template.md` - Sprint-specific work commitment
- `/docs/sdlc/templates/management/epic-card.md` - Large initiative definition
- `/docs/sdlc/templates/requirements/user-story-card.md` - Individual story structure
- `/docs/sdlc/templates/management/iteration-plan-template.md` - Sprint planning
- `/docs/sdlc/templates/business-modeling/vision-document-template.md` - Product vision source

## Agent Notes

### For Requirements Analyst

- Extract backlog items from vision, business case, and stakeholder interviews
- Ensure each item has clear business value and acceptance criteria
- Validate dependencies are identified and documented
- Check that epics break down into stories, stories into tasks
- Verify traceability links to source requirements

### For Product Owner

- Prioritize ruthlessly - say "no" to low-value work
- Maintain focus on top 20 items, keep rest lightweight
- Re-prioritize weekly based on new information
- Ensure backlog aligns with product roadmap and business goals
- Be available to clarify items during refinement

### For Project Manager

- Monitor backlog health metrics (ready items, staleness, growth)
- Facilitate refinement sessions, keep discussions focused
- Track velocity to ensure adequate "Ready" pipeline
- Identify bottlenecks in refinement or dependency resolution
- Coordinate with Product Owner on capacity planning

### For Test Engineer

- Review acceptance criteria for testability
- Identify missing test scenarios or edge cases
- Flag items with unclear quality requirements
- Ensure non-functional requirements are captured
- Plan test data and environment needs early

### For Software Implementer

- Provide realistic effort estimates during refinement
- Surface technical dependencies and risks early
- Suggest story splitting when items are too large
- Ask clarifying questions before marking item "Ready"
- Update estimates based on actual effort for future accuracy

## Quality Gates

**Backlog is Healthy When**:

- [ ] At least 2 sprints of "Ready" work (meets Definition of Ready)
- [ ] Top 20 items are prioritized and justified
- [ ] No items >90 days old in top 50% of backlog
- [ ] Backlog size is <1 year of work at current velocity
- [ ] <10% of backlog is marked "Blocked"
- [ ] Every epic breaks down into stories, every story into tasks
- [ ] All critical and high-priority items have owners
- [ ] Dependencies are documented and tracked
- [ ] Backlog links to vision, roadmap, and business goals

## Version Control

**Version**: 1.0
**Last Updated**: 2025-10-15
**Owner**: Requirements Analyst + Product Designer
**Change History**:

- 2025-10-15: Initial template created (v1.0)
