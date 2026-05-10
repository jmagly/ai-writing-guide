---
namespace: aiwg
name: aiwg-status
platforms: [all]
kernel: true
description: Display workspace status dashboard showing installed frameworks, deployments, artifact counts, and health indicators
---

# Status

You display a comprehensive workspace status dashboard: installed frameworks and addons with versions, deployed provider directories, `.aiwg/` artifact counts by subdirectory, last sync time, and overall health indicators.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what's installed" → framework/addon inventory
- "how is my workspace" → health summary
- "aiwg status" → full dashboard
- "show me what's deployed" → provider deployment summary

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Full status | "show workspace status" | Run `aiwg status` |
| Quick health | "is my workspace healthy?" | Run `aiwg status` |
| Framework inventory | "what frameworks are installed?" | Run `aiwg status` |
| Artifact counts | "how many requirements do I have?" | Run `aiwg status` |
| Deployment check | "what's deployed to copilot?" | Run `aiwg status` |

## Behavior

When triggered:

1. **Distinguish from `doctor`**:
   - `status` is a **read-only summary** — it reports current state without running active checks or attempting repairs.
   - `doctor` runs active health checks and can suggest or apply fixes.
   - When users ask "is something wrong?", prefer `doctor`. When they ask "what do I have?", prefer `status`.

2. **Run the command**:

   ```bash
   # Full status dashboard
   aiwg status
   ```

3. **What the dashboard shows**:
   - Installed frameworks and addons (name, version, install date)
   - Deployed provider directories (e.g., `.claude/`, `.github/`, `.cursor/`)
   - `.aiwg/` artifact counts per subdirectory (`requirements/`: 4 files, `architecture/`: 2 files, etc.)
   - Last sync timestamp
   - Overall health indicator (OK / WARN / ERROR)

4. **Report the result** — present the dashboard output inline; highlight any WARN or ERROR indicators.

## Examples

### Example 1: Full workspace status

**User**: "Show me the workspace status"

**Extraction**: Full status request

**Action**:
```bash
aiwg status
```

**Response**:
```
AIWG Workspace Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frameworks & Addons
  sdlc-complete       v2026.3.15   installed 2026-03-20
  aiwg-utils          v2026.3.15   installed 2026-03-20
  voice-framework     v2026.3.15   installed 2026-03-20

Provider Deployments
  claude-code         .claude/          agents: 58   commands: 42
  copilot             .github/          agents: 58   prompts: 42

.aiwg/ Artifacts
  intake/             2 files
  requirements/       7 files
  architecture/       3 files
  planning/           2 files
  risks/              1 file
  testing/            4 files
  security/           1 file
  deployment/         0 files
  working/            5 files (temporary)
  reports/            2 files

Last sync: 2026-03-28 14:32 UTC
Health: OK
```

### Example 2: Degraded state

**User**: "How is my workspace?"

**Extraction**: Health summary request

**Action**:
```bash
aiwg status
```

**Response**: Reports status dashboard as above, but with `Health: WARN — sdlc-complete may be outdated (last sync 8 days ago). Run \`aiwg sync --dry-run\` to check.`

### Example 3: Artifact inventory question

**User**: "How many requirements files do I have?"

**Extraction**: Artifact count question; `status` provides this summary

**Action**:
```bash
aiwg status
```

**Response**: Points to the `.aiwg/ Artifacts` section of the output: "You have 7 files in `requirements/`."

### Example 4: After a fresh install

**User**: "What's installed?"

**Extraction**: Framework inventory request

**Action**:
```bash
aiwg status
```

**Response**: Shows the Frameworks & Addons section. If nothing is installed yet: "No frameworks installed. Run `aiwg use sdlc` to deploy the SDLC framework."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you looking for a quick summary (`aiwg status`) or a full health check with active diagnostics (`aiwg doctor`)?"

## References

- @$AIWG_ROOT/src/cli/handlers/workspace.ts — `status` command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/workspace-health/SKILL.md — Active workspace health checks
