# Platform Research - Next Steps Checklist

**Date**: February 6, 2026
**Status**: Awaiting external research and validation

---

## What Was Completed ✅

- [x] Analyzed all 8 platform provider implementations
- [x] Documented internal AIWG knowledge from codebase
- [x] Identified 29+ Claude Code features (v2.0.43 → v2.1.33)
- [x] Mapped deployment paths for all platforms
- [x] Created comprehensive research report
- [x] Documented platform tier strategy
- [x] Created universal deployment recommendations

## Documents Created

1. **Full Research Report**: `.aiwg/working/platform-features-research-2026-02.md` (10,000+ words)
2. **Executive Summary**: `.aiwg/working/platform-features-summary.md`
3. **Recommendations**: `.aiwg/working/universal-deployment-recommendations.md`
4. **This Checklist**: `.aiwg/working/platform-research-next-steps.md`

---

## Critical Gaps Identified ⚠️

### Cannot Be Completed Without Web Access

**This research was limited to AIWG internal documentation only.** The following require direct access to external platform documentation:

#### 1. Claude Code
- [ ] Verify current version beyond v2.1.33
- [ ] Check for new features since Feb 2026
- [ ] Confirm agent teams stability status
- [ ] Verify plugin marketplace URL and registration

#### 2. OpenAI Codex CLI
- [ ] Verify latest version (February 2026)
- [ ] **CRITICAL**: Check for `.agents/skills/` project-level support
- [ ] **CRITICAL**: Investigate `codex cloud` tasks feature
- [ ] Research automation/scheduled tasks support
- [ ] Verify memory/context features
- [ ] Check multi-agent support capabilities
- [ ] Confirm SKILL.md format requirements

#### 3. GitHub Copilot
- [ ] Latest agent support (custom instructions vs agents)
- [ ] Check for new extensibility features
- [ ] Verify skills/rules support
- [ ] Investigate multi-agent capabilities
- [ ] Check for context window improvements

#### 4. Factory AI
- [ ] Latest version and droid system features
- [ ] Check for automation capabilities
- [ ] Verify command support improvements
- [ ] Confirm skill format requirements

#### 5. Cursor IDE
- [ ] Latest version and features
- [ ] MDC format enhancements
- [ ] Agent support beyond @-mentions
- [ ] Command system improvements

#### 6. OpenCode
- [ ] **CRITICAL**: Current feature set (platform less documented)
- [ ] Agent/command system enhancements
- [ ] Extensibility features
- [ ] User base and activity level

#### 7. Warp Terminal
- [ ] AI features documentation
- [ ] Verify discrete file support for agents/commands
- [ ] Context window limits (precise measurements)
- [ ] New terminal AI capabilities

#### 8. Windsurf (Codeium)
- [ ] **CRITICAL**: Current version and feature set (Feb 2026)
- [ ] Official agent/workflow support status
- [ ] Extensibility features
- [ ] Validate experimental status
- [ ] User base and adoption rate

---

## Immediate Actions (Can Do Without Web Access)

### 1. Test Windsurf Deployment
- [ ] Deploy to test project
- [ ] Validate AGENTS.md format
- [ ] Test workflow system
- [ ] Verify `.windsurfrules` effectiveness
- [ ] Document any issues found
- [ ] Gather user feedback

### 2. Update Claude Code Agents (Leverage New Features)

**Agent Frontmatter Updates**:
- [ ] Add `memory: project` to SDLC agents (Architecture Designer, Requirements Analyst, Domain Expert)
- [ ] Add `memory: user` to cross-project agents (Security Auditor, Technical Writer)
- [ ] Add `Task(agent_type)` restrictions to all agents:
  - Analyst agents: `Task(Explore)` only
  - Implementation agents: `Task(Explore)`, `Task(Bash)`
  - Orchestrator agents: Full `Task` access
- [ ] Add `skills:` frontmatter where applicable
- [ ] Update `permissionMode:` for permission tiers

**Example agent update**:
```yaml
---
name: "Architecture Designer"
model: "opus"  # Use Opus 4.6
memory: project  # NEW: Accumulate project knowledge
tools:
  allow:
    - Read
    - Write
    - Grep
    - Glob
    - Task(Explore)  # NEW: Restricted subagents
  deny:
    - Bash
    - Task(Bash)  # NEW: Can't spawn Bash subagents
permissionMode: write-artifacts  # NEW: Permission tier
skills:  # NEW: Auto-load skills
  - architecture-patterns
  - adr-template
---
```

### 3. Create Claude Code Hooks

Create `.claude/hooks/` directory with:

**Trace Collection** (`aiwg-trace.js`):
- [ ] SubagentStart handler
- [ ] SubagentStop handler
- [ ] JSON Lines format output
- [ ] Integration with Ralph loop state

**Permission Auto-Approval** (`aiwg-permissions.js`):
- [ ] Auto-approve `.aiwg/` directory writes
- [ ] Auto-approve template file reads
- [ ] Auto-approve git operations on AIWG branches

**Context Injection** (`aiwg-context-inject.js`):
- [ ] PreToolUse hook for Write tool on `.aiwg/` paths
- [ ] Inject AIWG conventions (templates, naming, @-mentions)
- [ ] PreToolUse hook for Bash tool (inject security rules)

**Session Naming** (`aiwg-session-naming.js`):
- [ ] Auto-name sessions on flow start: `aiwg-{phase}-{date}`
- [ ] Enable easy resume with `/resume aiwg-*`

### 4. Test Suite Expansion

Create new tests:

- [ ] **Content Validation Tests**: Verify transformation correctness per platform
- [ ] **Feature Support Tests**: Test features work on each platform
- [ ] **Integration Tests**: End-to-end deployment validation
- [ ] **Hook Tests**: Validate Claude Code hook functionality

### 5. Documentation Updates (Based on Current Knowledge)

- [ ] Create platform comparison guide (draft based on internal knowledge)
- [ ] Update troubleshooting guide with platform matrix
- [ ] Document Claude Code new features in agent design bible
- [ ] Create migration guide between platforms
- [ ] Update quickstart guides with tier information

---

## Phase 1: External Research Required (Assign to AI with Web Access)

**Estimated Time**: 4-8 hours
**Deliverables**: External research findings document

### Research Checklist

Use this checklist when conducting external research:

#### For Each Platform:

1. **Find latest documentation**:
   - [ ] Official website/docs
   - [ ] Changelog/release notes
   - [ ] GitHub repository (if applicable)
   - [ ] Community forums/Discord

2. **Document current version**:
   - [ ] Version number
   - [ ] Release date
   - [ ] Breaking changes since late 2025

3. **Identify artifact types supported**:
   - [ ] Agents (format, location)
   - [ ] Commands (format, location)
   - [ ] Skills (format, location)
   - [ ] Rules (format, location)
   - [ ] Hooks (support? format?)
   - [ ] MCP servers (support?)

4. **Document new features** (since late 2025):
   - [ ] Feature name and description
   - [ ] Release version
   - [ ] AIWG relevance (high/medium/low)
   - [ ] Implementation complexity

5. **Platform-specific questions**:
   - See "Critical Gaps Identified" above for per-platform questions

6. **Save findings**:
   - Create `.aiwg/working/platform-NAME-external-research.md` for each
   - Update main research report with findings

### Research Template

Use this template for each platform:

```markdown
# [Platform Name] External Research

**Date**: [Date]
**Current Version**: [Version from docs]
**Last Release**: [Date from docs]

## Official Documentation URLs
- Main docs: [URL]
- Changelog: [URL]
- API/SDK: [URL]

## Artifact Support

| Type | Supported | Location | Format | Notes |
|------|-----------|----------|--------|-------|
| Agents | Yes/No | [path] | [format] | [notes] |
| Commands | Yes/No | [path] | [format] | [notes] |
| Skills | Yes/No | [path] | [format] | [notes] |
| Rules | Yes/No | [path] | [format] | [notes] |
| Hooks | Yes/No | [path] | [format] | [notes] |

## New Features Since Late 2025

1. **[Feature Name]** (v[version], [date])
   - **Description**: [what it does]
   - **AIWG Relevance**: High/Medium/Low
   - **Implementation**: [how to leverage]

## Platform-Specific Findings

[Answer platform-specific questions from checklist]

## AIWG Recommendations

- [ ] Update provider implementation if needed
- [ ] Document new features in quickstart
- [ ] Create optimization guide if high-value features found
```

---

## Phase 2: Optimization Implementation (After External Research)

**Estimated Time**: 1-2 weeks
**Prerequisites**: Phase 1 complete

### Based on Research Findings:

- [ ] Update provider implementations if new features found
- [ ] Create platform-specific optimization guides
- [ ] Update agent definitions with platform-appropriate features
- [ ] Implement new deployment paths if discovered
- [ ] Create feature-specific examples

---

## Phase 3: Documentation & Testing (After Phase 2)

**Estimated Time**: 1-2 weeks

### Documentation:

- [ ] Finalize platform comparison guide with external findings
- [ ] Complete troubleshooting matrix
- [ ] Update all quickstart guides
- [ ] Create migration guides
- [ ] Document platform tier rationale

### Testing:

- [ ] Comprehensive deployment testing (all 8 platforms)
- [ ] Feature validation testing (verify features work)
- [ ] User acceptance testing
- [ ] Gather and document feedback

---

## Success Criteria

### Research Phase Complete When:
- [ ] All 8 platforms have external research documents
- [ ] All critical gaps answered
- [ ] Main research report updated with findings
- [ ] Recommendations updated based on findings

### Optimization Phase Complete When:
- [ ] Claude Code agents updated with new frontmatter
- [ ] Hooks created and tested
- [ ] Provider implementations optimized per platform
- [ ] New features documented

### Documentation Phase Complete When:
- [ ] Platform comparison guide published
- [ ] All quickstarts updated
- [ ] Troubleshooting matrix complete
- [ ] User feedback incorporated

---

## Quick Win Opportunities

These can be done immediately without external research:

1. **✅ Test Windsurf deployment** with volunteer users (this week)
2. **✅ Update Claude Code agents** with memory and Task restrictions (this week)
3. **✅ Create hooks** for trace collection, permissions, context (next week)
4. **✅ Expand test suite** with content validation tests (next week)
5. **✅ Draft platform comparison** based on current knowledge (next week)

---

## Resource Allocation

### If Team Has Web Access:
- **1 person**: Conduct external research (Phase 1) - 4-8 hours
- **1 person**: Implement optimizations (Phase 2) - 1-2 weeks
- **1 person**: Documentation & testing (Phase 3) - 1-2 weeks

### If Using AI Assistant with Web Access:
- **AI**: Conduct external research using template above
- **Team**: Review findings, implement optimizations
- **Team**: Testing and documentation

### If No Web Access Available:
- **Focus on quick wins** (Windsurf testing, Claude optimizations, hooks)
- **Document assumptions** clearly
- **Mark areas requiring verification**
- **Proceed with caution on external-dependent features**

---

## Final Deliverables

At completion of all phases:

1. ✅ Platform Features Research Report (internal + external findings)
2. ✅ Platform Comparison Guide (user-facing)
3. ✅ Universal Deployment Strategy Document
4. ✅ Updated Quickstart Guides (all 8 platforms)
5. ✅ Troubleshooting Matrix
6. ✅ Migration Guides
7. ✅ Updated Agent Definitions (Claude Code optimized)
8. ✅ Hook Templates (Claude Code)
9. ✅ Comprehensive Test Suite
10. ✅ User Feedback Summary

---

**Next Immediate Action**: Assign external research to team member or AI with web access using research template above.
