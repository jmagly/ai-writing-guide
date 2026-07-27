---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.node-installation
---

# Node Toolchain Installation

Guide first-time users through a read-only preflight before changing the
machine.

## Policy

- Minimum AIWG runtime: Node.js 20.
- New-user default: current Node.js LTS (Node 24 at the time this policy was
  written), not the Current release.
- npm: use the version bundled with Node.js.
- pnpm: not required; install only when the project explicitly declares it.
- macOS/Linux/WSL: prefer `nvm-sh`.
- native Windows: prefer `nvm-windows`; never describe it as the same software
  as `nvm-sh`.
- Never stack a new manager over Homebrew, asdf, fnm, Volta, nvm, a system
  package, or an enterprise-managed installation without resolving the
  conflict.

## Read-only preflight

Identify the OS and shell, then inspect:

```bash
node --version
npm --version
command -v node
command -v npm
```

On native Windows use `Get-Command node` and `Get-Command npm`. Do not print the
full environment or inspect unrelated credentials.

Report the detected source, version, compatibility, and conflict risk. Ask for
approval before installing, uninstalling, editing shell profiles, changing
PATH, or elevating privileges.

## Supply-chain boundary

Use official Node.js, `nvm-sh`, Microsoft, and `nvm-windows` sources. Resolve a
specific supported release before execution. Do not silently run an unpinned
`curl | sh`, PowerShell pipe-to-execution command, or third-party blog snippet.
On managed machines, stop and defer to organizational policy.

## Verification

Open a fresh terminal and confirm that Node and npm both resolve, Node satisfies
the runtime minimum, paths belong to the selected manager, and a global AIWG
install does not require `sudo`. Translate the result for the user and provide
the next onboarding step.
