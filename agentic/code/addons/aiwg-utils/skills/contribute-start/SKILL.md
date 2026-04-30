---
namespace: aiwg
name: contribute-start
platforms: [all]
description: Initialize an AIWG contribution workflow by creating a feature branch, configuring DCO, and linking a tracking issue
---

# Contribute Start

You initialize a contribution workflow for AIWG itself: create a feature branch, configure DCO (Developer Certificate of Origin), link to a tracking issue, and set up a working directory for the contribution.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "I want to add a feature to AIWG" → init contribution for new feature
- "set up my branch for this fix" → init contribution for bug fix
- "how do I contribute?" → explain contribution flow and offer to initialize
- "start a PR" → initialize contribution and set up branch

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Contribute start | "contribute start" | Run `aiwg contribute-start` |
| New contribution | "new contribution" | Run `aiwg contribute-start` |
| Init contribution | "init contribution" | Run `aiwg contribute-start` |
| Start contributing | "start contributing to aiwg" | Run `aiwg contribute-start` |
| With issue | "start contribution for issue #42" | Run `aiwg contribute-start --issue 42` |
| With description | "start a contribution for adding voice support" | Run `aiwg contribute-start --description "adding voice support"` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is there an issue number to link? (e.g., "for issue #42")
   - Is there a description to use for the branch name?
   - What type of contribution: feature, fix, docs, refactor?

2. **Run the appropriate command**:

   ```bash
   # Default: interactive contribution initialization
   aiwg contribute-start

   # Link to a specific tracking issue
   aiwg contribute-start --issue 42

   # With branch description (slugified automatically)
   aiwg contribute-start --description "add voice support to deploy command"

   # Specify contribution type
   aiwg contribute-start --type feat
   aiwg contribute-start --type fix
   aiwg contribute-start --type docs
   ```

3. **Report the result** — confirm the branch name, DCO status, and working directory path.

## What Gets Set Up

| Step | What Happens |
|------|-------------|
| Branch creation | `feat/<slug>` or `fix/<slug>` branch created from latest `main` |
| DCO config | `.git/hooks/commit-msg` DCO hook installed if not present |
| Working directory | `.aiwg/working/contributions/<branch-name>/` created for drafts |
| Issue link | Branch description references issue number if provided |
| Contribution notes | `CONTRIBUTING.md` read and summarized for context |

## DCO Note

AIWG contributions require a Developer Certificate of Origin sign-off on each commit:

```
Signed-off-by: Your Name <your@email.com>
```

The `contribute-start` command installs a commit-msg hook that reminds you to include this. Pass `-s` to `git commit` to sign off automatically.

## Examples

### Example 1: Starting a feature contribution

**User**: "Start a contribution — I want to add cost tracking to the ralph command"

**Extraction**: Feature contribution, description provided

**Action**:
```bash
aiwg contribute-start --type feat --description "add cost tracking to ralph command"
```

**Response**: "Contribution initialized. Branch: `feat/add-cost-tracking-to-ralph-command`. DCO hook installed. Working directory: `.aiwg/working/contributions/feat-add-cost-tracking-to-ralph-command/`. Sign your commits with `git commit -s`."

### Example 2: Contribution linked to an issue

**User**: "Start contribution for issue #312"

**Extraction**: Linked to issue 312

**Action**:
```bash
aiwg contribute-start --issue 312
```

**Response**: "Contribution initialized. Branch: `feat/issue-312`. Working directory created. Issue #312 linked in branch description."

### Example 3: Bug fix contribution

**User**: "I'm going to fix the install-plugin path bug, set up my branch"

**Extraction**: Fix type, description from context

**Action**:
```bash
aiwg contribute-start --type fix --description "install-plugin path bug"
```

**Response**: "Contribution initialized. Branch: `fix/install-plugin-path-bug`. DCO hook installed. Ready to commit."

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/docs/contributing/ — Contribution guidelines
