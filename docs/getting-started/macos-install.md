# macOS Install Guide

Use this guide when installing AIWG on a Mac, especially if `npm install -g aiwg`
fails with `EACCES` under `/usr/local/lib/node_modules`.

For the complete agent/steward setup path after the Mac install succeeds, see
the [Agentic Install Runbook](../agentic-install-runbook.md).

Verified against the npm and Node.js documentation on 2026-06-02:

- npm recommends installing Node.js and npm with a Node version manager such as
  `nvm` because installer-managed global directories can cause permission errors:
  <https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/>
- npm's current `EACCES` recovery guide recommends either using a Node version
  manager or changing npm's global prefix to a user-owned directory:
  <https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/>
- The Node.js download page lists Node 24 as the current LTS line on
  2026-06-02. AIWG supports Node 20 or newer; new installs should use Node 24:
  <https://nodejs.org/en/download>

## Recommended Path: nvm

This avoids root-owned global npm directories and works on both Intel and Apple
Silicon Macs.

```bash
# Install nvm. Check https://github.com/nvm-sh/nvm for the newest command.
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# Load nvm in the current zsh session.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install current LTS Node.js and AIWG.
nvm install 24
nvm use 24
npm install -g aiwg

# Verify.
node --version
npm --version
aiwg --version
```

If `nvm: command not found` appears after the install script, open a new terminal
or run:

```bash
source ~/.zshrc
```

If `~/.zshrc` does not exist, create it and rerun the nvm installer:

```bash
touch ~/.zshrc
```

## If Node Is Already Installed and npm Fails With EACCES

This error means npm is trying to write global packages into a directory your
user does not own, commonly `/usr/local/lib/node_modules`.

```text
npm ERR! code EACCES
npm ERR! syscall mkdir
npm ERR! path /usr/local/lib/node_modules/aiwg
```

Use npm's current user-prefix recovery:

```bash
npm config set prefix ~/.local
echo 'PATH="$HOME/.local/bin:$PATH"' >> ~/.profile
echo 'source ~/.profile' >> ~/.zprofile
source ~/.profile

npm install -g aiwg
aiwg --version
```

Do not use `sudo npm install -g aiwg` as the default fix. It may install AIWG
once, but it can leave root-owned npm files that cause later upgrades and global
package installs to fail.

## Homebrew Path

Homebrew is acceptable if the Homebrew prefix is user-writable and first in
`PATH`. It is most useful for users who already manage developer tools with
Homebrew.

```bash
brew install node@24
brew link --overwrite node@24
npm install -g aiwg
aiwg --version
```

If Homebrew Node still sends npm global installs to `/usr/local/lib/node_modules`
and fails with `EACCES`, use the `~/.local` npm prefix recovery above or switch
to `nvm`.

## Optional native features (Xcode Command Line Tools)

AIWG's **base install never needs build tools** — its native dependencies
(`better-sqlite3`, `node-pty`, `hnswlib-node`) are `optionalDependencies` that
ship prebuilt macOS binaries and are skipped silently if they can't install. The
CLI, `aiwg use`, and all the text-based tooling work without them.

A few **opt-in** features use native modules: the SQLite graph backend
(`better-sqlite3`), semantic search / embeddings (`@xenova/transformers` +
`onnxruntime-node`, installed on demand), and PDF page rasterization for
vision extraction (poppler `pdftoppm`). These normally use prebuilt binaries on
Mac. If one ever fails to build (an unusual Node version, or a module without a
matching prebuilt), install Apple's Command Line Tools and retry:

```bash
xcode-select --install        # one-time; provides the C/C++ toolchain
npm rebuild better-sqlite3     # or re-run the opt-in install that failed
```

For PDF rasterization specifically (`aiwg corpus vision-extract --rasterize`),
install poppler via Homebrew:

```bash
brew install poppler
```

## After AIWG Installs

Deploy AIWG from the project root:

```bash
cd /path/to/your/project
aiwg use sdlc
aiwg doctor
```

If `npm install -g aiwg` succeeds but `aiwg` is not found, check npm's global
binary directory:

```bash
npm config get prefix
echo "$PATH"
```

The `bin` directory under the npm prefix must be in `PATH`. For the `~/.local`
prefix, that means:

```bash
echo 'PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```
