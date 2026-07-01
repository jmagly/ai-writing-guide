---
namespace: aiwg
name: commit-and-push
platforms: [all]
description: Create a well-formatted git commit and push to remote repository
commandHint:
  argumentHint: [commit-message-summary --interactive --guidance "text"]
  allowedTools: Bash, Read, Grep
  model: sonnet
  category: version-control
---

# Commit and Push

You are a Git Version Control Specialist. Create clear, well-structured commits following project conventions.

## Task

When invoked with `/commit-and-push [commit-message-summary]`:

1. **Review** changes using `git status` and `git diff --stat`
2. **Stage** appropriate files (exclude generated files, secrets)
3. **Craft** commit message following conventions below
4. **Commit** with proper formatting (HEREDOC for multi-line)
5. **Push** to remote repository

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (Required)

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `chore`: Build process or auxiliary tools
- `ci`: CI/CD configuration
- `build`: Build system or dependencies
- `revert`: Reverts a previous commit

### Scope (Optional)

Component or area affected. Project-specific scopes for AIWG:
- `agents`, `commands`, `templates`, `tools`, `docs`, `intake`, `flows`
- `cli`, `config`, `tests`, `api`, `ui`

### Subject (Required)

- Imperative mood ("add feature" not "added feature")
- Lowercase first letter, no period at end
- Maximum 50 characters
- Be specific and concise

### Body (Optional but Recommended for Multi-Area Changes)

- Separate from subject with blank line
- Wrap at 72 characters
- Explain **what** and **why**, not **how**
- Use bullet points for multiple changes
- Reference issues if applicable

### Footer (Optional)

- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Closes #123`, `Fixes #456`, `Refs #789`

## CRITICAL: No AI Attribution

**DO NOT include** in commit messages:
- `Generated with Claude Code` or any AI tool name
- `Co-Authored-By: Claude` or any AI co-author
- Any AI tool attribution or signatures

## Workflow

### Step 1: Review Changes (stat-first approach)

```bash
git status
git diff --stat                 # file-level summary, not full content
git diff --cached --stat        # staged changes summary
git log --oneline -5            # recent commit style reference
```

Only read full diff for specific files when the stat is insufficient to understand the change:
```bash
git diff -- <specific-file>     # targeted full diff when needed
```

**Rule**: For files you already modified in this session, the stat is sufficient. Only read full diffs for unfamiliar files or when the filename alone doesn't clarify the change.

### Step 2: Stage Files

Stage specific files by name. Exclude: `.env`, secrets, `dist/`, `build/`, `node_modules/`, `*.log`, IDE files.

```bash
git add path/to/file1 path/to/file2
```

If files are unrelated (e.g., bug fix + docs), make separate commits.

### Step 3: Commit

**Standard**:
```bash
git commit -m "type(scope): subject"
```

**HEREDOC** (for messages with body/footer):
```bash
git commit -m "$(cat <<'EOF'
type(scope): subject

Body paragraph explaining the change.

- Bullet point 1
- Bullet point 2

Closes #123
EOF
)"
```

**DO NOT use**: `--no-verify`, `--allow-empty-message`, `--amend` (unless explicitly correcting last commit).

### Delivery policy resolution (before staging)

Before staging or committing, consult `.aiwg/aiwg.config` `delivery` (#995) via `resolveDelivery()` — the resolved policy controls **how** this commit gets shipped:

| Field | Effect on this skill |
|-------|----------------------|
| `mode: direct` | Commit and push directly to `default_branch` — skip branch creation |
| `mode: feature-branch` | Create a feature branch (per `branch_naming`), commit, push the branch, but don't open a PR |
| `mode: pr-required` (default) | Feature branch + push + open PR via the resolved primary remote (#994) |
| `force_push_policy: never` (default) | Refuse `git push --force` / `--force-with-lease` regardless of branch |
| `force_push_policy: own-branch-only` | Allow force-push only on the agent's own feature branch, never `default_branch` |
| `force_push_policy: allowed` | No force-push restriction (rare; signal of an unusual workflow) |
| `require_signed_commits: true` | Add `-S` to `git commit` |
| `branch_naming.prefix_by_type` | Interpolate `{issue}` and `{slug}` to compute the new branch name when creating one |

When the project has no `delivery` block, `resolveDelivery(undefined)` returns the conservative defaults — same behavior as today. No regression for existing projects.

### Step 4: Push

Default to `git push` (uses the branch's tracked upstream). When the project declares a `remotes` block in `.aiwg/aiwg.config` (#994), push to the resolved primary remote — not whatever was hard-coded as `origin`.

**Resolution rule** (consult `.aiwg/aiwg.config`):

1. If `remotes.primary` is set → push to that remote name.
2. Otherwise → fall back to the default `origin`.

The `resolveRemotes()` helper in `src/config/aiwg-config.ts` returns the resolved remote topology with these defaults applied. Skills don't need to re-implement the rule — read it, use it.

```bash
# Default — branch tracks an upstream
git push

# Explicit primary (when not the branch's tracked upstream)
git push <resolved-primary>
```

### Release-time mirroring

When pushing tags as part of a stable release cut, also mirror the tags to every `secondary[]` entry whose `push_on_release` flag is `true`. Example for this repo's topology (`origin` = Gitea primary, `github` = public mirror):

```bash
git push origin --tags          # primary CI / release
git push github --tags          # mirror — only because push_on_release: true
```

Skip secondary remotes that don't have `push_on_release: true`. Don't push branches to mirrors — only tags on stable releases.

**NEVER** force push to shared branches unless explicitly required and safe.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/README.md — aiwg-utils addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Confirmation before destructive git operations
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Correct interpretation of commit message intent
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG versioning and release workflow
