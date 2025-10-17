# Use-Case Brief

## Metadata

- ID: UC-005
- Owner: Requirements Analyst
- Contributors: System Analyst, Framework Maintainer, Product Strategist
- Reviewers: Requirements Reviewer
- Team: Framework Development (Meta-Application)
- Stakeholders: Framework Maintainer (Joseph Magly), Future Contributors, Community
- Status: approved
- Dates: created 2025-10-17 / updated 2025-10-17 / due N/A
- Related: REQ-SDLC-007 (Self-Application), REQ-SDLC-008 (Meta-Validation)
- Links: /agentic/code/frameworks/sdlc-complete/artifacts/ai-writing-guide/

## Related templates

- agentic/code/frameworks/sdlc-complete/templates/project-planning/iteration-plan-template.md
- agentic/code/frameworks/sdlc-complete/templates/quality/retrospective-template.md

## Identifier

- ID: UC-005
- Name: Framework Maintains Self-Improvement Using Own SDLC Tools

## Summary

The framework author/contributors use the AI Writing Guide's own SDLC framework to manage its development, validating practicality through dogfooding. The flow-iteration-dual-track command orchestrates Discovery (research, prototypes) and Delivery (features, tests) tracks, generating requirements, architecture, test plans, and retrospectives for framework improvements, demonstrating meta-validation (if framework cannot improve itself, the framework needs refinement).

## Actors & Preconditions

- Primary actor(s): Framework maintainer, regular contributor, community contributor
- Preconditions:
  - AI Writing Guide codebase cloned locally
  - SDLC agents deployed to framework repository (self-application)
  - Framework in Construction phase (active feature development)
  - Iteration backlog exists (planned features, bugs, enhancements in `.aiwg/planning/iteration-backlog.md`)

## Main Success Scenario

1. Maintainer identifies next iteration scope: "Iteration 5: Add multi-platform support for Cursor"
2. Maintainer triggers iteration workflow: `/project:flow-iteration-dual-track 5 --guidance "Focus on Cursor compatibility, target 80% agent format parity with Claude Code"`
3. Orchestrator initializes iteration workspace: `.aiwg/planning/iteration-5/`
4. Discovery Track (runs first, 30-40% of iteration time):
   - Research Coordinator investigates Cursor agent format differences
   - Prototype Engineer creates proof-of-concept agent deployment for Cursor
   - Risk Analyst identifies compatibility risks (API differences, feature gaps)
   - Discovery artifacts saved: `.aiwg/planning/iteration-5/discovery/research-findings.md`, `poc-cursor-agent-deploy.md`, `risk-register.md`
5. Delivery Track (runs second, 60-70% of iteration time):
   - Requirements Analyst generates user stories: "As Cursor user, I want to deploy AIWG agents to .cursor/agents/"
   - Code Reviewer validates compatibility with existing deploy-agents.mjs script
   - Test Engineer creates test plan: Unit tests for Cursor deployment, integration tests for agent format conversion
   - Delivery artifacts saved: `.aiwg/requirements/user-stories/US-CURSOR-001.md`, `.aiwg/testing/iteration-5-test-plan.md`
6. Implementation (guided by generated artifacts):
   - Maintainer implements features following user stories and architecture decisions
   - Maintainer runs tests per test plan
   - Maintainer validates deployment per acceptance criteria
7. Retrospective (end of iteration):
   - Retrospective Facilitator orchestrates retrospective: `/project:flow-retrospective-cycle iteration 5`
   - Team (maintainer + contributors if available) reviews: What went well, what to improve, action items
   - Retrospective saved: `.aiwg/quality/retrospectives/iteration-5-retro.md`
8. Archive iteration artifacts: `.aiwg/planning/iteration-5/` → Git commit with traceability links

## Postconditions

- Iteration 5 artifacts generated (requirements, architecture, test plans, retrospective)
- Discovery track validates technical feasibility before Delivery track commits resources
- Delivery track provides structured guidance (user stories, acceptance criteria, test plans)
- Retrospective captures learnings for continuous improvement
- Framework successfully uses own tools to manage development (meta-validation successful)

## Success Criteria (Quantifiable)

- 100% of planned features have SDLC artifacts (requirements, architecture, tests)
- Iteration artifacts improve development velocity (measured via maintainer survey: "Artifacts saved time: Strongly Disagree → Strongly Agree")
- Discovery track reduces rework (measured via defect rate: target <10% rework due to missed technical risks)
- Delivery track improves test coverage (measured via test plan completeness: target 80%+ coverage of acceptance criteria)
- Retrospective generates actionable improvements (measured via action items implemented in next iteration: target 60%+ completion rate)

## Priority

**MEDIUM** - Important for validating framework practicality, not user-facing (users don't see framework's own development process)

## Effort Estimate

**Maintainer Effort** (per iteration):
- Trigger workflow: <1 minute (single command)
- Review Discovery artifacts: 30-60 minutes (research findings, PoCs, risks)
- Review Delivery artifacts: 30-60 minutes (user stories, test plans)
- Implementation (guided by artifacts): 4-8 hours (varies by feature complexity)
- Retrospective participation: 30 minutes (review, feedback, action items)
- **Total**: 6-10 hours per iteration (vs 8-12 hours without structured artifacts, 20-30% time savings)

**Orchestrator Processing**:
- Discovery track: 10-15 minutes (research, PoCs, risks)
- Delivery track: 10-15 minutes (user stories, test plans)
- Retrospective: 5-10 minutes (generate retrospective template, capture feedback)
- **Total**: 25-40 minutes end-to-end

**Learning Curve**: 1-2 iterations to internalize dual-track pattern, 3-5 iterations to optimize iteration scoping

## Notes

**Open Questions**:
- Should Discovery track always run first, or support parallel Discovery + Delivery for mature features?
- How to measure ROI of self-application objectively (time saved, defect reduction, velocity improvement)?
- Should framework artifacts be public (demonstrate dogfooding) or private (avoid overwhelming repository with meta-artifacts)?

**Risks**:
- Over-engineering: Framework spends more time on SDLC artifacts than implementation (mitigation: measure velocity, adjust artifact depth)
- Meta-complexity: Self-application creates confusing loops (framework agents managing framework agents) (mitigation: clear separation of meta vs user-facing artifacts)
- Community confusion: Public meta-artifacts overwhelm new users exploring repository (mitigation: store framework development artifacts in separate directory `.aiwg/meta/`)

**Dependencies**:
- SDLC agents deployed to framework repository (self-application configured)
- Iteration backlog maintained (features, bugs, enhancements prioritized)
- Retrospective discipline (maintainer commits to end-of-iteration retrospectives)

**Future Enhancements**:
- Automated velocity tracking (compare iteration time before/after SDLC artifact adoption)
- Discovery/Delivery track templates (customize for different feature types: new agent, new command, bug fix)
- Public case study (publish framework self-application artifacts as example for enterprise teams)
- Contributor onboarding via self-application artifacts (new contributors read framework's own requirements/architecture to understand codebase)

**Self-Validation Milestones** (from Vision Document Section 6.4):
- 3 months: 50% of new features have SDLC artifacts
- 6 months: 75% of new features have SDLC artifacts
- 9 months: 100% of new features have SDLC artifacts (full self-application)
