# Context Management Patterns

This guide documents AIWG's context management strategies, including partial summarization, multi-directory skill discovery, and cross-platform considerations.

## Partial Summarization

Partial summarization (also called "Summarize from here") is a Claude Code feature that allows you to compact conversation history while preserving recent work.

### How It Works

During a conversation, you can select a specific point and choose "Summarize from here". Claude Code will:

1. **Identify the split point**: Everything before the selected message
2. **Generate a summary**: Compress all context before that point into a concise summary
3. **Preserve recent work**: Keep all messages after the split point verbatim
4. **Create new context**: Summary + recent messages = compacted context window

**Before Summarization**:
```
Context: 150,000 tokens
- Messages 1-100 (old work)
- Messages 101-150 (recent work)
```

**After Summarization**:
```
Context: 50,000 tokens
- Summary of messages 1-100 (5,000 tokens)
- Messages 101-150 verbatim (45,000 tokens)
```

### Best Practices for SDLC Sessions

#### When to Summarize

Summarize conversation history at these strategic points:

| Trigger | Reason | Example |
|---------|--------|---------|
| **Phase Transition** | New phase needs fresh focus | After completing Inception, before starting Elaboration |
| **Large Artifact Generated** | Artifact captured in `.aiwg/`, details no longer needed in context | After generating Software Architecture Document |
| **Focus Area Change** | Switching from one component to another | Moving from authentication module to payment processing |
| **Context Window Warning** | Approaching token limits | When Claude Code shows context limit warning |
| **Session Resume** | Starting a new day/session | Beginning of daily standup |

#### Best Practices

**DO summarize**:
- After completing a phase and capturing artifacts in `.aiwg/`
- Before starting a major new task
- When switching between unrelated components
- After resolving a complex debugging session

**DO NOT summarize**:
- In the middle of active iteration (Ralph loops)
- While debugging an active issue
- During rapid back-and-forth refinement
- Before capturing artifacts (summarize AFTER writing to `.aiwg/`)

**Example Workflow**:

```
[Working on requirements in Inception phase]
→ Generate use cases
→ Write use cases to .aiwg/requirements/use-cases/
→ Validate artifacts exist
→ **Summarize from here**
→ Begin Elaboration phase with clean context
```

### Interaction with `.aiwg/` State

**Critical Understanding**: Partial summarization affects **conversation context** only, NOT **file system state**.

| What Gets Summarized | What Persists |
|---------------------|---------------|
| Conversation messages | `.aiwg/` artifact files |
| Reasoning traces | `.aiwg/ralph/` loop state |
| Intermediate discussions | Git commits |
| Exploratory tangents | File system changes |

**Artifacts are Safe**:
```yaml
# This state persists regardless of summarization:
.aiwg/
  ├── requirements/
  │   └── use-cases/UC-001.md  # ✓ Persists
  ├── architecture/
  │   └── sad.md                # ✓ Persists
  └── ralph/
      └── current-loop.json     # ✓ Persists
```

**Context is Compacted**:
```
# Before summarization:
"Let's analyze the authentication requirements..."
"Here are 5 use cases for auth..."
"I've written UC-001 through UC-005 to .aiwg/requirements/"
"Now let's review each use case..."
[50 messages discussing each use case]

# After summarization:
"Summary: Analyzed authentication requirements and generated
5 use cases (UC-001 through UC-005) in .aiwg/requirements/.
All use cases validated and approved."
[Recent messages discussing next phase]
```

### Session Resume After Summarization

When resuming a session after summarization:

```bash
# Session resumes with:
# 1. Summary of previous work
# 2. Recent conversation history
# 3. ALL file system state from .aiwg/

# You can immediately reference artifacts:
claude

You: "Let's continue from the use cases in .aiwg/requirements/"

Claude: "I can see the following use cases:
- UC-001: User Authentication
- UC-002: Password Reset
- UC-003: Multi-Factor Auth
- UC-004: Session Management
- UC-005: Account Lockout

What would you like to work on next?"
```

The artifacts persist, enabling seamless continuation even though detailed conversation about their creation was summarized.

## Skills from Multiple Directories

AIWG supports skill discovery from multiple directory sources, enabling flexible deployment patterns.

### Automatic Discovery

Skills are automatically discovered from:

1. **Primary `.claude/skills/` directory**:
   ```
   project/.claude/skills/
   ```

2. **Additional directories via `--add-dir`**:
   ```bash
   claude --add-dir ~/shared-aiwg-skills
   ```

3. **Nested `.claude/skills/` in additional directories**:
   ```
   ~/shared-aiwg-skills/
     ├── .claude/skills/      # ✓ Auto-discovered
     ├── project-a/
     │   └── .claude/skills/  # ✓ Auto-discovered
     └── project-b/
         └── .claude/skills/  # ✓ Auto-discovered
   ```

### Multi-Directory Example

```bash
# Start Claude Code with multiple skill sources
claude --add-dir ~/aiwg-monorepo

# Skills loaded from:
# 1. ./project/.claude/skills/        (current project)
# 2. ~/aiwg-monorepo/.claude/skills/  (shared skills)
# 3. ~/aiwg-monorepo/api/.claude/skills/     (nested)
# 4. ~/aiwg-monorepo/frontend/.claude/skills/ (nested)
```

All discovered skills are available:
```
/use-case      # From shared skills
/api-design    # From api/ nested skills
/component     # From frontend/ nested skills
/test-plan     # From current project skills
```

### Multi-Project Deployment Patterns

#### Pattern 1: Shared Skills Repository

```
~/aiwg-shared-skills/
  └── .claude/skills/
      ├── use-case.md
      ├── test-plan.md
      └── architecture.md

~/projects/
  ├── project-a/
  │   ├── .claude/skills/
  │   │   └── custom-workflow.md  # Project-specific
  │   └── ...
  └── project-b/
      ├── .claude/skills/
      │   └── api-design.md       # Project-specific
      └── ...

# Usage in project-a:
cd ~/projects/project-a
claude --add-dir ~/aiwg-shared-skills

# Available skills:
# - /use-case (shared)
# - /test-plan (shared)
# - /architecture (shared)
# - /custom-workflow (project-specific)
```

#### Pattern 2: Monorepo with Nested Skills

```
~/monorepo/
  ├── .claude/skills/           # Root-level shared skills
  │   └── project-aware.md
  ├── services/
  │   ├── api/
  │   │   └── .claude/skills/
  │   │       └── api-specific.md
  │   └── auth/
  │       └── .claude/skills/
  │           └── auth-workflows.md
  └── frontend/
      └── .claude/skills/
          └── component-gen.md

# From root:
cd ~/monorepo
claude

# All skills auto-discovered:
# - /project-aware (root)
# - /api-specific (services/api)
# - /auth-workflows (services/auth)
# - /component-gen (frontend)

# From subdirectory:
cd ~/monorepo/services/api
claude

# Skills loaded:
# - /api-specific (local)
# - /project-aware (root, if traversal enabled)
```

#### Pattern 3: Project-Specific + Global Skills

```
~/.aiwg-global/
  └── .claude/skills/
      └── global-utilities.md

~/work/
  ├── client-a/
  │   └── .claude/skills/
  │       └── client-a-workflows.md
  └── client-b/
      └── .claude/skills/
          └── client-b-workflows.md

# Usage:
cd ~/work/client-a
claude --add-dir ~/.aiwg-global

# Available:
# - /client-a-workflows (project)
# - /global-utilities (global)
```

### Conflict Resolution

When same-named skills exist in multiple directories:

**Resolution Order** (first match wins):
1. Current project `.claude/skills/`
2. First `--add-dir` directory
3. Second `--add-dir` directory
4. Nested directories (depth-first search)

**Example**:
```bash
# Both have /use-case skill
~/project/.claude/skills/use-case.md
~/shared/.claude/skills/use-case.md

cd ~/project
claude --add-dir ~/shared

# Invokes: ~/project/.claude/skills/use-case.md
# (local project takes precedence)
```

**Override Pattern**:
```bash
# Force shared version
cd ~/project
claude --add-dir ~/shared --prefer-added-dirs

# Now invokes: ~/shared/.claude/skills/use-case.md
```

### Skill Discovery Configuration

Configure discovery behavior via `aiwg.yml`:

```yaml
skills:
  discovery:
    recursive: true              # Search nested .claude/skills/
    max_depth: 3                 # Max nesting depth
    conflict_resolution: local_first  # local_first | added_first

  directories:
    - path: ~/.aiwg-global
      priority: low              # low | medium | high
    - path: ~/monorepo/shared
      priority: high

  ignore_patterns:
    - "**/node_modules/**"
    - "**/.git/**"
    - "**/test/**/.claude/"
```

## Cross-Platform Context Management

Different AI coding platforms have different context management capabilities.

### Platform Comparison

| Platform | Context Limit | Partial Summarization | Multi-Directory Skills | Persistence Model |
|----------|---------------|----------------------|------------------------|-------------------|
| **Claude Code** | ~200k tokens | Yes (built-in) | Yes (via `--add-dir`) | Session-based + file state |
| **GitHub Copilot** | ~8k tokens | No | Via workspace | File-based + limited chat history |
| **Cursor** | ~100k tokens | Manual (via chat) | Via workspace | Session-based |
| **Factory AI** | ~50k tokens | No | Via project config | Workflow-based |

### AIWG's Platform-Independent Persistence

AIWG's `.aiwg/` directory provides **consistent state persistence across all platforms**:

```yaml
# Regardless of platform, this persists:
.aiwg/
  ├── requirements/           # Requirements artifacts
  ├── architecture/           # Architecture docs
  ├── ralph/                  # Ralph loop state
  │   ├── current-loop.json
  │   └── iteration-001/
  └── planning/               # Phase tracking
      └── current-phase.txt
```

**Platform-Specific Context** (ephemeral):
- Conversation history (varies by platform)
- Reasoning traces (may be lost on session end)
- Tool call logs (platform-dependent retention)

**AIWG State** (persistent):
- All artifacts in `.aiwg/`
- Git commits and history
- Phase progression state
- Ralph loop checkpoints

### Cross-Platform Best Practices

#### Use `.aiwg/` for Important State

**DO**: Write important decisions and artifacts to `.aiwg/`
```
You: "Document this architecture decision"
Claude: [Writes to .aiwg/architecture/adr-001.md]
You: [Session ends]

# Later, on ANY platform:
Claude: [Reads .aiwg/architecture/adr-001.md and continues]
```

**DO NOT**: Rely on conversation context for critical information
```
You: "Remember, we decided to use PostgreSQL"
Claude: "Got it, using PostgreSQL"
[Session ends]

# Later:
You: "What database are we using?"
Claude: "I don't have that context" ❌
```

#### Leverage Platform-Specific Features

**On Claude Code**:
- Use partial summarization liberally
- Use `--add-dir` for skill sharing
- Use `--from-pr` for PR context

**On GitHub Copilot**:
- Keep workspace files updated (`.aiwg/` as source of truth)
- Use `@workspace` to reference AIWG artifacts
- Shorter, focused requests due to smaller context

**On Cursor**:
- Use Cursor's context inclusion (`@Files` and `@Docs`)
- Manually summarize when needed (ask Claude to summarize)
- Leverage Cursor's codebase indexing

**On Factory AI**:
- Use droid workflows with `.aiwg/` state as input
- Chunk work into smaller tasks
- Use workflow-specific persistence

#### Session Resume Checklist

When resuming work on ANY platform:

```markdown
## Session Resume Checklist

- [ ] Review `.aiwg/planning/current-phase.txt` for phase context
- [ ] Check `.aiwg/ralph/current-loop.json` for active loops
- [ ] Read recent commits: `git log -5 --oneline`
- [ ] Review artifact directory: `ls .aiwg/requirements/ .aiwg/architecture/`
- [ ] Check active branch and PR status
- [ ] Verify no merge conflicts or uncommitted changes
```

This works regardless of platform because it relies on file system state, not conversation context.

## Examples

### Example 1: Partial Summarization in SDLC Workflow

```
# Inception Phase: Generate requirements
→ Create 10 use cases
→ Write to .aiwg/requirements/use-cases/
→ Generate user stories
→ Write to .aiwg/requirements/user-stories/
→ Validate inception artifacts

# Context now contains 50,000 tokens of requirement discussions

→ **Summarize from here** (select point after validation)

# Elaboration Phase: Clean context
→ "Let's begin elaboration phase"
→ Claude loads use cases from .aiwg/ with fresh context
→ Design architecture based on requirements
```

### Example 2: Monorepo Skill Sharing

```bash
# Monorepo structure:
~/my-monorepo/
  ├── .claude/skills/
  │   └── common-flows.md        # Shared across all projects
  ├── api/
  │   ├── .claude/skills/
  │   │   └── api-codegen.md     # API-specific
  │   └── src/
  └── web/
      ├── .claude/skills/
      │   └── component-gen.md   # Web-specific
      └── src/

# Working on API:
cd ~/my-monorepo/api
claude

# Available skills:
/common-flows    # From root
/api-codegen     # From api/
# /component-gen NOT available (different project)

# Working on web:
cd ~/my-monorepo/web
claude

# Available skills:
/common-flows    # From root
/component-gen   # From web/
# /api-codegen NOT available (different project)
```

### Example 3: Cross-Platform Session Continuity

**Day 1: On Claude Code**
```bash
cd ~/project
claude

You: "Generate authentication use cases"
Claude: [Generates UC-001 through UC-005 in .aiwg/requirements/]
You: "Great, let's summarize and continue tomorrow"
[Summarize from here]
```

**Day 2: On GitHub Copilot**
```bash
cd ~/project
# Open in VS Code with Copilot

Copilot Chat:
You: "Review use cases in .aiwg/requirements/"
Copilot: [Reads UC-001 through UC-005 from files]
You: "Generate architecture based on these use cases"
Copilot: [Writes to .aiwg/architecture/sad.md]
```

**Day 3: Back on Claude Code**
```bash
cd ~/project
claude

You: "What's our progress?"
Claude: [Reads .aiwg/planning/, sees completed use cases and architecture]
"You've completed Inception and Elaboration. Ready to begin Construction?"
```

All platforms seamlessly continue work because state is in `.aiwg/`, not conversation history.

### Example 4: Conflict Resolution

```bash
# Global skills:
~/.aiwg-global/.claude/skills/use-case.md     # Generic template

# Project skills:
~/project/.claude/skills/use-case.md          # Domain-specific template

cd ~/project
claude --add-dir ~/.aiwg-global

# Conflict: Both have /use-case
# Resolution: Project version takes precedence

/use-case
# → Uses ~/project/.claude/skills/use-case.md

# To use global version explicitly:
/use-case --from ~/.aiwg-global
# → Uses ~/.aiwg-global/.claude/skills/use-case.md
```

## Troubleshooting

### Partial Summarization Issues

**Issue**: Lost important context after summarization
- **Cause**: Summarized too early, before capturing artifacts
- **Fix**: Always write artifacts to `.aiwg/` before summarizing

**Issue**: Summary doesn't include recent decisions
- **Cause**: Summary is too aggressive
- **Fix**: Keep more recent messages unsummarized

### Multi-Directory Skill Issues

**Issue**: Skill not found even though file exists
- **Cause**: Directory not in `--add-dir` or nested too deep
- **Fix**: Add directory explicitly or check `max_depth` config

**Issue**: Wrong skill version executed
- **Cause**: Conflict resolution picked unexpected version
- **Fix**: Use `--prefer-added-dirs` or reorganize priorities

### Cross-Platform Issues

**Issue**: Context lost when switching platforms
- **Cause**: Relied on conversation history instead of `.aiwg/` files
- **Fix**: Always persist critical information to `.aiwg/` directory

**Issue**: Skills not available on different platform
- **Cause**: Skills are Claude Code-specific deployment
- **Fix**: Ensure skills are committed to repo, available to all platforms

## References

- @.aiwg/ - AIWG state directory structure
- @docs/cli-reference.md - CLI commands and flags
- @docs/ralph-guide.md - Ralph loop persistence patterns
- @CLAUDE.md - Multi-platform instructions
- @agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md - Phase progression

---

**Last Updated**: 2026-02-06
**Related Issues**: #292
**Platform**: All (with platform-specific notes)
