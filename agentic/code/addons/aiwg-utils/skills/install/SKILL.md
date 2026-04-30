---
namespace: aiwg
name: install
platforms: [all]
description: Install AIWG-compatible packages from remote Git repositories into the current workspace
---

# AIWG Install

You install AIWG-compatible packages from remote Git repositories into the current workspace.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "grab the package from github" → install from Git URL
- "pull in owner/repo" → install using shorthand ref
- "add a community addon" → install remote package
- "install from that repo" → install from Git URL

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Install by URL | "install from https://github.com/org/pkg" | Run `aiwg install https://github.com/org/pkg` |
| Install by shorthand | "install owner/repo" | Run `aiwg install owner/repo` |
| Install with branch | "install owner/repo at main" | Run `aiwg install owner/repo#main` |

## Behavior

When triggered:

1. **Extract intent**:
   - What is the Git reference? Accept a full HTTPS URL or an `owner/repo` shorthand (resolved against github.com by default).
   - Is a specific branch, tag, or commit hash mentioned? Append as `#ref`.

2. **Resolve the reference**:

   | Input form | Example | Resolved |
   |------------|---------|----------|
   | Full URL | `https://github.com/org/pkg` | used as-is |
   | Shorthand | `org/pkg` | `https://github.com/org/pkg` |
   | Shorthand + ref | `org/pkg#v1.2.0` | `https://github.com/org/pkg#v1.2.0` |

3. **Run the command**:

   ```bash
   # Install by full URL
   aiwg install https://github.com/owner/aiwg-package

   # Install by shorthand (github.com assumed)
   aiwg install owner/aiwg-package

   # Install a specific branch or tag
   aiwg install owner/aiwg-package#v2.0.0
   ```

4. **Report the result** inline — confirm the package name, version, and where its artifacts were deployed. Warn if the source does not appear to be a valid AIWG package.

## Examples

### Example 1: Install from a full GitHub URL

**User**: "install this addon from git: https://github.com/acme/aiwg-devtools"

**Extraction**: Full URL `https://github.com/acme/aiwg-devtools`

**Action**:
```bash
aiwg install https://github.com/acme/aiwg-devtools
```

**Response**: "Installed aiwg-devtools (v1.3.0) from https://github.com/acme/aiwg-devtools. Artifacts deployed to `.claude/`. Registered in packages registry."

### Example 2: Install using owner/repo shorthand

**User**: "install acme/aiwg-devtools"

**Extraction**: Shorthand `acme/aiwg-devtools`, resolved to `https://github.com/acme/aiwg-devtools`

**Action**:
```bash
aiwg install acme/aiwg-devtools
```

**Response**: "Installed aiwg-devtools (v1.3.0) from https://github.com/acme/aiwg-devtools. Artifacts deployed to `.claude/`. Registered in packages registry."

### Example 3: Install a specific version tag

**User**: "install acme/aiwg-devtools at v1.2.0"

**Extraction**: Shorthand `acme/aiwg-devtools`, ref `v1.2.0`

**Action**:
```bash
aiwg install acme/aiwg-devtools#v1.2.0
```

**Response**: "Installed aiwg-devtools (v1.2.0) from https://github.com/acme/aiwg-devtools at tag v1.2.0. Artifacts deployed to `.claude/`."

## Clarification Prompts

If the user's intent is ambiguous:

- "What is the Git URL or owner/repo shorthand for the package you want to install?"
- "Should I install the latest commit on the default branch, or a specific tag or branch?"

## References

- @$AIWG_ROOT/src/cli/handlers/install.ts — Install command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
