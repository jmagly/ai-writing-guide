# Install, Connect, and Verify AIWG

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
https://raw.githubusercontent.com/jmagly/aiwg/main/setup.aiwg.yaml
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

After installation, use the terminal to move into the project root. If you do
not know how, tell the agent which folder contains your project and ask for the
exact safe command.

## 2. Deploy the complete AIWG system for your provider

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

This is a direct-touch bootstrap command: it installs the complete AIWG
framework/addon surface and writes the provider-facing files the AI session
needs. Before accepting an unexpected file location or permission request, stop
and ask the agent to explain what will be written and whether it stays inside
the project.

## 3. Build the indices and regenerate project context

In the terminal, build the indices and regenerate the provider connection:

```bash
aiwg index build --all
aiwg regenerate --provider <provider>
```

Then ask the current agent:

```text
Run aiwg-regenerate for this existing project if further normalization is
needed. Preserve project-authored instructions and report which provider files
hook into WORKSPACE.md and AIWG.md.
```

If your provider offers slash commands, you can instead type this in the chat:

```text
/aiwg-regenerate
```

Most supported providers can discover the regenerated files and built indices
without ending the current session. Restart or reload only if the verification
step shows that the provider is still using cached startup instructions.
`aiwg-regenerate` should preserve instructions you or your team wrote. Ask to
see a preview if the agent proposes replacing existing content. Legacy “full
injection” is an advanced compatibility mode and is not the normal first-run
choice.

## 4. Verify engagement

Ask:

```text
Is AIWG active in this project? Run or read the status probe and report the
engaged state, project root, deployed provider files, installed frameworks and
addons, and the next action.
```

The agent should explain the result in ordinary language. Success means:

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
- Provider ignores new files after indexing and regeneration: reload or restart
  the provider, then rerun the status probe.
- Regeneration reports conflicts: review the proposed resolution; do not
  overwrite project-authored instructions blindly.

Advanced flags and machine-readable contracts live in the
[agent reference corpus](https://github.com/jmagly/aiwg/tree/main/docs/agents/).
