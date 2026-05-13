# UC-HMP-003: Hermes AGENTS.md Re-Architecture + Hotfixes

**Phase**: Elaboration | **Priority**: P0 | **Status**: Draft

## Reasoning

1. **Problem**: Generated AGENTS.md for Hermes ships broken `delegate_task(skip_context_files=True, skip_memory=True)` instructions; claims to emit `.hermes.md` but doesn't; lacks rule priming.
2. **Constraint**: Hermes 20K-char cap on context files (head-tail truncated above).
3. **Alternatives**: (a) MCP `rule-list` only (no inline priming — rules might never be queried); (b) AGENTS.md inlining of CRITICAL rules (chosen — guaranteed priming); (c) MCP `prompts` capability (Hermes consumes but doesn't auto-inject).
4. **Rationale**: CRITICAL enforcement rules (no-attribution, anti-laziness, citation, token-security, versioning, ops-safety) must be guaranteed in context. AGENTS.md is the only auto-loaded slot.
5. **Risk**: Eating context budget for users on small models; mitigated by tight inlining (~4,750 token budget).

## Primary Actor

Operator running `aiwg use --provider hermes` (deployer); Hermes runtime (context loader).

## Goal

Hermes session has correct routing rules, correct `delegate_task` API in examples, CRITICAL rule priming inlined, and a thin `.hermes.md` pointer at project root.

## Main Success Scenario

1. Operator runs `aiwg use --provider hermes`.
2. Deployer generates AGENTS.md containing:
   - Routing rules (when to call AIWG)
   - Correct `delegate_task()` API examples (no broken kwargs)
   - Top-6 CRITICAL rules inlined verbatim
   - Pointer to `mcp_aiwg_rule_list` for the rest
3. Deployer writes `.hermes.md` at project root (thin pointer; Hermes prioritizes over AGENTS.md per first-match-wins).
4. Hermes session loads `.hermes.md`, sees the priming, applies CRITICAL rules consistently.

## Acceptance Criteria

- [ ] **Hotfix H1**: `hermes.mjs:117` removes `skip_context_files=True, skip_memory=True` kwargs from generated AGENTS.md
- [ ] Top-6 rules inlined: `no-attribution`, `anti-laziness`, `citation-policy`, `token-security`, `versioning`, `ops-safety`
- [ ] AGENTS.md total stays ≤20K chars (verified by deployer with hard fail above 19K)
- [ ] `.hermes.md` emission implemented in `hermes.mjs` (currently claimed but missing)
- [ ] Pointer to `mcp_aiwg_rule_list` documented in AGENTS.md routing section
- [ ] `agentic/code/frameworks/sdlc-complete/templates/hermes/AGENTS.md.aiwg-template` updated to match
- [ ] CHANGELOG entry references this issue and closes the #1239 doc-debt

## Implementation Sketch

`hermes.mjs`:
- Line 117: replace `delegate_task(skip_context_files=True, skip_memory=True)` with `delegate_task(goal="...", context="...")` (correct API per vendor research)
- Expand `generateAgentsMd()` to inline 6 rule bodies from `agentic/code/.../rules/*.md`
- Add `generateHermesMd(targetDir, opts)` — writes thin `.hermes.md` pointer
- Wire both into deploy pipeline alongside existing AGENTS.md emission
