# Use-Case Brief

## Metadata

- ID: UC-004
- Owner: Requirements Analyst
- Contributors: System Analyst, Documentation Synthesizer, Architecture Designer
- Reviewers: Requirements Reviewer
- Team: SDLC Framework - Multi-Agent Orchestration
- Stakeholders: Enterprise Teams, Small Teams, Agentic Developers (complex projects)
- Status: approved
- Dates: created 2025-10-17 / updated 2025-10-17 / due N/A
- Related: REQ-SDLC-005 (Multi-Agent Coordination), REQ-SDLC-006 (Artifact Review Cycles)
- Links: /agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md

## Related templates

- agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md
- agentic/code/frameworks/sdlc-complete/templates/analysis-design/architecture-decision-record-template.md

## Identifier

- ID: UC-004
- Name: Coordinate Multi-Agent Workflows for Comprehensive Artifact Generation

## Summary

Enterprise teams managing complex projects require comprehensive artifact generation with multi-stakeholder review cycles. Claude Code orchestrates workflows following the Primary Author → Parallel Reviewers → Synthesizer → Archive pattern, producing artifacts (SAD, ADRs, test plans) with 3+ reviewer sign-offs and full audit trails, ensuring compliance-ready documentation without manual coordination overhead.

## Actors & Preconditions

- Primary actor(s): Enterprise team lead, technical lead, project manager, compliance officer
- Preconditions:
  - Project in Inception or Elaboration phase (requires architecture baseline)
  - SDLC agents deployed (aiwg -deploy-agents --mode sdlc)
  - Requirements artifacts exist (user stories, use cases, NFRs in `.aiwg/requirements/`)
  - Claude Code configured as Core Orchestrator (CLAUDE.md with orchestration prompts)

## Main Success Scenario

1. User requests comprehensive artifact generation: "Create architecture baseline"
2. Claude Code (Core Orchestrator) interprets natural language → maps to flow-inception-to-elaboration workflow
3. Orchestrator initializes workspaces: `.aiwg/working/architecture/sad/drafts/`, `.aiwg/working/architecture/sad/reviews/`
4. Step 1 - Primary Author: Orchestrator launches Architecture Designer agent via Task tool
   - Agent reads requirements from `.aiwg/requirements/`
   - Agent reads SAD template from AIWG installation path
   - Agent generates v0.1 draft: `.aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md`
   - Orchestrator confirms: "SAD v0.1 draft complete (3,245 words)"
5. Step 2 - Parallel Reviewers: Orchestrator launches 4 agents simultaneously (single message, 4 Task calls)
   - Security Architect: Validates security patterns, data classification, threat surface
   - Test Architect: Validates testability, component boundaries, integration points
   - Requirements Analyst: Validates traceability to requirements, completeness
   - Technical Writer: Validates clarity, consistency, readability
   - Each reviewer saves feedback: `.aiwg/working/architecture/sad/reviews/{role}-review.md`
6. Orchestrator monitors completion: "4/4 reviews complete (3 APPROVED, 1 CONDITIONAL)"
7. Step 3 - Synthesizer: Orchestrator launches Documentation Synthesizer agent
   - Agent reads v0.1 draft + 4 reviews
   - Agent merges feedback, resolves conflicts, incorporates suggestions
   - Agent generates final SAD: `.aiwg/architecture/software-architecture-doc.md` (BASELINED)
8. Step 4 - Archive: Orchestrator moves working artifacts to archive, updates traceability matrix
9. Orchestrator reports success: "SAD BASELINED: `.aiwg/architecture/software-architecture-doc.md` (4 reviewer sign-offs, 3,487 words, 100% requirements coverage)"
10. User reviews final artifact, confirms completeness, proceeds to next workflow

## Postconditions

- Software Architecture Document (SAD) generated with 3+ reviewer sign-offs
- Full audit trail preserved in `.aiwg/working/architecture/sad/reviews/` (4 review documents)
- Requirements traceability validated (100% coverage confirmed by Requirements Analyst)
- Security, testability, clarity validated by specialized reviewers
- BASELINED artifact stored in `.aiwg/architecture/` (Git-trackable, compliance-ready)

## Success Criteria (Quantifiable)

- SAD generated with 3+ reviewer sign-offs (target: 4 parallel reviews)
- 100% requirements traceability coverage (all user stories/NFRs mapped to architecture components)
- Multi-agent workflow completes in 15-20 minutes (vs 2-4 hours manual coordination)
- Zero manual coordination overhead (orchestrator handles task launches, monitors completion, synthesizes results)
- Full audit trail preserved (primary draft + 4 reviews + final synthesis = 6 documents)
- User-reported confidence in artifact quality: 4+ on 5-point scale (comprehensive review increases trust)

## Priority

**HIGH** - Critical for Enterprise Teams requiring compliance/audit trails, differentiates AIWG from fragmented templates

## Effort Estimate

**User Effort**:
- Trigger workflow: <1 minute (natural language request)
- Review final artifact: 15-30 minutes (validate completeness)
- **Total**: <35 minutes (vs 4-8 hours manual coordination + drafting)

**Orchestrator Processing**:
- Primary Author (Architecture Designer): 5-8 minutes (SAD draft generation)
- Parallel Reviewers (4 agents): 8-12 minutes (simultaneous execution, 2-3 minutes each)
- Synthesizer (Documentation Synthesizer): 3-5 minutes (merge reviews, generate final)
- **Total**: 15-20 minutes end-to-end

**Learning Curve**: 0 minutes for orchestrated workflows (natural language triggers), 30-60 minutes to understand multi-agent pattern for custom workflows

## Notes

**Open Questions**:
- Should orchestrator support custom reviewer panels (user selects 2-6 reviewers vs default 4)?
- How to handle reviewer disagreements (2 APPROVED, 2 REJECTED) - require synthesizer consensus logic?
- Should orchestrator generate diff reports (compare v0.1 draft vs final BASELINED version)?

**Risks**:
- Reviewer conflict: Security Architect and Requirements Analyst provide contradictory feedback (mitigation: synthesizer resolves conflicts, flags unresolvable issues for user decision)
- Parallel execution failure: 1 of 4 reviewers times out or errors (mitigation: orchestrator retries failed agents, continues with 3/4 reviews if acceptable)
- Context window exhaustion: Large SAD (10,000+ words) exceeds reviewer context limits (mitigation: chunked review for large documents)

**Dependencies**:
- Claude Code as Core Orchestrator (CLAUDE.md orchestration prompts configured)
- Task tool available for multi-agent launches
- AIWG templates accessible (architecture, requirements, testing templates)
- Workspace directories writable (`.aiwg/working/`, `.aiwg/architecture/`)

**Future Enhancements**:
- Configurable reviewer panels (user selects roles: security-architect, performance-engineer, etc.)
- Consensus voting (require 3/4 APPROVED to BASELINE, otherwise iterate)
- Diff reporting (automated comparison of draft vs final, highlights synthesizer changes)
- Parallel artifact generation (orchestrate SAD + ADRs + Test Plan simultaneously)
- Workflow templates (save custom multi-agent workflows for reuse)
