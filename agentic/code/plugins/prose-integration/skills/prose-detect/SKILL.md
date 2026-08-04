---
namespace: aiwg
name: prose-detect
description: Locate an existing OpenProse installation via env var, AIWG config, local install, plugin manifest, or global CLI. Returns PROSE_ROOT; triggers prose-install if not found.
version: 0.1.0
platforms: [all]
requires:
  - "nothing: prose-detect is self-contained — reads environment and filesystem only"
ensures:
  - PROSE_ROOT: resolved path to OpenProse skills/open-prose/ directory, validated to contain prose.md and forme.md
  - detection-source: which signal resolved the path (env | aiwg-config | aiwg-local | plugin-manifest | user-home | cli)
  - config-updated: .aiwg/config.json updated with resolved path for future calls
  - "if not found: clear instructions to run /prose-install with suggested install path"
errors:
  - not-found: no valid OpenProse installation detected via any of the 7 signals
invariants:
  - never installs OpenProse silently — detection only; installation requires user confirmation via /prose-install
  - always validates prose.md and forme.md exist at the resolved path before accepting it
  - stale cached paths that fail validation are skipped and detection continues to next signal

---

# Prose Detect Skill

You locate an existing OpenProse installation by checking a priority-ordered list of signals. You return the resolved `PROSE_ROOT` path (pointing to `skills/open-prose/` inside the OpenProse repo), or report that no installation was found and suggest running `/prose-setup`.

All other prose-integration skills call this skill before operating — detection is centralized here so each skill doesn't re-implement discovery independently.

## Triggers

- "detect prose" / "find prose" / "locate openprose"
- "where is prose installed"
- "check if prose is available"
- "prose-detect" (direct invocation from other skills)
- Called automatically by prose-run, prose-reader, prose-validate, forme-manifest before execution

## Detection Protocol

Work through the following signals **in order**. Use the first one that resolves to a valid installation.

### Signal 1: Environment Variable

```bash
# Check PROSE_ROOT or AIWG_PROSE_ROOT
echo "$PROSE_ROOT"
echo "$AIWG_PROSE_ROOT"
```

If set, validate that `$PROSE_ROOT/prose.md` exists. If valid, use this path.

### Signal 2: AIWG Config File

```bash
# Check .aiwg/config.json for saved prose path
cat .aiwg/config.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prose',{}).get('path',''))" 2>/dev/null
```

If `prose.path` is set and `{prose.path}/prose.md` exists, use this path.

### Signal 3: AIWG-Local Install

```bash
# Check if AIWG installed Prose locally
ls ~/.aiwg/prose/skills/open-prose/prose.md 2>/dev/null
```

If exists, `PROSE_ROOT` = `~/.aiwg/prose/skills/open-prose`.

### Signal 4: Project Plugin Manifest

Walk CWD upward looking for `.claude-plugin/plugin.json` with OpenProse entry:

```bash
# Search CWD and ancestors for .claude-plugin/plugin.json
dir="$(pwd)"
while [ "$dir" != "/" ]; do
  if [ -f "$dir/.claude-plugin/plugin.json" ]; then
    # Check if it references open-prose
    python3 -c "
import json, sys
with open('$dir/.claude-plugin/plugin.json') as f:
    d = json.load(f)
# Plugin root is the directory containing .claude-plugin/
if d.get('name') == 'open-prose':
    print('$dir/skills/open-prose')
" 2>/dev/null
    break
  fi
  dir="$(dirname "$dir")"
done
```

If found, use the resolved path.

### Signal 5: User Home Directory

```bash
# Check if user has previously run Prose
ls ~/.prose/agents/ 2>/dev/null
```

If `~/.prose/agents/` exists, `PROSE_ROOT` is likely nearby. Check:

```bash
ls ~/.prose/skills/open-prose/prose.md 2>/dev/null
```

### Signal 6: Global CLI

```bash
# Check for global CLI install
which prose 2>/dev/null
```

If found, use `prose --root` or `prose info` to resolve the installation path.

### Signal 7: Not Found

If no signal resolves to a valid `PROSE_ROOT`, output:

```markdown
## OpenProse Not Found

No OpenProse installation was detected. Checked:
- $PROSE_ROOT / $AIWG_PROSE_ROOT environment variables
- .aiwg/config.json prose.path
- ~/.aiwg/prose/ (AIWG-local install)
- .claude-plugin/plugin.json in CWD and ancestors
- ~/.prose/ (user home)
- `prose` CLI on PATH

To install OpenProse, run:

```bash
/prose-setup
```

Or provide a custom path:

```bash
# Set env var
export PROSE_ROOT=/path/to/prose/skills/open-prose

# Or configure in .aiwg/config.json
{"prose": {"path": "/path/to/prose/skills/open-prose"}}
```
```

Do NOT install silently. Always confirm with the user before running `/prose-setup`.

## Validation

After resolving a candidate path, validate it by checking for required files:

```bash
# Minimum required files
ls "$PROSE_ROOT/prose.md"
ls "$PROSE_ROOT/forme.md"
```

If either file is missing, the path is invalid — continue to the next signal.

## Output

On success, output:

```markdown
## OpenProse Located

**PROSE_ROOT**: /path/to/prose/skills/open-prose
**Detected via**: [signal name — env var | aiwg-config | aiwg-local | plugin-manifest | user-home | cli]
**prose.md**: present
**forme.md**: present

Prose integration skills are ready to use.
```

Also set `PROSE_ROOT` in the session environment if the platform supports it.

## Caching

Once detected, save the resolved path to `.aiwg/config.json` so Signal 2 succeeds on future calls:

```json
{
  "prose": {
    "path": "/resolved/path/to/skills/open-prose",
    "detectedVia": "aiwg-local",
    "lastVerified": "2026-04-02T00:00:00Z"
  }
}
```

Only write the cache if the detection succeeds and the path is validated.

## Model

This skill runs on **Haiku** — it's pure file-system checks and shell commands. No reasoning needed.

## Used By

All prose-integration skills call prose-detect as their first step:
- `/prose-reader`
- `/prose-run`
- `/prose-validate`
- `/forme-manifest`

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Priority-ordered detection chain before deciding installation path
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Never install silently; always confirm before running prose-setup
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG addon configuration
