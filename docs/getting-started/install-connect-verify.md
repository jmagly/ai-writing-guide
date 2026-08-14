# Install, Connect, and Verify AIWG

> Need secure long-running agents? Use the [AIWG Cockpit + Agentic Sandbox
> installer](https://aiwg.io/agentic-sandbox/setup.aiwg.yaml).
> It audits the host, installs approved container or VM prerequisites, connects
> Cockpit to the self-hosted executor, and verifies the control and audit path.

This is the preferred first-run path for every supported provider.

You do not need to know how AIWG works internally. This guide distinguishes
between two places where you act:

- **Terminal:** the app where you type installation commands. It may be called
  Terminal, PowerShell, Command Prompt, a shell, or an integrated terminal.
- **Agent conversation:** the chat in Claude Code, Codex, Cursor, Copilot, or
  another AI tool. This is where you ask the agent to tailor and use AIWG.

Your **project root** is the main folder for the project—the folder that usually
contains files such as `README.md`, `package.json`, or `.git`. If you are not
sure which folder that is, ask your agent to identify it before continuing.

## Easiest path: ask your agent to install or repair AIWG

Paste this prompt into a supported provider:

```text
Install or repair AIWG for this project by following
https://aiwg.io/setup.aiwg.yaml
Explain the plan before changing anything, preserve my existing work, and ask
me only for choices you cannot safely determine.
```

The linked installer inspects first. It can recognize a healthy install, an
older or broken install, duplicate commands, and an intentional source-checkout
development setup. It explains proposed changes before making them. If you are
using a development checkout, it keeps that mode by default and offers either a
safe repository update or an explicit switch to the published package.

Continue below if you prefer to type the setup commands yourself.

## 1. Install AIWG

AIWG uses Node.js and its bundled npm installer. If either `node --version` or
`npm --version` does not work, first follow [Install Node.js and npm
Safely](install-node.md).

If your AI tool does not already bundle AIWG, install AIWG once:

```bash
npm install -g aiwg
```

Type this in the terminal, not in the agent chat. It installs the `aiwg`
command for your user account. If the terminal reports a permission error, do
not use an unfamiliar administrator or `sudo` command copied from the web; use
the [macOS install guide](macos-install.md) or ask your agent for a safe
platform-specific installation path.

## 2. Change into the project root

Use the terminal to move into the folder you want AIWG to configure:

```bash
cd /path/to/your/project
```

If you do not know the path, tell the agent which folder contains your project
and ask for the exact safe command.

## 3. Deploy and verify the complete AIWG system

The **provider** is the AI tool you will use with AIWG. The preferred default is
`all`, which installs AIWG's complete set of frameworks and supporting
capabilities rather than making you choose pieces before you understand them.

In the terminal, replace `<provider>` with the provider name from the table:

```bash
aiwg use all --provider <provider>
```

| If you use | Provider name |
|---|---|
| Claude Code | `claude` |
| OpenAI Codex | `codex` |
| GitHub Copilot | `copilot` |
| Cursor | `cursor` |
| Factory | `factory` |
| OpenCode | `opencode` |
| Warp | `warp` |
| Windsurf | `windsurf` |
| OpenClaw | `openclaw` |
| Hermes | `hermes` |
| OpenHuman | `openhuman` |

For example, a Codex user types:

```bash
aiwg use all --provider codex
```

This one command installs the complete framework/addon surface, refreshes its
capability indices, generates canonical project context and provider adapters,
then verifies the result. It reports `ready`, `ready-restart-required`,
`degraded`, or `failed` with the exact next action. Do not run index,
regenerate, status, or doctor as extra required setup steps.

Before accepting an unexpected file location or permission request, stop and
ask the agent to explain what will be written and whether it stays inside the
project. After a successful result, ask:

```text
Is AIWG active in this project? Run or read the status probe and report the
engaged state, project root, deployed provider files, installed frameworks and
addons, and the next action.
```

The agent can read the same deployment evidence and explain it in ordinary
language. Success means:

- the reported project folder is the one you intended;
- the provider name matches the AI tool you opened;
- the complete `all` deployment is installed;
- the provider's context points to `WORKSPACE.md` and `AIWG.md`; and
- the agent gives you one sensible next action.

If any item is wrong, do not continue into project work. Use the recovery list
below or ask the agent to explain the mismatch first.

## Recovery

- Wrong project: stop and reopen the provider from the intended project root.
- Missing provider files: rerun the `all` deployment with the correct provider.
- Provider reports `ready-restart-required`: reload or restart it once, then
  continue in the project.
- Context generation reports conflicts: review the proposed resolution; do not
  overwrite project-authored instructions blindly.

The standalone index, regenerate, status-probe, and doctor commands are still
supported for independent audits and recovery. Advanced flags and their
machine-readable contracts live in the [agent reference
corpus](https://github.com/jmagly/aiwg/tree/main/docs/agents/).
