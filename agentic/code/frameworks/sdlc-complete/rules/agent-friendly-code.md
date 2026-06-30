---
enforcement: high
---

# Agent-Friendly Code Standards

**Enforcement Level**: HIGH
**Scope**: All code-generating agents
**Research Basis**: Codified Context (Vasilopoulos 2026), Long-Running AI Agents (Zylos 2026), Context Engineering (Fowler 2025)
**Issue**: #402

## Overview

Code agents generate must stay consumable by agents in future sessions. This rule governs the **code agents produce** (quantitative thresholds + structural patterns); `agent-generation-guardrails` is its runtime enforcement companion.

## Thresholds

| Metric | Warning | Error | Rationale |
|--------|---------|-------|-----------|
| File length (LOC) | 300 | 500 | fits the window with room for instructions + output |
| Function/method length | 30 | 50 | reviewable in one read |
| Nesting depth | 3 | 4 | reduces cognitive/token complexity |
| Function parameters | 4 | 6 | limits interface complexity |
| Cyclomatic complexity | 10 | 15 | industry maintainability standard |
| Module exports | 10 | 20 | keeps module surfaces greppable |

Overridable via a `<!-- AIWG_CODE_THRESHOLDS: loc_warn=300 loc_error=500 ... -->` CLAUDE.md directive or `.aiwg/config.yaml` (`agent_friendly_code.thresholds`).

## Mandatory Rules

### Rule 1: Single Responsibility Per File
Each source file addresses one concern (split a file handling both auth and email). **Detection**: >3 unrelated export groups, class names containing "and"/spanning domains, >5 import groups from different domains.

### Rule 2: Descriptive, Greppable Names
Names must be specific enough to grep. **Forbidden**: `utils.ts`/`helpers.ts`/`misc.ts`/`common.ts`/catch-all `index.ts`; functions `handle`/`process`/`doStuff`/`run`/`execute` without a qualifier. **Required**: `src/auth/token-validator.ts`, `validateAuthToken(...)`.

### Rule 3: Explicit Exports Over Barrel Files
Barrel `index.ts` re-exports hide structure from glob/grep — import directly from specific modules. Acceptable only at public API boundaries, for a small cohesive set (<5 items), or where a framework requires it.

### Rule 4: Module-Level Purpose Statement
Every file gets a one-line purpose comment at the top (enables index/librarian; helps agents decide whether to read it).

### Rule 5: Flat Directory Structure
Prefer shallow hierarchies; **max 3 directory levels from `src/`** to any source file (a 7-level `src/modules/user/services/auth/providers/oauth/google/handler.ts` is forbidden).

### Rule 6: Composition Over Inheritance
Deep inheritance chains force agents to hold the whole chain in context — prefer flat composition (a `User` with `timestamps`/`softDelete`/`audit` members over a 5-level `extends` chain).

## When It Applies

Code generation (check output size before writing; split if over warning); code review (flag over-threshold files); refactoring (use thresholds as target structure); existing large files (don't make them worse — extract new functionality to new files). Pairs with anti-laziness (don't skip splitting), executable-feedback (test after splitting), agent-generation-guardrails (runtime enforcement), research-before-decision (research structure first).

## Checklist

Target file under 300 LOC (or a plan to keep it under); new functions under 30 lines; nesting ≤3; descriptive greppable name; one-line purpose statement; no barrel re-exports added; directory depth ≤3 from `src/`.

## References

- Codified Context (Vasilopoulos 2026, arxiv:2602.20478); Long-Running AI Agents (Zylos 2026); Context Engineering (Fowler 2025)
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-generation-guardrails.md

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-28
