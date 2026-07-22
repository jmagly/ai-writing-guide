# Agentic Install Runbook

Use this runbook when an agent or steward needs to take a machine or project
from zero to a working AIWG session. The human-facing path is short: install
AIWG, deploy the right artifacts, open the chosen agentic platform, and ask the
steward to verify setup. Most AIWG CLI commands are tools for the agent to call
inside the session, not commands the user has to learn.

## Choose The Setup Scope

Use **project-local setup** for a repository, product, investigation, campaign,
or research corpus. This is the default and keeps project context isolated.

Use **global/user-scope setup** when the user wants the same AIWG agent surface
available across many workspaces. This is useful for personal defaults and for
providers whose primary artifact location is under the user's home directory,
but it can make unrelated projects share more context than expected.

If the user is unsure, choose project-local setup first.

## Prerequisites

AIWG requires Node.js 20 or newer. New installs should use the current LTS Node
line through a version manager such as `nvm`, especially on macOS.

```bash
node --version
npm --version
```

If Node or npm is missing, install them before continuing. On macOS, use the
[macOS Install Guide](getting-started/macos-install.md) when npm global installs
fail with `EACCES`.

## Install AIWG

Install AIWG once for the user:

```bash
npm install -g aiwg
aiwg --version
```

If `aiwg` is not on `PATH`, use npm's global prefix to find the binary:

```bash
npm config get prefix
"$(npm config get prefix)/bin/aiwg" --version
```

In automation or fresh shells where PATH may be unreliable, use `npx`:

```bash
npx aiwg --version
```

## Project-Local Setup

Run these commands from the project root:

```bash
cd /path/to/project
aiwg use sdlc --provider claude
aiwg status --probe --json
aiwg doctor
```

Replace the provider when the user is not using Claude Code:

```bash
aiwg use sdlc --provider codex
aiwg use sdlc --provider cursor
aiwg use sdlc --provider copilot
aiwg use sdlc --provider factory
aiwg use sdlc --provider opencode
aiwg use sdlc --provider warp
aiwg use sdlc --provider windsurf
aiwg use sdlc --provider hermes
aiwg use sdlc --provider openclaw
```

For guided setup, use the wizard instead of choosing the framework and provider
manually:

```bash
cd /path/to/project
aiwg wizard --dry-run --goal "help me set up AIWG for this project"
aiwg wizard
aiwg status --probe --json
```

## Global Or User-Scope Setup

Use `--global` when the user wants provider-native AIWG assets across many
workspaces without a full deployment in every project:

```bash
cd /path/to/current/project
aiwg use sdlc --provider claude --global
aiwg doctor --scope user
```

This installs framework and base kernel assets at user scope, then writes only
the lightweight `WORKSPACE.md`/`AIWG.md`/provider bootstrap files in the
current project. In additional projects, run
`aiwg regenerate --provider <name>` to create those context-only hooks.

Use `--scope user` instead when an additive project deployment is intentional:

```bash
aiwg use sdlc --provider claude --scope user
```

Consult the provider matrix before using `--global`; providers without a
filesystem-discovered user scope still need their documented project adapter.

For non-interactive provisioning, target a project directory explicitly:

```bash
npx aiwg use sdlc --provider claude --prefix /path/to/project
npx aiwg doctor --prefix /path/to/project
```

Use the non-interactive guide for cloud-init, Docker, and CI examples:
[Non-Interactive Installation](/install/non-interactive).

## Provider Handoff

After deployment, open the chosen agentic platform in the project or workspace
that was just configured. Then ask:

```text
Check that AIWG is installed correctly and tell me what I can do here.
Read aiwg status --probe, report the engaged state, project root, provider
files, deployed frameworks, and one recommended next action.
```

Provider notes:

| Provider | Open after deploy | First check |
|---|---|---|
| Claude Code | Restart Claude Code in the project root | Ask the steward to verify AIWG status |
| Codex | Restart Codex in the project root | Ask for AIWG status and one next action |
| Cursor | Open the project in Cursor | Ask Cursor to verify AIWG is active |
| Copilot | Open the VS Code workspace | Ask Copilot Chat for AIWG status |
| Factory | Start Factory from the project root | Ask for the AIWG first action |
| OpenCode | Open OpenCode in the project root | Ask for one AIWG route |
| Warp | Start Warp in the project root | Ask the session to route through AIWG |
| Windsurf | Open the project in Windsurf | Ask Cascade to verify AIWG status |
| Hermes | Open a Hermes chat attached to the project | Ask for the AIWG route |
| OpenClaw | Open OpenClaw with the workspace | Ask for one AIWG capability and verify deployment |

Use `aiwg-regenerate` from inside the session when provider context files need
to be rebuilt. Use `aiwg doctor` as the direct diagnostic escape hatch.

## Verification

The local proof command is:

```bash
aiwg status --probe --json
```

The health check is:

```bash
aiwg doctor
```

Treat the status probe as the evidence for local deployment state. Provider
sessions may still need a restart or reload before they read newly deployed
files.

Common health-check outcomes:

| Symptom | What to do |
|---|---|
| `aiwg` not found | Add npm's global `bin` directory to PATH or use `npx aiwg` |
| No provider artifacts | Run `aiwg use sdlc --provider <provider>` from the project root |
| Wrong project root | `cd` to the intended repository and rerun the setup |
| Stale provider session | Restart or reload the agentic platform |
| Generated context is stale | Ask the session to run `aiwg-regenerate` |
| Doctor reports repairable drift | Ask the steward to explain the failing check and propose the smallest fix |

## What Not To Teach As The Default

Do not make normal users memorize `aiwg discover`, `aiwg show`, agent-loop
commands, or framework-specific direct commands as the post-install path. Those
remain available to agents and advanced operators, but the expected onboarding
flow is platform-first and steward-first.

## Related Guides

- [Start Here](getting-started/start-here.md)
- [Provider Handoff](getting-started/provider-handoff.md)
- [Verify AIWG Is Working](getting-started/verify-aiwg-is-working.md)
- [macOS Install Guide](getting-started/macos-install.md)
- [Non-Interactive Installation](/install/non-interactive)
