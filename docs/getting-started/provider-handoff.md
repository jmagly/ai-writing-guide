# Provider Handoff

Use this page after you know which AI tool you want AIWG to support.

The same local AIWG deployment has to hand off to several different AI tools. Local files can be present even when a provider session still needs a restart, reload, or explicit prompt before it uses them.

We chose a short table because provider breadth is useful only after the beginner has one path. While provider behavior varies, the docs must keep local proof separate from provider-session proof. Do not turn deployment evidence into a stronger claim than it is.

Validation baseline: test this page against AIWG version 2026.5. While the command path is short, maintainers should record any issue that failed inside the first 300s of a provider handoff.

The beginner path stays the same for every provider: install AIWG, deploy
`all` with that provider’s name, reopen the provider in the project root,
invoke `/aiwg-regenerate`, and ask the agent to report verification evidence.
See [Install, Connect, and Verify](install-connect-verify.md).

For a full zero-to-running install path that agents can follow directly, see
the [Agentic Install Runbook](../agentic-install-runbook.md).

The provider-specific part is where you open the AI session and which deployed files the tool is expected to read.

## Pick Your AI Tool

| Tool | Provider flag | Open the session from | Main deployed path | First verification |
|---|---|---|---|---|
| Claude Code | Claude | Project root | `.claude/` | Ask whether AIWG is active and request the probe evidence. |
| Codex | `--provider codex` | Project root | `.codex/` and `AGENTS.md` | Restart the Codex session after deploy, then ask for AIWG status. |
| Cursor | `--provider cursor` | Project root in Cursor | `.cursor/` | Ask Cursor to find one AIWG capability for your goal. |
| GitHub Copilot | Copilot | VS Code workspace root | `.github/` | Ask Copilot Chat from the workspace, then request probe evidence. |
| Factory | `--provider factory` | Project root | `.factory/` and shared context files | Ask for the AIWG first action and verify with the probe. |
| OpenCode | `--provider opencode` | Project root | `.opencode/` and `AGENTS.md` | Ask for one AIWG route, then inspect the recommended capability. |
| Warp | `--provider warp` | Warp session in the project root | `WARP.md` / `.warp/` | Ask the session to route through AIWG, then verify with the probe. |
| Devin Desktop | `--provider devin` | Project root in Devin Desktop | `.windsurf/` compatibility paths | Ask for an AIWG next action and one fallback. |
| Hermes | `--provider hermes` | Hermes workspace attached to the project | Hermes context plus `AGENTS.md` | Use the provider's AIWG route, then verify project state. |
| OpenClaw | `--provider openclaw` | Project root / OpenClaw workspace | OpenClaw skill and rule paths | Ask for one AIWG capability and verify the deployed project. |

If the agent detects more than one provider, tell it which tool you are using
now. The agent-facing corpus documents the provider flags and non-interactive
automation contract.

## Honest Validation Status

The agent uses AIWG's deterministic status probe to check whether the project
has a workspace, at least one deployed framework, and provider deployment
files. It should translate that evidence rather than asking you to interpret
raw JSON.

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
- [Agentic Install Runbook](../agentic-install-runbook.md)
- [Verify AIWG Is Working](verify-aiwg-is-working.md)
- [Scope And Recovery](scope-and-recovery.md)
