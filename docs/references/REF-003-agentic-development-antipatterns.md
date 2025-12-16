# REF-003: Agentic Development Anti-Patterns

## Citation

Internal AIWG Reference Document (2025). Agentic Development Anti-Patterns: Compensatory Behaviors That Lead to Code Cruft.

**Related Research**:
- REF-001: Bandara et al. - Production-Grade Agentic AI Workflows
- REF-002: Roig - How Do LLMs Fail In Agentic Scenarios?

## Overview

This document catalogs **compensatory behaviors** that emerge when AI agents encounter failures during development tasks. Unlike REF-002's failure archetypes (which describe cognitive failures), these anti-patterns describe **behavioral responses to failures** that lead to code cruft, technical debt, and maintenance burden.

These patterns were identified through analysis of the AIWG codebase itself - instances where agentic development created unnecessary complexity that required cleanup.

## Anti-Pattern Catalog

### AP-1: Shotgun Fix

**Behavior**: When something doesn't work, try every variant until one works, then fail to remove the unsuccessful attempts.

**Symptoms**:
- Multiple case statements for the same command (`-flag`, `--flag`, `flag`)
- Redundant code paths that do the same thing
- Multiple functions/methods that accomplish the same goal
- Configuration with every possible option enabled

**Real Example** (from AIWG CLI):
```javascript
// Before cleanup - handling same command 4 different ways
case '-h':
case '--help':
case '-help':
case 'help':
  displayHelp();
  break;
```

**Root Cause**: Agent doesn't understand WHY something failed, so it tries permutations instead of diagnosing.

**Mitigation Protocol**:
1. **STOP** when something fails
2. **READ** the error message and relevant code
3. **UNDERSTAND** the root cause before attempting fixes
4. **FIX ONE THING** - make a single, targeted change
5. **VERIFY** it works
6. **REMOVE** any experimental variants that weren't needed

**Detection**: Search for duplicate case/if statements, functions with similar names, or multiple code paths to the same outcome.

---

### AP-2: Abandoned Experiment

**Behavior**: Leave "deprecated" code that still runs "just in case" someone depends on it.

**Symptoms**:
- DEPRECATED warnings followed by execution
- Backup files committed to repository
- Old versions of scripts (`*-old.mjs`, `*-backup.ts`)
- Comments like "// keeping for now" or "// might need this later"

**Real Example** (from AIWG CLI):
```javascript
// This prints a warning but STILL RUNS the deprecated command
case '-deploy-agents':
  console.log('[DEPRECATED] Use: aiwg use <framework> instead');
  await runScript('tools/agents/deploy-agents.mjs', commandArgs);
  break;
```

**Root Cause**: Fear of breaking something combined with uncertainty about dependencies.

**Mitigation Protocol**:
1. Deprecated means **REMOVED** or **NO-OP** with clear migration path
2. Never leave both warning AND execution
3. If truly needed, use proper versioning (`v2` functions, semver)
4. Trust that users can read deprecation notices

**Detection**: Search for "deprecated", "DEPRECATED", "old", "backup", "legacy" in codebase.

---

### AP-3: Magic Number Accumulation

**Behavior**: Add hardcoded values without documentation, assuming "I'll remember why" or "it just works."

**Symptoms**:
- Unexplained multipliers (`score -= criticalCount * 10`)
- Arbitrary thresholds (`if (score < 50)`)
- Numeric constants without variable names or comments
- Different magic numbers in different places for same concept

**Real Example** (from AIWG validation-engine.ts):
```typescript
// Why 10? Why 15? Why 30?
const humanScore = humanMarkers.length * 10;
const aiPenalty = aiTells.length * 15;
const score = Math.max(0, Math.min(100, humanScore - aiPenalty + 30));
```

**Root Cause**: Iterative tuning without documentation. "This value worked better" without recording why.

**Mitigation Protocol**:
1. Every magic number needs **documented rationale**
2. If tunable, **extract to configuration** with description
3. If not configurable, add **inline comment explaining why this value**
4. Use **named constants** for repeated values

**Detection**: Search for numeric literals in conditionals and calculations.

---

### AP-4: Defensive Duplication

**Behavior**: Handle the same input multiple ways "to be safe" because you're not sure which path is being triggered.

**Symptoms**:
- Multiple validation checks for the same data
- Redundant null/undefined checks at different levels
- Same transformation applied in multiple places
- "Belt and suspenders" code patterns

**Example**:
```typescript
// Checking the same thing multiple times at different levels
function processUser(user: User | null | undefined) {
  if (!user) return;

  // ... 50 lines later ...

  if (user === null || user === undefined) {
    return; // Already checked above!
  }
}
```

**Root Cause**: Uncertainty about data flow leads to redundant safety checks.

**Mitigation Protocol**:
1. **Single source of truth** for input handling
2. **Normalize inputs once**, at entry point
3. **Trust normalized inputs** downstream
4. Use **type system** to enforce invariants

**Detection**: Look for repeated conditional checks, especially null/undefined checks.

---

### AP-5: Cruft Accumulation

**Behavior**: Create temporary files, debug code, or experiments and forget to clean up.

**Symptoms**:
- Backup files in repository (`.backup`, `.old`, `.bak`)
- Zone.Identifier files (Windows download metadata)
- Commented-out code blocks
- Debug logging that was never removed
- Test files in production directories

**Real Example** (from AIWG root):
```
CLAUDE.md.backup-20251210-191704  (37KB!)
CLAUDE.md.backup-20251210-233146
2512.07497v2.pdf:Zone.Identifier
```

**Root Cause**: No cleanup step in workflow. "I'll clean it up later" becomes never.

**Mitigation Protocol**:
1. **Working files** go in `.aiwg/working/` (auto-prune candidate)
2. **Never commit backup files** - use git for versioning
3. **Post-task cleanup checkpoint** - ask "what temporary things did I create?"
4. Add patterns to `.gitignore` proactively

**Detection**: Search for `.backup`, `.old`, `.bak`, `Zone.Identifier`, large commented blocks.

---

## Recovery Protocol

When you notice you're exhibiting an anti-pattern:

```
1. PAUSE    → Stop making changes immediately
2. INVENTORY → List all variants/attempts created
3. IDENTIFY  → Which ONE actually solved the problem?
4. CLEAN     → Remove all others
5. DOCUMENT  → Why did the working solution work?
```

### Example Recovery

**Situation**: You've created 3 versions of a function trying to fix a bug.

```
1. PAUSE    → Stop creating more versions
2. INVENTORY → functionV1(), functionV2(), functionV3()
3. IDENTIFY  → functionV2() fixed it - the issue was async handling
4. CLEAN     → Delete functionV1(), functionV3(), rename functionV2() to function()
5. DOCUMENT  → Add comment: "Must await before accessing .data property"
```

---

## Pre-Commit Checklist

Before committing any fix, verify:

- [ ] **Root Cause**: Did I understand WHY the original code failed?
- [ ] **Single Path**: Is there only ONE solution path (not multiple variants)?
- [ ] **No Experiments**: Are all experimental attempts removed?
- [ ] **No Magic**: Are magic numbers documented or configurable?
- [ ] **No Zombies**: Are deprecated features either removed or true no-ops?
- [ ] **No Cruft**: Are temporary files deleted?

---

## Integration with AIWG Framework

### Agent Design Guidance

Agents should be designed to:
1. **Diagnose before fixing** - Use read/search tools before write/edit
2. **Single-change commits** - One logical change per commit
3. **Verify and clean** - Always verify fix works, then clean up attempts

### Related AIWG Patterns

| Pattern | Addresses Anti-Pattern |
|---------|------------------------|
| Primary Author → Reviewers | AP-1 (catches duplicated code) |
| Structured Error Recovery (REF-002) | AP-1, AP-2 (proper recovery prevents shotgun fixes) |
| Configuration Management | AP-3 (externalized config prevents magic numbers) |
| Working Directory Convention | AP-5 (designated cleanup area) |

### Enforcement Points

1. **Pre-commit hooks**: Lint for common patterns
2. **Code review agents**: Flag anti-pattern symptoms
3. **Workspace prune command**: Regular cleanup of `.aiwg/working/`

---

## Related Documents

- REF-001: Production-Grade Agentic AI Workflows (BP-9: KISS)
- REF-002: LLM Failure Modes (Archetype 1: Premature Action)
- `.claude/rules/development.md`: Development conventions

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-16 | AIWG Analysis | Initial document based on codebase self-audit |
