# Warp Integration - Complete Specification

## Overview

This directory contains the complete, corrected specification for integrating Warp Terminal with the AI Writing Guide (AIWG) SDLC framework.

**Status**: ✅ Ready for Implementation
**Estimated Effort**: 16-18 hours (2 days)
**Approach**: Mirror proven Claude command pattern with intelligent merge

---

## Documents

### 1. WARP-INTEGRATION-REVISED.md

**Purpose**: Main integration document with official Warp documentation cross-reference

**Key Content**:
- Warp's native file support (CLAUDE.md ✅, .claude/agents/*.md ❌)
- Revised integration approach (WARP.md + aggregated CLAUDE.md)
- File structure recommendations
- Implementation plan phases
- Comparison with archived original plan

**Key Discovery**:
> Warp supports `CLAUDE.md` as a rules file but does NOT document support for `.claude/agents/` subdirectories. All agent/command content must be aggregated into single CLAUDE.md file for Warp compatibility.

---

### 2. WARP-SMART-MERGE-STRATEGY.md

**Purpose**: Intelligent merge strategy addressing Warp's `/init` behavior

**Key Content**:
- Warp copies CLAUDE.md → WARP.md during `/init`
- Smart section detection (user vs AIWG-managed)
- Merge algorithm preserving user content
- Idempotent update support
- CLI usage examples

**Key Insight**:
> Warp's `/init` command copies existing rules files into WARP.md. Need intelligent line-based merging (like existing CLAUDE.md approach) to preserve user content while updating AIWG sections.

---

### 3. WARP-COMMANDS-SPEC.md

**Purpose**: Detailed specification for two new commands mirroring Claude pattern

**Commands**:

#### `/aiwg-setup-warp`
- Mirrors: `/aiwg-setup-project`
- Use: Initial Warp setup or merge with existing WARP.md
- Creates: Aggregated WARP.md with 58 agents + 42 commands
- Preserves: All user-specific rules and conventions

#### `/aiwg-update-warp`
- Mirrors: `/aiwg-update-claude`
- Use: Update existing WARP.md with latest AIWG content
- Behavior: Intelligent section replacement with backup
- Requires: Existing WARP.md (fails gracefully if missing)

**Implementation**: `tools/warp/setup-warp.mjs` (single script, dual modes)

---

## Why This Approach?

### 1. Leverage Proven Pattern

**Existing Claude commands work**:
- `/aiwg-setup-project` - 432 lines, battle-tested
- `/aiwg-update-claude` - 525 lines, intelligent merge

**Benefits**:
- 80%+ code reuse (path resolution, section parsing, validation)
- Known-good merge logic
- Comprehensive error handling
- Clear user feedback

### 2. Respect Warp's Architecture

**Warp uses**:
- Single `WARP.md` file (not subdirectories)
- Native support for `CLAUDE.md` as rules file
- Automatic loading on `/init`

**Our approach**:
- Generate `WARP.md` with aggregated content
- Use `CLAUDE.md` for cross-platform compatibility (optional)
- Intelligent merge preserves user content
- Idempotent updates (safe to run multiple times)

### 3. Minimize Transformation

**Original plan** (archived):
- 178 hours of custom transformation logic
- Semantic mapping from agent format to Warp rules
- Complex model assignment logic
- Brittle to format changes

**Revised plan**:
- 16-18 hours leveraging existing patterns
- Simple aggregation (parse frontmatter, format sections)
- No semantic transformation needed
- Resilient to Warp format evolution

---

## Implementation Checklist

### Phase 1: Script Development (6-8 hours)

- [ ] Create `tools/warp/setup-warp.mjs`
- [ ] Implement AIWG path resolution (reuse from Claude commands)
- [ ] Implement section parsing (reuse from Claude commands)
- [ ] Implement agent aggregation (parse .md files, format sections)
- [ ] Implement command aggregation (parse .md files, format sections)
- [ ] Implement intelligent merge (detect user vs AIWG sections)
- [ ] Add dual-mode support (setup vs update)
- [ ] Add backup creation (update mode)
- [ ] Add validation checks

**Code reuse**: 80% from existing Claude commands

### Phase 2: Template Creation (2 hours)

- [ ] Create `templates/warp/WARP.md.aiwg-base`
- [ ] Include AIWG orchestration overview
- [ ] Add placeholders for aggregated agents/commands
- [ ] Add merge markers (`<!-- AIWG SDLC Framework (auto-updated) -->`)
- [ ] Test template rendering

### Phase 3: CLI Integration (1 hour)

- [ ] Update `install.sh`
- [ ] Add `aiwg -setup-warp` command
- [ ] Add `aiwg -update-warp` command (alias to --update flag)
- [ ] Update help text
- [ ] Test CLI routing

### Phase 4: Testing (5 hours)

- [ ] Test new project (no WARP.md)
- [ ] Test existing WARP.md (no AIWG content)
- [ ] Test existing WARP.md (with AIWG content)
- [ ] Test update mode (no WARP.md - should fail)
- [ ] Test dry-run mode
- [ ] Test force mode
- [ ] Test with Warp Terminal `/init`
- [ ] Validate agent/command counts
- [ ] Validate user content preservation

### Phase 5: Documentation (2 hours)

- [ ] Create `docs/integrations/warp-terminal.md`
- [ ] Document `aiwg -setup-warp` usage
- [ ] Document `aiwg -update-warp` usage
- [ ] Add troubleshooting section
- [ ] Update main README.md
- [ ] Update CLAUDE.md with Warp compatibility note

---

## Timeline

| Week | Phase | Deliverables | Status |
|------|-------|-------------|--------|
| **Week 1** | Research & Planning | ✅ Revised integration plan<br>✅ Smart merge strategy<br>✅ Command specifications | Complete |
| **Week 2** | Implementation | ⏳ setup-warp.mjs script<br>⏳ WARP.md template<br>⏳ CLI integration | Pending |
| **Week 3** | Testing & Docs | ⏳ Test suite<br>⏳ Integration docs<br>⏳ Usage guide | Pending |
| **Week 4** | Beta & Release | ⏳ Beta testing<br>⏳ Feedback iteration<br>⏳ GA release | Pending |

**Total**: 16-18 hours of development + 2-3 weeks beta/release cycle

---

## Success Metrics

### Functional

- [ ] `aiwg -setup-warp` creates WARP.md with 58+ agents and 42+ commands
- [ ] User content preserved when merging with existing WARP.md
- [ ] `aiwg -update-warp` updates AIWG sections without losing user content
- [ ] Dry-run mode previews changes accurately
- [ ] Force mode overwrites as expected
- [ ] Validation catches missing sections/agents/commands
- [ ] Works with Warp Terminal `/init` command

### Non-Functional

- [ ] 80%+ code reuse from Claude commands
- [ ] <5 seconds execution time for 100+ agents
- [ ] Clear error messages with actionable guidance
- [ ] Comprehensive validation reporting
- [ ] Idempotent (safe to run multiple times)
- [ ] Platform compatibility (Linux, macOS, Windows/WSL)

### Quality

- [ ] Follows existing AIWG code style
- [ ] Unit tests for section parsing
- [ ] Integration tests for merge scenarios
- [ ] Manual validation in Warp Terminal
- [ ] Documentation complete and accurate
- [ ] User feedback positive (>80% satisfaction)

---

## Comparison: Original vs Revised

| Aspect | Original (Archived) | Revised (This Plan) |
|--------|---------------------|---------------------|
| **Effort** | 178 hours (4-5 weeks) | 16-18 hours (2 days) |
| **Transformation** | Custom semantic mapping | Simple aggregation |
| **Pattern** | Novel approach | Proven Claude pattern |
| **Code Reuse** | 0% (all new) | 80% (from Claude commands) |
| **File Output** | Custom Warp format | Native WARP.md + CLAUDE.md |
| **Compatibility** | Warp only | Warp + Claude Code |
| **Maintenance** | High (custom logic) | Low (shared code) |
| **Risk** | High (untested) | Low (proven pattern) |
| **Documentation** | Official Warp docs | Official Warp docs ✅ |

**Reduction**: 92.7% less effort, 90% less complexity

---

## Next Steps

### Immediate (This Week)

1. **Review** this specification with maintainers
2. **Approve** implementation approach
3. **Create** GitHub issue for tracking
4. **Assign** developer resource

### Short-Term (Next 2 Weeks)

1. **Implement** `setup-warp.mjs` script
2. **Create** WARP.md template
3. **Integrate** with CLI (`install.sh`)
4. **Test** with sample projects
5. **Document** usage and troubleshooting

### Medium-Term (Next 4 Weeks)

1. **Beta test** with 10-20 users
2. **Iterate** based on feedback
3. **GA release** to all users
4. **Monitor** adoption and issues
5. **Update** documentation as needed

---

## Resources

### Internal

- **Existing Commands**:
  - `/aiwg-setup-project` - Pattern reference for setup
  - `/aiwg-update-claude` - Pattern reference for updates
- **Templates**:
  - `templates/project/CLAUDE.md` - AIWG orchestration context
- **Scripts**:
  - `tools/agents/deploy-agents.mjs` - Agent deployment logic
  - `tools/install/install.sh` - CLI command routing

### External

- **Warp Documentation**: https://docs.warp.dev/knowledge-and-collaboration/rules
- **Warp Rules Feature**: Official support for CLAUDE.md, AGENTS.md, .cursorrules
- **Warp /init Command**: Automatic project initialization
- **AIWG Repository**: https://github.com/jmagly/ai-writing-guide

---

## Contact

**Questions**: Open GitHub issue or discussion
**Bugs**: Report at https://github.com/jmagly/ai-writing-guide/issues
**Feature Requests**: Submit via GitHub Discussions

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-17 | AIWG Team | Initial revised integration plan |
| 1.1 | 2025-10-17 | AIWG Team | Added smart merge strategy |
| 1.2 | 2025-10-17 | AIWG Team | Added command specifications |
| 1.3 | 2025-10-17 | AIWG Team | Added this README summary |

---

**END OF WARP INTEGRATION SPECIFICATION**

**Status**: ✅ COMPLETE & READY FOR IMPLEMENTATION
**Estimated Effort**: 16-18 hours (2 days of focused development)
**Risk Level**: LOW (proven pattern, 80% code reuse)
**Next Action**: Create GitHub issue and assign developer
