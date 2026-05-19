# Provider Handoff

Use this page after you know which AI tool you want AIWG to support.

The same local AIWG deployment has to hand off to several different AI tools. Local files can be present even when a provider session still needs a restart, reload, or explicit prompt before it uses them.

We chose a short table because provider breadth is useful only after the beginner has one path. While provider behavior varies, the docs must keep local proof separate from provider-session proof. Do not turn deployment evidence into a stronger claim than it is.

Validation baseline: test this page against AIWG version 2026.5. While the command path is short, maintainers should record any issue that failed inside the first 300s of a provider handoff.

The beginner path stays the same for every provider:

```bash
cd /path/to/your/project
aiwg wizard --dry-run --goal "help me start a project"
aiwg wizard
aiwg status --probe --json
```

The provider-specific part is where you open the AI session and which deployed files the tool is expected to read.

## Pick Your AI Tool

| Tool | Provider flag | Open the session from | Main deployed path | First verification |
|---|---|---|---|---|
| Claude Code | `--provider claude` | Project root | `.claude/` | Ask whether AIWG is active, then run `aiwg status --probe --json`. |
| Codex | `--provider codex` | Project root | `.codex/` and `AGENTS.md` | Restart the Codex session after deploy, then ask for AIWG status. |
| Cursor | `--provider cursor` | Project root in Cursor | `.cursor/` | Ask Cursor to find one AIWG capability for your goal. |
| GitHub Copilot | `--provider copilot` | VS Code workspace root | `.github/` | Ask Copilot Chat from the workspace, then verify with the probe. |
| Factory | `--provider factory` | Project root | `.factory/` and shared context files | Ask for the AIWG first action and verify with the probe. |
| OpenCode | `--provider opencode` | Project root | `.opencode/` and `AGENTS.md` | Ask for one AIWG route, then inspect the recommended capability. |
| Warp | `--provider warp` | Warp session in the project root | `WARP.md` / `.warp/` | Ask the session to route through AIWG, then verify with the probe. |
| Windsurf | `--provider windsurf` | Project root in Windsurf | `.windsurf/` | Ask for an AIWG next action and one fallback. |
| Hermes | `--provider hermes` | Hermes workspace attached to the project | Hermes context plus `AGENTS.md` | Use the provider's AIWG route, then verify project state. |
| OpenClaw | `--provider openclaw` | Project root / OpenClaw workspace | OpenClaw skill and rule paths | Ask for one AIWG capability and verify the deployed project. |

If the wizard detects more than one provider, choose the one you are using now:

```bash
aiwg wizard --provider codex
```

For scripts, make the choice explicit:

```bash
aiwg wizard --non-interactive --profile beginner --provider codex
```

## Honest Validation Status

`aiwg status --probe --json` is the deterministic local verification surface. It checks whether the project has an AIWG workspace, at least one deployed framework, and provider deployment files.

Provider behavior still varies after files are deployed. Some tools reliably read project instructions immediately; others may need a session restart, workspace reload, or manual prompt. Until a provider path has fresh session evidence, describe that behavior as "expected" or "deployment-verified" instead of guaranteed.

Current audit baseline: 10/10 providers have structural coverage in the matrix, 50/50 cells have at least deployment-scripted evidence, and the remaining challenge is reaching the >=8/10 field-validated provider threshold.

## Good First Prompt

After deployment, ask:

```text
Is AIWG active in this project? Run or read aiwg status --probe --json, then tell me the engaged state, project root, provider files, installed frameworks, and one next action.
```

If the answer becomes a catalog, narrow it:

```text
Recommend one AIWG path for this project, one reason, and one fallback.
```

## Related

- [Start Here](start-here.md)
- [Verify AIWG Is Working](verify-aiwg-is-working.md)
- [Scope And Recovery](scope-and-recovery.md)
