---
namespace: aiwg
name: setup-generate
platforms: [all]
description: "Generate a `setup.manifest.yaml` file for a project using the `setup.aiwg.io/v1`"
---

# setup-generate

Generate a `setup.manifest.yaml` file for a project using the `setup.aiwg.io/v1` SetupManifest language.

## Trigger Phrases

- "generate a setup manifest for [project]"
- "create installer for [project]"
- "scaffold setup manifest"
- "write a setup.manifest.yaml for [directory]"
- "generate install workflow for [project]"
- "generate dev installer for [project]"

## Parameters

### project-dir (positional, optional)
Path to the project root. Defaults to `.`.

### --output (optional)
Manifest path to create. Default: `./setup.manifest.yaml`.

### --name (optional)
Manifest `metadata.name`. Default: package name or project directory name.

### --type (optional)
Install type: `user`, `developer`, or `ci`. Default: `developer`.

### --platform (optional)
Target platform: `linux`, `macos`, `windows`, or `docker`.

### --force (optional)
Overwrite existing generated manifest/script files.

### --type (optional)
Install type to generate: `user`, `developer`, or `ci`.
Default: `user`.

- `user` — production/end-user deployment (default, behavior unchanged from previous versions)
- `developer` — local development environment standup with OS configuration
- `ci` — headless pipeline setup

When `--type developer`, output filename is `setup.dev.manifest.yaml`. When `--type user`, output is `setup.user.manifest.yaml` (or `setup.manifest.yaml` if no type is specified for backwards compatibility).

### --interactive (optional)
Ask clarifying questions before generating.

## Execution Flow

### Phase 1: Discovery

1. Read the project root to understand structure:
   - Check for `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Makefile`, etc.
   - Check for `README.md`, `INSTALL.md`, `docs/install.md`
   - Check for existing `setup.manifest.yaml`
2. Parse local project cues when they are available; the CLI entrypoint emits
   a conservative starter manifest and leaves richer project-specific authoring
   to the agent skill.
3. If `--interactive`, ask:
   - What OSes must be supported?
   - What are the hard prerequisites (git, node, python version)?
   - Is there a config directory that needs to be created?
   - Does the project chain sub-projects?

#### Developer Install Discovery (when `--type developer`)

Additional discovery steps for developer manifests:

1. Scan for dev-specific indicators: `.nvmrc`, `.tool-versions`, `mise.toml`, `pyproject.toml [dev]`, `Brewfile`, `.devcontainer/`
2. Detect Docker-in-dev usage patterns (bind mounts, live reload, `--watch` flags)
3. If `--interactive` or key information is absent, ask mandatory interactive questions:
   - "What OS(es) do developers use? (linux/macos/windows)"
   - "Is there a local domain for HTTPS development? (e.g., myapp.local)"
   - "Do developers need GPU access for local dev? (yes/no)"
   - "Is SSH key setup required as a project prerequisite? (yes/no)"
   - "Which IDE(s) are standard? (vscode/jetbrains/none)"
   - "Any kernel/OS parameters required? (inotify watches, vm.max_map_count, etc.)"
   - "Does the project use a local certificate authority for HTTPS dev?"

### Phase 2: Assemble Manifest

Build the manifest YAML following this priority order:

1. **metadata block** — include `install_type` matching `--type` flag (default: `developer`)
2. **platform block** — from `--platform` or detected by project type
3. **params block** — standard params: `INSTALL_DIR`, `BRANCH` (default: `main`); add `CONFIG_DIR` if a config step is needed
4. **prerequisites block** — from project type (e.g., `node` for npm projects, `python3` for Python)
5. **steps block** — construct from script templates:
   - Always start with a `clone` or `verify-existing` detect step
   - Add `install-deps-*` steps for each target platform
   - Add `configure` step if config files are needed
   - End with a `verify` step
6. **recovery_procedures block** — always include a `full-reset` fallback

#### Developer Manifest Assembly Rules (when `--type developer`)

When assembling developer manifests, apply these additional rules:

**os_config block** — emit entries based on detection:

| Condition | Entry |
|-----------|-------|
| Linux + Docker in project | `docker-group` (requires_relogin: true) |
| Linux + file watchers detected (webpack/jest/vite/nodemon) | `inotify-watches` |
| Linux + Elasticsearch/Weaviate/OpenSearch detected | `vm-mapcount` |
| macOS | `xcode-cli-tools` (interactive: true) |
| HTTPS dev + local domain | mkcert install step (not os_config, but a script step) |
| GPU dev | `nvidia-container-toolkit` os_config entry |

**params** — emit with `interactive_required: true` for:
- `LOCAL_DOMAIN` — when HTTPS dev or local domain detected
- `SSH_EMAIL` — when SSH key setup is required
- `GIT_USER_NAME`, `GIT_USER_EMAIL` — when git config step is included
- `GIT_GPG_KEY_ID` — when GPG signing is requested
- `IDE` — when IDE-specific extension installation is included

**steps** — emit os-config steps for each os_config entry:
```yaml
- id: apply-docker-group
  type: os-config
  config_id: docker-group
  depends_on: [install-docker]
  platform: linux
```

**dev-specific prerequisites** — add as detected:
- `nvm` or `mise` — when `.nvmrc` or `.tool-versions` found
- `mkcert` — when HTTPS dev requested
- `act` — when GitHub Actions local testing detected

### Docker-based Project Detection

When `docker-compose.yml` or `compose.yaml` is found during Phase 1 discovery, apply these additional behaviors:

**Platform** (#676):
- Include `macos` in the platform block alongside `linux` — Docker Desktop covers both.
- Any GPU or nvidia steps must add `when: "$(uname -s) = Linux"` so they are skipped on macOS.
- Update `install_hint` for docker prereqs to include macOS install links.

**Prerequisites** (#672, #674):
- Replace `command -v docker` with `docker version --format '{{.Server.Version}}' 2>/dev/null` to catch both "not installed" and "installed but no permission" cases.
- Expand the docker `install_hint` to mention `sudo usermod -aG docker $USER`.
- When Docker images or ML models are present, add disk space prereq (≥20GB free):
  ```yaml
  - name: disk-space
    detect: "df --output=avail -BG / | tail -1 | tr -d ' G'"
    version_min: "20"
    install_hint: "At least 20GB free disk space required for Docker images."
  ```
- When ML models are detected (Ollama, HuggingFace, etc.), add RAM prereq (≥8GB):
  ```yaml
  - name: ram
    detect: "awk '/MemTotal/ {printf \"%.0f\", $2/1024/1024}' /proc/meminfo"
    version_min: "8"
    install_hint: "At least 8GB RAM recommended. 16GB+ for GPU profiles."
  ```

**Params** (#671, #675):
- When a `DOMAIN` or `ISSUER_URL` param is emitted, also emit a `PROTOCOL` param with a smart default:
  ```yaml
  - name: PROTOCOL
    type: choice
    choices: [http, https]
    default: "$(echo ${DOMAIN} | grep -qE '^(localhost|127\\.0\\.0\\.1)' && echo http || echo https)"
    description: "Protocol for OAuth/API URLs. Defaults to http for localhost."
  ```
  Then reference `${PROTOCOL}://${DOMAIN}` in configure.sh instead of hardcoding `https://`.
- Default `DATA_DIR` to `${INSTALL_DIR}/data` (project-local, user-writable) rather than any system path like `/var/lib/<project>`. If the project explicitly requires a system path, emit a `check-data-dir` step (see steps below).

**Steps** (#673, #675, #677):
- Emit a `check-ports` step before `deploy` that validates all ports declared in the compose file are free:
  ```yaml
  - id: check-ports
    type: script
    script: installer/scripts/check-ports.sh
    depends_on: [configure]
  ```
- When the default `DATA_DIR` is a system path, emit a `check-data-dir` step before `configure`:
  ```yaml
  - id: check-data-dir
    type: script
    script: installer/scripts/check-data-dir.sh
    depends_on: [clone]
  ```
- When Ollama is detected in the compose file or `.env` template, emit a `pull-models` step after `deploy`:
  ```yaml
  - id: pull-models
    type: script
    description: Pull Ollama models (may take several minutes)
    script: installer/scripts/pull-models.sh
    depends_on: [deploy]
    verify: "docker exec $(docker compose ps -q ollama) ollama list | grep -q ${OLLAMA_GEN_MODEL%%:*}"
  ```

**Script templates used for Docker projects**:
- `installer/scripts/check-ports.sh` — port availability check before deploy
- `installer/scripts/pull-models.sh` — Ollama model pull after deploy (when applicable)

### Phase 3: Script Assembly

For each script step:
1. Copy the relevant template from `agentic/code/addons/agentic-installer/scripts/templates/`
2. For developer manifests, copy dev templates from `scripts/templates/dev/`
3. Place in `<project>/installer/scripts/` (user install) or `<project>/installer/scripts/dev/` (developer install)
4. Customize placeholders (package lists, config paths, extension IDs, etc.)
5. Record relative path in the manifest `script:` field

### Phase 4: Output

Write the manifest to the appropriate path:
- `installer/setup.user.manifest.yaml` — user install (when `installer/` dir exists)
- `installer/setup.dev.manifest.yaml` — developer install (when `installer/` dir exists)
- `setup.manifest.yaml` — backwards-compatible default (no `--type` flag, no `installer/` dir)

Report:
```
Generated: setup.manifest.yaml
  Install type:  developer
  Platform:      linux
  Steps:         setup
  Scripts:       scripts/setup.sh

Validate with: aiwg setup-validate --manifest setup.manifest.yaml
Run with:      aiwg setup-run --manifest setup.manifest.yaml --dry-run
```

## Output File Structure

A full-suite project (both user and developer install) ships these files:

```
installer/
├── setup.user.manifest.yaml          # end-user deploy
├── setup.dev.manifest.yaml           # developer standup
├── docs/
│   ├── install-user-linux.md
│   ├── install-user-macos.md
│   ├── install-user-windows.md
│   ├── install-dev-linux.md
│   ├── install-dev-macos.md
│   ├── install-dev-windows.md
│   └── install-dev-wsl2.md
└── scripts/
    ├── clone.sh
    ├── configure.sh
    ├── verify.sh
    ├── dev/
    │   ├── configure-dev.sh
    │   ├── install-mkcert.sh
    │   ├── apply-docker-group.sh
    │   ├── apply-inotify.sh
    │   ├── apply-vm-mapcount.sh
    │   ├── install-ide-extensions.sh
    │   ├── setup-git-config.sh
    │   ├── setup-ssh-key.sh
    │   └── verify-dev.sh
    └── user/
        ├── install-deps-ubuntu.sh
        ├── install-deps-macos.sh
        └── install-deps-windows.ps1
```

## Script-First Rule

Every step that can be scripted MUST be a `script` step. Only use `type: agentic` for:
- Steps that require real-time environment inspection that cannot be expressed in bash
- Recovery from unexpected failures where the script approach has been exhausted

## Example Output (Developer Manifest)

```yaml
apiVersion: setup.aiwg.io/v1
kind: SetupManifest
metadata:
  name: myapp-dev
  version: 1.0.0
  description: Developer environment setup for myapp
  install_type: developer

spec:
  platforms:
    - os: linux
      distros: [ubuntu, debian, fedora]
      arch: [x86_64, arm64]
      shell: bash
    - os: macos
      arch: [x86_64, arm64]
      shell: zsh

  params:
    - name: INSTALL_DIR
      type: path
      required: true
      description: Directory to clone the project into
    - name: LOCAL_DOMAIN
      type: string
      interactive_required: true
      description: Local domain for HTTPS dev (e.g., myapp.local)
    - name: SSH_EMAIL
      type: string
      interactive_required: true
      description: Email address for SSH key generation
    - name: IDE
      type: choice
      choices: [vscode, jetbrains, none]
      interactive_required: true
      description: IDE to install extensions for

  prerequisites:
    - name: git
      detect: "command -v git"
      version_min: "2.30"
      install_hint: "Install git: https://git-scm.com"
    - name: docker
      detect: "docker version --format '{{.Server.Version}}' 2>/dev/null"
      install_hint: "Install Docker: https://docs.docker.com/get-docker/"

  os_config:
    - id: docker-group
      description: Add current user to docker group (avoids sudo for docker)
      check: "id -nG | grep -qw docker"
      apply: "sudo usermod -aG docker ${USER}"
      requires_relogin: true
      platforms: [linux]

    - id: inotify-watches
      description: Increase inotify watches for file watchers (webpack, jest, vite)
      check: "sysctl fs.inotify.max_user_watches | awk '{print $3}' | xargs -I{} test {} -ge 524288"
      apply: |
        echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.d/99-dev.conf
        sudo sysctl -p /etc/sysctl.d/99-dev.conf
      platforms: [linux]

    - id: xcode-cli-tools
      description: Xcode Command Line Tools (required for native compilation on macOS)
      check: "xcode-select -p 2>/dev/null | grep -q CommandLineTools"
      apply: "xcode-select --install"
      interactive: true
      platforms: [macos]

  steps:
    - id: clone
      type: script
      script: installer/scripts/clone.sh
      verify: "test -d ${INSTALL_DIR}/.git"

    - id: setup-git-config
      type: script
      script: installer/scripts/dev/setup-git-config.sh
      params: [GIT_USER_NAME, GIT_USER_EMAIL]
      depends_on: [clone]

    - id: setup-ssh-key
      type: script
      script: installer/scripts/dev/setup-ssh-key.sh
      params: [SSH_EMAIL]
      depends_on: [clone]

    - id: apply-docker-group
      type: os-config
      config_id: docker-group
      platform: linux
      depends_on: [clone]

    - id: apply-inotify
      type: os-config
      config_id: inotify-watches
      platform: linux
      depends_on: [clone]

    - id: apply-xcode-tools
      type: os-config
      config_id: xcode-cli-tools
      platform: macos
      depends_on: [clone]

    - id: install-mkcert
      type: script
      script: installer/scripts/dev/install-mkcert.sh
      params: [LOCAL_DOMAIN]
      depends_on: [clone]

    - id: configure-dev
      type: script
      script: installer/scripts/dev/configure-dev.sh
      params: [INSTALL_DIR, LOCAL_DOMAIN]
      depends_on: [install-mkcert]

    - id: install-ide-extensions
      type: script
      script: installer/scripts/dev/install-ide-extensions.sh
      params: [IDE]
      depends_on: [clone]

    - id: verify-dev
      type: script
      script: installer/scripts/dev/verify-dev.sh
      params: [LOCAL_DOMAIN]
      depends_on: [configure-dev, apply-docker-group, apply-inotify]

  recovery:
    - id: full-reset
      steps:
        - id: reset
          type: script
          script: installer/scripts/reset.sh
```

## References

- Schema: `agentic/code/addons/agentic-installer/schemas/v1/setup-manifest.schema.json`
- Templates (user): `agentic/code/addons/agentic-installer/scripts/templates/`
- Templates (dev): `agentic/code/addons/agentic-installer/scripts/templates/dev/`
- Run skill: `agentic/code/addons/agentic-installer/skills/setup-run/SKILL.md`
- Validate skill: `agentic/code/addons/agentic-installer/skills/setup-validate/SKILL.md`
