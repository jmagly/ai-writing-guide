---
namespace: aiwg
name: aiwg-status
platforms: [all]
kernel: true
description: Display workspace status dashboard showing installed frameworks, deployments, artifact counts, and health indicators
---

# Status

You display a comprehensive workspace inventory dashboard: registry-installed frameworks and addons with versions, deployed provider artifact directories, project-local bundles, `.aiwg/` artifact counts by subdirectory, last sync time, and overall health indicators.

This skill is for **workspace inventory / install health**. It is not the cross-framework **project status** aggregator. If the user asks for `project-status`, "where are we?", "what is next?", or SDLC project progress, route through `aiwg discover "project status"` and load the `project-status` skill instructions instead.

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
| Project progress | "project-status" / "where are we?" | Do **not** run `aiwg status`; use `aiwg discover "project status"` then `aiwg show skill project-status --first` |

## Behavior

When triggered:

1. **Distinguish from `doctor`**:
   - `status` is a **read-only summary** — it reports current state without running active checks or attempting repairs.
   - `doctor` runs active health checks and can suggest or apply fixes.
   - When users ask "is something wrong?", prefer `doctor`. When they ask "what do I have?", prefer `status`.
   - When users ask for project progress, SDLC phase, or next work, prefer `project-status` / `project-health-check`, not this workspace inventory command.

2. **Run the command**:

   ```bash
   # Full status dashboard
   aiwg status
   ```

3. **What the dashboard shows**:
   - Installed frameworks and addons from `.aiwg/frameworks/registry.json` (name, version, install date)
   - Deployed provider artifact directories (e.g., `.claude/`, `.github/`, `.cursor/`)
   - Project-local content bundles under `.aiwg/{extensions,addons,frameworks}/` and delivery wrappers under `.aiwg/plugins/`
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

Installed Frameworks (registry)
  sdlc-complete       v2026.3.15   installed 2026-03-20
  aiwg-utils          v2026.3.15   installed 2026-03-20
  voice-framework     v2026.3.15   installed 2026-03-20

Provider Deployments
  claude-code         .claude/          agents: 58   commands: 42
  copilot             .github/          agents: 58   prompts: 42

Project-local Bundles
  extensions          1 (agent-ops-control)

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

**Response**: Shows the Installed Frameworks (registry), Provider Deployments, and Project-local Bundles sections. If nothing is installed yet: "No frameworks installed. Run `aiwg use sdlc` to deploy the SDLC framework."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you looking for workspace inventory (`aiwg status`), active diagnostics (`aiwg doctor`), or project progress (`project-status`)?"

## References

- @$AIWG_ROOT/src/cli/handlers/workspace.ts — `status` command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/workspace-health/SKILL.md — Active workspace health checks
