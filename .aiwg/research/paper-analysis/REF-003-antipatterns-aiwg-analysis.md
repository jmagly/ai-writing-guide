# REF-003 AIWG Analysis: Agentic Development Anti-Patterns

> **Source Paper**: [Agentic Development Anti-Patterns](https://git.integrolabs.net/roctinam/research-papers/blob/main/documentation/references/REF-003-agentic-development-antipatterns.md)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Analysis Date**: 2026-01-24

## Overview

This document catalogs compensatory behaviors that emerge when AI agents encounter failures during development tasks. Unlike REF-002's failure archetypes (cognitive failures), these anti-patterns describe **behavioral responses to failures** that lead to code cruft, technical debt, and maintenance burden.

These patterns were identified through analysis of the AIWG codebase itself—instances where agentic development created unnecessary complexity requiring cleanup.

## Anti-Pattern Catalog

### AP-1: Shotgun Fix

**Behavior**: When something doesn't work, try every variant until one works, then fail to remove the unsuccessful attempts.

**Symptoms**:
- Multiple case statements for the same command (`-flag`, `--flag`, `flag`)
- Redundant code paths that do the same thing
- Multiple functions/methods that accomplish the same goal
- Configuration with every possible option enabled

**Real Example from AIWG CLI**:
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

**AIWG Mitigation**:
1. **STOP** when something fails
2. **READ** the error message and relevant code
3. **UNDERSTAND** the root cause before attempting fixes
4. **FIX ONE THING** - make a single, targeted change
5. **VERIFY** it works
6. **REMOVE** any experimental variants that weren't needed

**Detection**: Search for duplicate case/if statements, functions with similar names, or multiple code paths to the same outcome.

**Related Pattern**: Archetype 1 (Premature Action) from REF-002

### AP-2: Abandoned Experiment

**Behavior**: Leave "deprecated" code that still runs "just in case" someone depends on it.

**Symptoms**:
- DEPRECATED warnings followed by execution
- Backup files committed to repository
- Old versions of scripts (`*-old.mjs`, `*-backup.ts`)
- Comments like "// keeping for now" or "// might need this later"

**Real Example from AIWG CLI**:
```javascript
// This prints a warning but STILL RUNS the deprecated command
case '-deploy-agents':
  console.log('[DEPRECATED] Use: aiwg use <framework> instead');
  await runScript('tools/agents/deploy-agents.mjs', commandArgs);
  break;
```

**Root Cause**: Fear of breaking something combined with uncertainty about dependencies.

**AIWG Mitigation**:
1. Deprecated means **REMOVED** or **NO-OP** with clear migration path
2. Never leave both warning AND execution
3. If truly needed, use proper versioning (`v2` functions, semver)
4. Trust that users can read deprecation notices

**Detection**: Search for "deprecated", "DEPRECATED", "old", "backup", "legacy" in codebase.

### AP-3: Magic Number Accumulation

**Behavior**: Add hardcoded values without documentation, assuming "I'll remember why" or "it just works."

**Symptoms**:
- Unexplained multipliers (`score -= criticalCount * 10`)
- Arbitrary thresholds (`if (score < 50)`)
- Numeric constants without variable names or comments
- Different magic numbers in different places for same concept

**Real Example from AIWG validation-engine.ts**:
```typescript
// Why 10? Why 15? Why 30?
const humanScore = humanMarkers.length * 10;
const aiPenalty = aiTells.length * 15;
const score = Math.max(0, Math.min(100, humanScore - aiPenalty + 30));
```

**Root Cause**: Iterative tuning without documentation. "This value worked better" without recording why.

**AIWG Mitigation**:
1. Every magic number needs **documented rationale**
2. If tunable, **extract to configuration** with description
3. If not configurable, add **inline comment explaining why this value**
4. Use **named constants** for repeated values

**Detection**: Search for numeric literals in conditionals and calculations.

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

**AIWG Mitigation**:
1. **Single source of truth** for input handling
2. **Normalize inputs once**, at entry point
3. **Trust normalized inputs** downstream
4. Use **type system** to enforce invariants

**Detection**: Look for repeated conditional checks, especially null/undefined checks.

### AP-5: Cruft Accumulation

**Behavior**: Create temporary files, debug code, or experiments and forget to clean up.

**Symptoms**:
- Backup files in repository (`.backup`, `.old`, `.bak`)
- Zone.Identifier files (Windows download metadata)
- Commented-out code blocks
- Debug logging that was never removed
- Test files in production directories

**Real Example from AIWG root**:
```
CLAUDE.md.backup-20251210-191704  (37KB!)
CLAUDE.md.backup-20251210-233146
2512.07497v2.pdf:Zone.Identifier
```

**Root Cause**: No cleanup step in workflow. "I'll clean it up later" becomes never.

**AIWG Mitigation**:
1. **Working files** go in `.aiwg/working/` (auto-prune candidate)
2. **Never commit backup files** - use git for versioning
3. **Post-task cleanup checkpoint** - ask "what temporary things did I create?"
4. Add patterns to `.gitignore` proactively

**Detection**: Search for `.backup`, `.old`, `.bak`, `Zone.Identifier`, large commented blocks.

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

## Pre-Commit Checklist

Before committing any fix, verify:

- [ ] **Root Cause**: Did I understand WHY the original code failed?
- [ ] **Single Path**: Is there only ONE solution path (not multiple variants)?
- [ ] **No Experiments**: Are all experimental attempts removed?
- [ ] **No Magic**: Are magic numbers documented or configurable?
- [ ] **No Zombies**: Are deprecated features either removed or true no-ops?
- [ ] **No Cruft**: Are temporary files deleted?

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

## AIWG-Specific Applications

### Quality Gate: Anti-Pattern Detection

**Implementation**: `agentic/code/addons/quality-gates/anti-pattern-detection.md`

**Validation Rules**:
```yaml
anti_patterns:
  shotgun_fix:
    - Check for duplicate case/if statements
    - Flag multiple functions with similar names
    - Detect redundant code paths

  abandoned_experiment:
    - Flag DEPRECATED that still executes
    - Detect backup files in commits
    - Warn on "keeping for now" comments

  magic_numbers:
    - Require comments for numeric literals in logic
    - Suggest configuration extraction
    - Check for repeated constants

  defensive_duplication:
    - Detect redundant null checks
    - Flag duplicate validation logic
    - Identify repeated transformations

  cruft_accumulation:
    - Block commits with .backup, .old, .bak files
    - Warn on large commented blocks
    - Check .gitignore coverage
```

### Agent Enhancement: Code Writer

**Location**: `agentic/code/frameworks/sdlc-complete/agents/code-writer.md`

**Add Section**:
```markdown
## Anti-Pattern Prevention

When making code changes:

### Before Writing
1. **Diagnose**: Read error messages and related code
2. **Understand**: Identify root cause, not just symptoms
3. **Plan**: Describe the single fix you'll apply

### During Writing
4. **Single Change**: Make one targeted modification
5. **No Shotgun**: Don't try multiple approaches simultaneously

### After Writing
6. **Verify**: Does the fix work?
7. **Clean**: Remove any experimental code
8. **Document**: Add comment explaining why this fix works
```

### Command: Workspace Cleanup

**Implementation**: `agentic/code/frameworks/sdlc-complete/commands/workspace-cleanup.md`

**Purpose**: Automated detection and removal of anti-pattern symptoms.

**Operations**:
1. Find and list backup files
2. Detect commented-out code blocks >10 lines
3. Identify magic numbers without documentation
4. Report duplicate code paths
5. Suggest .gitignore additions

## Improvement Opportunities

### High Priority

1. **Add Anti-Pattern Linter**
   - Integrate with pre-commit hooks
   - Automated detection of all 5 patterns
   - Blocking vs. warning rules

2. **Enhanced Code Review Agent**
   - Train to recognize anti-pattern symptoms
   - Provide specific remediation guidance
   - Track anti-pattern frequency metrics

3. **Workspace Prune Command**
   - Automated cleanup of `.aiwg/working/`
   - Optional cleanup of backup files
   - Generate cleanup report

### Medium Priority

4. **Agent Training Materials**
   - Anti-pattern recognition examples
   - Recovery protocol training
   - Best practice demonstrations

5. **Metrics Tracking**
   - Count anti-pattern occurrences per commit
   - Track cleanup efforts
   - Measure code quality improvements

### Future Enhancements

6. **AI-Assisted Refactoring**
   - Detect anti-patterns automatically
   - Suggest refactoring strategies
   - Generate cleanup pull requests

7. **Learning from Mistakes**
   - Catalog common anti-pattern triggers
   - Build prevention guidance
   - Update agent training

## Related AIWG Components

| Component | Relevance |
|-----------|-----------|
| `@agentic/code/addons/quality-gates/` | Anti-pattern detection implementation |
| `@agentic/code/frameworks/sdlc-complete/agents/code-writer.md` | Agent enhancement location |
| `@agentic/code/frameworks/sdlc-complete/agents/code-reviewer.md` | Review logic updates |
| `@.claude/rules/development.md` | Development conventions |
| `@.aiwg/working/` | Designated temporary file area |

## Comparison with REF-002 Archetypes

| REF-003 Anti-Pattern | REF-002 Archetype | Relationship |
|----------------------|-------------------|--------------|
| **AP-1: Shotgun Fix** | **Archetype 1: Premature Action** | Both involve acting without understanding |
| **AP-2: Abandoned Experiment** | **Archetype 4: Fragile Execution** | Result of failed recovery attempts |
| **AP-3: Magic Numbers** | **Archetype 1: Premature Action** | Lack of grounding in rationale |
| **AP-4: Defensive Duplication** | **Archetype 2: Over-Helpfulness** | Overcompensating for uncertainty |
| **AP-5: Cruft Accumulation** | **Archetype 4: Fragile Execution** | Failure to complete cleanup |

**Key Insight**: Anti-patterns are often **behavioral responses** to the cognitive failures described in REF-002. Addressing root archetypes can prevent anti-pattern emergence.

## Key Quotes

> "These patterns were identified through analysis of the AIWG codebase itself - instances where agentic development created unnecessary complexity that required cleanup."

> "Agent doesn't understand WHY something failed, so it tries permutations instead of diagnosing."

> "Deprecated means REMOVED or NO-OP with clear migration path."

> "The limitation is on number of chunks, not information content."

## References

- **Source Document**: REF-003 (Internal AIWG Reference)
- **Related Research**:
  - REF-001: Bandara et al. - Production-Grade Agentic AI Workflows (BP-9: KISS)
  - REF-002: Roig - How Do LLMs Fail In Agentic Scenarios? (Archetype 1: Premature Action)
- **AIWG Components**:
  - `.claude/rules/development.md` - Development conventions
  - Agent definitions requiring anti-pattern prevention guidance
