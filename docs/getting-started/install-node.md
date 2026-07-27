# Install Node.js and npm Safely

AIWG requires Node.js. **npm comes with Node.js**, so most people do not need to
install npm separately. You do not need pnpm to install or use AIWG.

For a new setup, use the current **LTS** release of Node.js. LTS means
“Long-Term Support”: it receives fixes for longer and is the safer default than
the newest experimental/current release. AIWG requires Node.js 20 or newer; the
recommended new-user line is currently Node.js 24 LTS.

## Before installing anything

In the terminal, run:

```bash
node --version
npm --version
```

If both commands show versions and Node is version 20 or newer, you can usually
continue to [Install, Connect, and Verify AIWG](install-connect-verify.md).
Do not replace a working installation merely to match this guide.

If one command fails, or the versions come from different installations, ask
your agent:

```text
Check how Node.js and npm are installed on this computer. Do not change
anything yet. Tell me whether there is an existing installer or version
manager, whether PATH entries conflict, and the safest supported next step for
this operating system.
```

Do not install a second Node version manager on top of an existing one.

## Recommended defaults

| Computer environment | Recommended new-user path |
|---|---|
| macOS | `nvm-sh`, then the current Node.js LTS release |
| Linux | `nvm-sh`, then the current Node.js LTS release |
| Windows Subsystem for Linux (WSL) | `nvm-sh` inside WSL |
| Native Windows (PowerShell/Command Prompt) | `nvm-windows`, then the current Node.js LTS release |

`nvm-sh` and `nvm-windows` have similar names but are different projects. Do
not follow the macOS/Linux instructions in native Windows, and do not install
the Windows version inside WSL.

Use only the official project instructions:

- [nvm-sh for macOS, Linux, and WSL](https://github.com/nvm-sh/nvm)
- [Microsoft's native Windows Node.js guide](https://learn.microsoft.com/windows/dev-environment/javascript/nodejs-on-windows)
- [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases)
- [Node.js download and LTS status](https://nodejs.org/en/download)

Avoid copying an unversioned install command from a blog, video description, or
chat response. Ask the agent to confirm the official domain, current supported
release, and operating system before you approve installation.

## Why not pnpm?

pnpm is a useful package manager for projects that choose it, but it is not an
AIWG prerequisite. Adding it during first-time setup creates another version
and PATH decision without helping the user install AIWG. Use the npm bundled
with Node.js unless the project already declares pnpm in its own
`packageManager` configuration.

## Verify the toolchain

Close and reopen the terminal, then run:

```bash
node --version
npm --version
```

Success means both commands work in a fresh terminal, Node is version 20 or
newer, and neither command reports a missing file or permission error. Then
continue to [Install, Connect, and Verify AIWG](install-connect-verify.md).

## Stop and ask for help when

- the installer requests disabling antivirus or system security;
- instructions tell you to use `sudo npm install -g`;
- `node` and `npm` resolve to different installation folders;
- the terminal still finds an old Node version after a restart;
- you already have Homebrew, asdf, fnm, Volta, nvm, or another manager and the
  proposed fix would add a second one; or
- the computer is managed by an employer or school.

In those cases, ask the agent for a read-only diagnosis and an explanation
before authorizing changes.
