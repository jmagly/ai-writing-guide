---
namespace: aiwg
name: version
platforms: [all]
description: Display the current AIWG version, release channel, and installation path

---

# AIWG Version

You display the current AIWG version, release channel, and installation path.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what version of aiwg is installed" → run `aiwg version`
- "which channel am I on" → run `aiwg version`
- "aiwg version info" → run `aiwg version`
- "is this stable or edge" → run `aiwg version`

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Version query | "what version is this" | Run `aiwg version` |
| Channel query | "which channel am I on" | Run `aiwg version` |
| Install info | "where is aiwg installed" | Run `aiwg version` |
| Currency check | "is this the latest version" | Run `aiwg version`, then `aiwg sync --dry-run` |
| Build info | "show version and build" | Run `aiwg version` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is the user asking for the version number only, or do they also want channel and path info?
   - Are they asking whether this is the latest version? If so, follow up with a sync dry-run.

2. **Run the appropriate command**:

   ```bash
   # Show version, channel, and installation path
   aiwg version
   ```

   Output includes:
   - Version string in CalVer format (`YYYY.M.PATCH`)
   - Channel label: `stable`, `next`, `nightly`, or `dev`
   - For edge/dev channels: git hash, branch, and edge path
   - For stable/npm channels: package root path

3. **Report the result** inline — state the version and channel clearly. If the user asked whether it is current, offer to run `aiwg sync --dry-run`.

## Examples

### Example 1: Simple version check

**User**: "What version of AIWG is installed?"

**Extraction**: Version number requested

**Action**:
```bash
aiwg version
```

**Response**: "AIWG v2026.3.15 on the stable channel, installed at `/usr/local/lib/node_modules/aiwg`."

### Example 2: Channel inquiry

**User**: "Am I on stable or edge?"

**Extraction**: Channel info requested

**Action**:
```bash
aiwg version
```

**Response**: "You are on the stable channel (v2026.3.15). The edge channel points at a local git checkout and is used for development."

### Example 3: Currency check

**User**: "Is this the latest version of AIWG?"

**Extraction**: User wants to know if they are up to date — version check plus update check

**Action**:
```bash
aiwg version
aiwg sync --dry-run
```

**Response**: "You are on v2026.3.15 (stable). The sync check shows no updates available — you are current."

### Example 4: Dev/edge channel

**User**: "show version"

**Extraction**: Full version info requested, dev install detected

**Action**:
```bash
aiwg version
```

**Response**: "AIWG v2026.3.15-dev on the dev channel. Git: `a3f91bc` on branch `feat/new-skill`. Path: `/home/user/aiwg`."

## References

- @$AIWG_ROOT/src/cli/handlers/version.ts — Version command handler
- @$AIWG_ROOT/src/channel/manager.mjs — Channel and version resolution logic
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/docs/contributing/versioning.md — CalVer format details
