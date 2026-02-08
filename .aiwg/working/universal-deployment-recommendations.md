# Universal Deployment Strategy Recommendations

**Date**: February 6, 2026
**Purpose**: Strategic recommendations for AIWG multi-platform deployment based on research findings

---

## Core Strategy: Platform Tiering

### Tier 1: Full Feature Platform (Claude Code)

**Status**: Primary development and testing platform
**Feature Support**: 100% (all AIWG capabilities)
**Optimization Level**: Maximum

**Rationale**:
- 29+ documented features (v2.0.43 → v2.1.33)
- Native support for agents, commands, skills, rules, hooks, MCP
- Plugin marketplace for distribution
- Agent teams, memory, task management

**AIWG Actions**:
1. ✅ Continue using as primary platform
2. ⏳ Leverage new features (memory, Task restrictions, agent teams when stable)
3. ⏳ Create hooks for trace collection, permissions, context injection
4. ⏳ Update plugin marketplace listings

### Tier 2: Production-Ready Platforms

**Platforms**: Codex, Copilot, Factory, Cursor
**Status**: Fully supported, production-ready
**Feature Support**: 70-85%
**Optimization Level**: High

**Rationale**:
- Working deployment paths (validated v2026.1.4-v2026.1.7)
- Active user base
- Platform-specific optimizations implemented
- Good documentation

**AIWG Actions**:
1. ✅ Maintain current deployment support
2. ⏳ Verify platform-specific features via external research
3. ⏳ Optimize for each platform's strengths
4. ⏳ Create platform-specific quickstart updates

### Tier 3: Supported but Limited Platforms

**Platforms**: OpenCode, Warp
**Status**: Working but limited capabilities
**Feature Support**: 50-60%
**Optimization Level**: Medium

**Rationale**:
- OpenCode: Less documented, smaller user base
- Warp: File size limits, embedding-based (not discrete files)
- Both work but not optimal for complex workflows

**AIWG Actions**:
1. ✅ Maintain basic deployment support
2. ⏳ Document limitations clearly
3. ⏳ Guide users to Tier 1/2 platforms for advanced features
4. ⏳ Monitor for platform improvements

### Tier 4: Experimental Platforms

**Platforms**: Windsurf
**Status**: Experimental, untested
**Feature Support**: Unknown (40-60% estimated)
**Optimization Level**: Low

**Rationale**:
- Marked experimental in codebase
- Untested with real users
- Unknown current Windsurf/Codeium features
- Provider implementation exists but needs validation

**AIWG Actions**:
1. ⏳ Test with volunteer users
2. ⏳ Research Windsurf/Codeium current features
3. ⏳ Validate or update experimental status
4. ⏳ Document limitations if found

---

## Universal Deployment Principles

### 1. Common Deployment Interface

**Current State**: ✅ Implemented
- Single command deploys to all platforms: `aiwg use sdlc --provider <name>`
- Dynamic addon discovery works across all 8 providers
- Consistent deployment paths validated

**Recommendations**:
- ✅ Maintain current interface (no changes needed)
- ⏳ Add platform capability detection
- ⏳ Warn users if deploying advanced features to limited platforms

### 2. Platform-Appropriate Transformations

**Current State**: ✅ Implemented
- Model mapping (Claude → GPT, etc.)
- Format transformation (YAML → MDC, plain markdown, etc.)
- Path handling (project vs home directory)

**Recommendations**:
- ✅ Continue platform-specific transformations
- ⏳ Optimize transformations based on external research findings
- ⏳ Add feature degradation warnings

### 3. Artifact Type Prioritization

**Strategy**: Deploy different artifact types based on platform capabilities

#### Agents
- **Full Support**: Claude, Codex, Copilot, Factory, OpenCode, Cursor, Warp, Windsurf
- **Recommendation**: Deploy everywhere (current behavior ✅)

#### Commands
- **Full Support**: Claude
- **Via Scripts**: Codex (home dir), Copilot
- **Via Rules**: Cursor
- **Via Workflows**: Windsurf
- **Embedded**: Warp
- **Aggregated**: Factory, OpenCode
- **Recommendation**: Continue current deployment, validate Windsurf workflows

#### Skills
- **Full Support**: Claude
- **Via Home Dir**: Codex (needs external verification for `.agents/skills/`)
- **Via Scripts**: Copilot
- **Via Rules**: Cursor
- **Embedded**: Warp
- **Aggregated**: Factory, OpenCode
- **Unknown**: Windsurf
- **Recommendation**: Research Codex `.agents/skills/` support, test Windsurf

#### Rules
- **Full Support**: Claude, Cursor (MDC)
- **Via .windsurfrules**: Windsurf
- **Not Supported**: Others
- **Recommendation**: Document clearly which platforms support rules

#### Hooks
- **Full Support**: Claude only
- **Not Supported**: All others
- **Recommendation**: Document as Claude-only feature

#### MCP Servers
- **Full Support**: Claude
- **Optional**: Cursor
- **Unknown**: Others
- **Recommendation**: Research MCP support in other platforms

---

## Platform-Specific Optimization Strategies

### Claude Code

**Current Optimization**: Medium
**Target Optimization**: High

**Actions**:
1. ⏳ Update all agent definitions:
   - Add `memory: project` or `memory: user`
   - Add `Task(agent_type)` restrictions for security
   - Add `skills:` frontmatter for auto-loading
   - Update `permissionMode:` for permission tiers

2. ⏳ Leverage plugin marketplace:
   - Verify AIWG registration
   - Pin stable releases to git SHAs
   - Test auto-update behavior

3. ⏳ Create hooks:
   - Trace collection (SubagentStart/Stop)
   - Permission auto-approval (PermissionRequest)
   - Context injection (PreToolUse additionalContext)
   - Session naming (auto-name on flow start)

4. ⏳ Adopt new features:
   - Auto-memory with AIWG pattern seeding
   - Task management for flow tracking
   - Async agents for parallel workflows
   - Evaluate agent teams when stable (currently experimental)

5. ⏳ Optimize for new capabilities:
   - Use Opus 4.6 for orchestration agents
   - Large outputs to disk for Ralph loops
   - PDF page ranges for research corpus
   - Session-PR linking for code review flows

### Codex

**Current Optimization**: Medium
**Target Optimization**: High

**Actions**:
1. ⏳ **CRITICAL**: Research external Codex documentation:
   - Verify `.agents/skills/` project-level support (mentioned in task)
   - Check for `codex cloud` tasks feature
   - Investigate automation/scheduled tasks
   - Verify memory/context features
   - Check multi-agent support

2. ✅ Home directory deployment working (v2026.1.4)

3. ⏳ If `.agents/skills/` confirmed:
   - Add project-level skill deployment
   - Update provider to support both home and project skills
   - Document hybrid deployment

4. ⏳ If `codex cloud` confirmed:
   - Investigate integration with Ralph loops
   - Document cloud task patterns

### Copilot

**Current Optimization**: Low-Medium
**Target Optimization**: Medium-High

**Actions**:
1. ⏳ Research GitHub Copilot latest features:
   - Verify agent support (custom instructions vs agents)
   - Check for new extensibility APIs
   - Investigate skill/rule support
   - Check multi-agent capabilities

2. ⏳ Update deployment if new features found:
   - Optimize for native Copilot features
   - Document Copilot-specific patterns
   - Create Copilot quickstart update

### Factory AI

**Current Optimization**: Medium
**Target Optimization**: Medium

**Actions**:
1. ✅ Droid system working
2. ⏳ Document manual import requirement more prominently in quickstart
3. ⏳ Research Factory AI latest features:
   - Check for automation capabilities
   - Verify command support improvements
   - Investigate skill format enhancements

### Cursor

**Current Optimization**: Medium
**Target Optimization**: High

**Actions**:
1. ✅ Rules deployment fixed (v2026.1.4)
2. ⏳ Research Cursor latest features:
   - Verify MDC format enhancements
   - Check for agent support beyond @-mentions
   - Investigate command system improvements
3. ⏳ Optimize `.cursor/rules/` deployment:
   - Test MDC metadata features
   - Document @-mention patterns
   - Create intelligent regeneration patterns

### OpenCode

**Current Optimization**: Low
**Target Optimization**: Medium

**Actions**:
1. ⏳ **CRITICAL**: Research OpenCode platform:
   - Current version and feature set
   - Agent/command system capabilities
   - Extensibility features
   - User base and activity

2. ⏳ Update documentation based on findings

### Warp Terminal

**Current Optimization**: Medium
**Target Optimization**: Medium

**Actions**:
1. ✅ WARP.md working (symlinked to CLAUDE.md)
2. ⏳ Document file size limits precisely:
   - Test actual limits
   - Provide size reduction strategies
   - Guide to Tier 1/2 platforms for large deployments
3. ⏳ Research Warp AI features:
   - Check for discrete file support
   - Verify context window limits
   - Investigate new terminal AI capabilities

### Windsurf

**Current Optimization**: Experimental (None)
**Target Optimization**: Low-Medium

**Actions**:
1. ⏳ **CRITICAL**: Research Windsurf/Codeium:
   - Current version (Feb 2026)
   - Official agent/workflow support status
   - Extensibility features
   - User base and adoption

2. ⏳ Test with volunteer users:
   - Validate AGENTS.md format
   - Test workflow system
   - Verify `.windsurfrules` effectiveness
   - Document issues found

3. ⏳ Update experimental status:
   - If successful: Promote to Tier 2 or 3
   - If issues: Document limitations
   - If no adoption: Consider deprecating

---

## Deployment Validation Strategy

### Pre-Deployment Validation

For each platform, verify:

1. ✅ **Paths**: Correct directories created
2. ✅ **Format**: Proper file format for platform
3. ✅ **Model Mapping**: Correct model names
4. ⏳ **Feature Degradation**: Warn if advanced features unsupported
5. ⏳ **Version Compatibility**: Check platform version if detectable

### Post-Deployment Validation

Test suite requirements:

1. ✅ **File Locations**: `provider-file-locations.test.ts` (implemented)
2. ⏳ **Content Validation**: Verify transformation correctness
3. ⏳ **Feature Support**: Test features actually work on each platform
4. ⏳ **Integration Tests**: End-to-end deployment validation

### User Validation

1. ⏳ Gather user feedback per platform
2. ⏳ Document common issues
3. ⏳ Update troubleshooting guide
4. ⏳ Create platform comparison guide

---

## Documentation Strategy

### Create Platform Comparison Guide

**Structure**:
```markdown
# Platform Comparison

## Quick Selector

| If you want... | Use... |
|----------------|--------|
| Full AIWG features | Claude Code |
| GitHub integration | Copilot |
| IDE integration | Cursor |
| Terminal workflows | Warp |
| Custom droids | Factory |
| Home directory commands | Codex |

## Feature Matrix
[Full comparison table]

## Migration Guide
[How to switch between platforms]
```

### Update Quickstart Guides

For each platform:
1. ⏳ Document latest features discovered
2. ⏳ Add platform-specific optimizations
3. ⏳ Include troubleshooting section
4. ⏳ Link to platform comparison guide

### Create Troubleshooting Matrix

**Structure**:
```markdown
| Issue | Claude | Codex | Copilot | Factory | Cursor | OpenCode | Warp | Windsurf |
|-------|--------|-------|---------|---------|--------|----------|------|----------|
| Agents not loading | [Solution] | [Solution] | ... | ... | ... | ... | ... | ... |
| Commands not working | [Solution] | [Solution] | ... | ... | ... | ... | ... | ... |
```

---

## Phased Rollout Plan

### Phase 1: Research & Validation (Immediate)

**Duration**: 1-2 weeks

**Actions**:
1. ⏳ Access external documentation for all platforms
2. ⏳ Verify features mentioned in task (Codex, Windsurf)
3. ⏳ Test Windsurf with volunteer users
4. ⏳ Document findings

**Deliverables**:
- Updated research report with external findings
- Windsurf validation report
- Feature gaps identified

### Phase 2: Optimization (Short-term)

**Duration**: 2-4 weeks

**Actions**:
1. ⏳ Implement Claude Code optimizations (memory, hooks, Task restrictions)
2. ⏳ Update Codex provider if `.agents/skills/` confirmed
3. ⏳ Optimize Cursor deployment based on latest features
4. ⏳ Update all quickstart guides

**Deliverables**:
- Updated agent definitions with new frontmatter
- Hook templates for Claude Code
- Updated provider implementations
- Refreshed quickstart guides

### Phase 3: Documentation & Testing (Medium-term)

**Duration**: 2-3 weeks

**Actions**:
1. ⏳ Create platform comparison guide
2. ⏳ Build troubleshooting matrix
3. ⏳ Comprehensive testing across all platforms
4. ⏳ Gather user feedback

**Deliverables**:
- Platform comparison guide
- Troubleshooting matrix
- Test results report
- User feedback summary

### Phase 4: Continuous Improvement (Ongoing)

**Actions**:
1. ⏳ Monitor platform updates
2. ⏳ Update providers as platforms evolve
3. ⏳ Maintain documentation
4. ⏳ Respond to user feedback

---

## Success Metrics

### Deployment Quality

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| Platforms with working deployment | 8/8 | 8/8 | ✅ None |
| Platforms with optimized deployment | 8/8 | 5/8 | ⏳ 3 need optimization |
| Platforms with comprehensive docs | 8/8 | 4/8 | ⏳ 4 need updates |
| Test coverage | 100% | 50% | ⏳ Need content/integration tests |

### User Experience

| Metric | Target | Measurement |
|--------|--------|-------------|
| Deployment success rate | >95% | User feedback |
| Time to first deployment | <5 min | User testing |
| Platform switching ease | <10 min | User testing |
| Issue resolution time | <24 hrs | Support tickets |

### Feature Adoption

| Metric | Target | Measurement |
|--------|--------|-------------|
| Claude Code feature utilization | >70% | Agent definition analysis |
| Multi-platform deployment rate | >40% | User surveys |
| Platform satisfaction | >4.5/5 | User ratings |

---

## Risk Mitigation

### Risk: External Research Incomplete

**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Document what we know from codebase ✅
- Clearly mark areas requiring external verification ✅
- Prioritize critical platforms (Claude, Codex, Windsurf)
- Create research checklist for team/AI with web access

### Risk: Windsurf Experimental Fails Testing

**Likelihood**: Medium
**Impact**: Low
**Mitigation**:
- Test with small user group first
- Document issues found
- Maintain experimental status until validated
- Provide fallback to Tier 1/2 platforms

### Risk: Platform Changes Break Deployments

**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Monitor platform release notes
- Maintain comprehensive test suite
- Version pin critical dependencies
- Quick rollback capability

### Risk: Feature Parity Expectations

**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Clear tier documentation ✅
- Platform comparison guide
- Set expectations in quickstarts
- Guide users to best platform for use case

---

## Conclusion

AIWG has a **solid foundation** for universal deployment:

✅ **All 8 platforms working** (7 production-ready, 1 experimental)
✅ **Recent improvements** (v2026.1.4-v2026.1.7)
✅ **Dynamic addon discovery** across all platforms
✅ **Comprehensive internal documentation**

**Next steps prioritized**:

1. **P0 - External Research**: Verify Codex, Windsurf, and all platform latest features
2. **P0 - Claude Code Optimization**: Leverage 29+ new features
3. **P1 - Windsurf Validation**: Test with users, update status
4. **P1 - Documentation**: Create comparison guide, update quickstarts
5. **P2 - Testing**: Comprehensive validation across all platforms

**Expected Outcome**: Best-in-class multi-platform support with clear guidance for users on platform selection and optimization strategies per platform tier.

---

**Related Documents**:
- Full Research Report: `.aiwg/working/platform-features-research-2026-02.md`
- Executive Summary: `.aiwg/working/platform-features-summary.md`
