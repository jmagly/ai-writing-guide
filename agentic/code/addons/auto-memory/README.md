# Automatic Memory Addon

Seed templates for Claude Code's Automatic Memory feature, providing AIWG-aware starting points for new projects.

## What is Automatic Memory?

**Automatic Memory** is a Claude Code v2.1.32+ feature that maintains persistent, evolving knowledge about your project:

- **Location**: `~/.claude/projects/<project>/memory/`
- **Format**: Markdown files organized by topic
- **Purpose**: Learn and remember project-specific patterns, conventions, and decisions
- **Persistence**: Survives across sessions, continuously refined

### Memory vs Other Context Mechanisms

| Mechanism | Purpose | Scope | Updates |
|-----------|---------|-------|---------|
| **Automatic Memory** | Long-term project knowledge | Project-wide | Continuous, automatic |
| **CLAUDE.md** | Static project instructions | Repository-wide | Manual, versioned in git |
| **Agent Definitions** | Specialized AI personas | Task-specific | Manual, framework-managed |
| **Ralph Debug Memory** | Iteration debugging history | Task-specific loop | Per-loop, ephemeral |

**When to use which**:

- **Automatic Memory**: Patterns learned during development (test conventions, debugging strategies, architecture decisions)
- **CLAUDE.md**: Static project setup, team conventions, onboarding instructions
- **Agent Definitions**: Specialized workflows (requirements analysis, code review, security audits)
- **Ralph Debug Memory**: Temporary iteration state for debugging specific task loops

## AIWG Memory Seeds

This addon provides seed templates that bootstrap automatic memory with AIWG-aware content:

### MEMORY.md

Central memory file with:
- AIWG framework concepts (phases, commands, artifact structure)
- Links to topic-specific memory files
- Project-specific conventions (auto-populated during development)

### testing.md

Testing knowledge including:
- Test framework detection and configuration
- Common patterns (test-first development, coverage expectations)
- Known gotchas (async issues, flaky tests)
- Debug strategies for failed tests

### debugging.md

Debugging patterns including:
- Common issues and resolutions
- Systematic debugging process
- Stack-specific error patterns
- Performance debugging strategies

### architecture.md

Architectural decisions including:
- Key design choices and rationale
- Patterns used in the codebase
- Technology stack and justifications
- Cross-cutting concerns (security, performance, scalability)

## Installation and Usage

### Automatic (via `aiwg new`)

When scaffolding a new project with `aiwg new my-project`, memory seeds are automatically copied to `~/.claude/projects/my-project/memory/` (if Claude Code v2.1.32+ detected).

### Manual

Copy seed files to your project's memory directory:

```bash
# For current project
cp agentic/code/addons/auto-memory/seeds/*.md ~/.claude/projects/$(basename $(pwd))/memory/

# For specific project
cp agentic/code/addons/auto-memory/seeds/*.md ~/.claude/projects/my-project/memory/
```

### Verification

Check that memory files exist:

```bash
ls -la ~/.claude/projects/$(basename $(pwd))/memory/
```

Expected output:
```
MEMORY.md
testing.md
debugging.md
architecture.md
```

## Memory Evolution

Memory files are **seed templates** — they provide structure and AIWG-specific guidance, then evolve as Claude Code learns project-specific patterns.

### Initial State (Seed)

```markdown
## Common Patterns

<!-- Learned during development -->
```

### After Learning

```markdown
## Common Patterns

### Test-First Development

**Pattern**: Test → Implement → Refactor
- Write failing test first (learned from UC-001 implementation)
- Implement minimal code to pass
- Refactor while keeping tests green

**Observed**: 15/20 features follow this pattern (as of 2026-02-06)
```

## Memory Maintenance

### Pruning

As memory grows, prune obsolete sections:

- **Outdated patterns**: Remove if no longer applicable
- **One-time issues**: Move to debugging.md after resolution
- **Superseded decisions**: Mark as "SUPERSEDED" with reference to newer decision

### Organization

Keep memory organized:

- **Topic files**: Use provided topic files (testing, debugging, architecture)
- **Custom topics**: Add new topic files as needed (e.g., `deployment.md`, `security.md`)
- **Cross-references**: Link between memory files using relative paths

### Quality

Maintain high-quality memory:

- **Specific over general**: "Use factory pattern for test data (see test/factories/)" vs "Use factories"
- **Actionable**: Include enough detail to reproduce patterns
- **Accurate**: Update when patterns change
- **Concise**: Remove redundancy, keep signal high

## Overlap Analysis

### Automatic Memory vs Ralph Debug Memory

Both maintain debugging history, but serve different purposes:

| Aspect | Automatic Memory | Ralph Debug Memory |
|--------|------------------|-------------------|
| **Scope** | Project-wide patterns | Single loop execution |
| **Lifetime** | Permanent (pruned manually) | Per-loop (ephemeral) |
| **Content** | Recurring patterns | Specific iteration state |
| **Location** | `~/.claude/projects/<project>/memory/` | `.aiwg/ralph/debug-memory/` |
| **Use Case** | "We always have async test issues" | "Iteration 3 failed with timeout error" |

**Interaction**:
- Ralph debug memory captures loop-specific state
- After resolving recurring issues, patterns migrate to automatic memory
- Example: "Timeout errors in API tests" appears in Ralph memory 3 times → Added to `debugging.md` as "Common pattern: increase timeout for external API calls"

### Memory vs CLAUDE.md

| Aspect | Automatic Memory | CLAUDE.md |
|--------|------------------|-----------|
| **Versioning** | Not in git (local to Claude Code) | Versioned in git |
| **Updates** | Automatic (by Claude Code) | Manual (by developers) |
| **Content** | Learned patterns | Static instructions |
| **Scope** | Project-specific | Team-wide |

**Best practice**: CLAUDE.md contains stable team conventions, automatic memory contains evolving learned patterns.

## Cross-Platform Considerations

**Claude Code-Specific**:
This addon is designed for Claude Code v2.1.32+ and its automatic memory feature.

**Other Platforms**:
- **GitHub Copilot**: Does not have automatic memory (uses workspace context)
- **Cursor**: Has project-level memory but different persistence mechanism
- **Warp Terminal**: No equivalent feature
- **OpenCode**: Custom memory implementation

**Transferability**:
The **concepts** (learned patterns, debugging strategies, architecture decisions) are transferable across platforms. The **implementation** (file locations, automatic updates) is platform-specific.

**Migration**:
If switching platforms:
1. Export knowledge from automatic memory files
2. Convert to platform-specific format (e.g., `.cursor/rules/` for Cursor)
3. Or incorporate into CLAUDE.md as static instructions

## Integration with `aiwg new`

The `aiwg new` command integrates memory seeding:

```bash
aiwg new my-project
```

**Detection**:
1. Check if Claude Code v2.1.32+ is installed
2. If yes, detect project name from command argument
3. Create memory directory: `~/.claude/projects/my-project/memory/`
4. Copy seed templates to memory directory
5. Log success message: "✓ Seeded automatic memory for my-project"

**Fallback**:
If Claude Code not detected or version < 2.1.32:
- Skip memory seeding
- Log informational message: "ℹ Automatic memory requires Claude Code v2.1.32+"

## Example Workflow

### Day 1: Project Setup

```bash
$ aiwg new my-api
Creating new AIWG project: my-api
✓ Scaffolded .aiwg/ structure
✓ Seeded automatic memory
✓ Created CLAUDE.md

$ cd my-api
$ cat ~/.claude/projects/my-api/memory/MEMORY.md
# Shows AIWG framework concepts, empty project conventions
```

### Day 5: After First Sprint

```bash
$ cat ~/.claude/projects/my-api/memory/testing.md
## Test Framework
**Framework**: jest
**Version**: 29.7.0

## Common Patterns
### Test-First Development
- Learned from UC-001, UC-002 implementations
- Pattern: Write test → Implement → Refactor

### Coverage Expectations
**Minimum Coverage**: 80% for new code
- Learned from .aiwg/testing/test-strategy.md

## Known Gotchas
### Async Test Issues
**Pattern**: Always return promises or use async/await
- Learned from debugging test failures in auth module
```

### Day 30: After Multiple Sprints

Memory has evolved with:
- Specific test patterns used in the codebase
- Recurring debugging issues and resolutions
- Architectural decisions made and rationale
- Project-specific conventions established

## FAQ

### Q: Should memory files be committed to git?

**A**: No. Automatic memory is stored in `~/.claude/projects/<project>/memory/`, which is outside the repository. It's personal to each developer's Claude Code instance.

### Q: How do I share learned patterns with the team?

**A**: Promote stable patterns from automatic memory to:
1. **CLAUDE.md** for static team conventions
2. **ADRs** for architectural decisions
3. **Documentation** for process/patterns

### Q: What if I work on multiple machines?

**A**: Automatic memory is per-machine. Options:
1. Sync `~/.claude/projects/` directory (e.g., via Dropbox)
2. Manually export/import memory files
3. Promote important patterns to versioned documentation

### Q: Can I disable memory seeding?

**A**: Yes, use `aiwg new my-project --no-memory` (if implemented) or manually delete the memory directory after project creation.

### Q: How often should I prune memory?

**A**: Prune when:
- Memory files become too large (>500 lines)
- Patterns are no longer applicable
- After major architectural changes

**Frequency**: Monthly or quarterly review recommended.

## References

- **Claude Code Automatic Memory**: [Documentation](https://docs.anthropic.com/claude/docs/automatic-memory) (Claude Code v2.1.32+)
- **AIWG CLAUDE.md**: `@CLAUDE.md` - Static project instructions
- **Ralph Debug Memory**: `@agentic/code/addons/ralph/schemas/debug-memory.yaml` - Loop-specific debugging state
- **AIWG Scaffolding**: `@tools/scaffold/` - Project scaffolding implementation

## Version History

- **1.0.0** (2026-02-06): Initial release with four seed templates (MEMORY, testing, debugging, architecture)

---

**Addon Type**: Enhancement
**Platform**: Claude Code v2.1.32+
**Maintenance**: Seed templates are versioned; evolved memory is local and unversioned
