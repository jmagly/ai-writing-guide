# Contributing

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | ≥ 18 (20 recommended) | CI runs on Node 20. Use [nvm](https://github.com/nvm-sh/nvm) to manage versions. |
| **npm** | ≥ 8 | Bundled with Node 18+. |
| **Git** | any | Standard source control. |
| **C++ build tools** | — | Required by native modules (`better-sqlite3`, `hnswlib-node`). See below. |

### Installing C++ build tools

**macOS** — Install Xcode Command Line Tools:
```bash
xcode-select --install
```

**Ubuntu / Debian**:
```bash
sudo apt-get install -y build-essential python3
```

**Windows** — Install the Visual C++ Build Tools:
```bash
npm install --global windows-build-tools   # or install VS Build Tools manually
```

### Native module notes

Three devDependencies compile native addons via node-gyp:

| Package | What it does | Extra system dep |
|---------|-------------|-----------------|
| `better-sqlite3` | SQLite for the artifact index | none beyond build tools |
| `hnswlib-node` | ANN search for semantic embedding | none beyond build tools |
| `@xenova/transformers` | Text embeddings (pulls in `sharp`) | `sharp` downloads a prebuilt binary from GitHub; if that fails (restricted network), install `libvips-dev` so it can compile from source: `sudo apt-get install -y libvips-dev` |

**CI installs** with `npm ci --omit=optional --ignore-scripts` on the second pass to skip the sharp binary download on self-hosted runners without GitHub release access. Local development with a normal `npm install` downloads the prebuilt binary automatically and needs no extra steps.

### Quick start

```bash
git clone https://github.com/jmagly/aiwg.git
cd aiwg
npm install           # downloads all deps including native modules
npm test              # run unit tests
npm run typecheck     # TypeScript type check
```

---

## Contributor Setup

Install the AIWG developer tools addon before making changes. It provides rules that prevent common mistakes and skills to validate your work before filing a PR:

```bash
aiwg use aiwg-dev
```

This gives you:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `/validate-component` | Check a single skill/agent/command | Before filing a PR |
| `/validate-addon` | Check an entire addon for release readiness | Before tagging a release |
| `/dev-doctor` | Full repository health check | When something feels off |
| `/devkit-create-*` | AI-guided scaffolding for new components | When creating new artifacts |

Rules included enforce correct artifact placement, component completeness, and prevent circular skill calls.

> **Do not place artifacts directly in `.claude/`, `.github/`, or other provider directories.** They must originate in `agentic/code/` and be deployed via `aiwg use`. The `skill-placement` rule enforces this.

## Manifests and READMEs

We maintain a `manifest.json` and a README/manifest.md in every directory to help agents and humans quickly understand
contents without extra tooling.

- Add or update files? Update the directory's `manifest.json`.
- Need help? Use the generator:
  - `node tools/manifest/generate-manifest.mjs <dir> [--write-md]`
- Validate manifests before pushing:
  - `node tools/manifest/check-manifests.mjs`

## Optional pre-commit hook

Create `.git/hooks/pre-commit`:

```bash
#!/usr/bin/env bash
node tools/manifest/check-manifests.mjs || exit 1
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Markdown Lint

Run `npm exec markdownlint-cli2 "**/*.md"` (Node ≥18) before PRs.

## Testing Requirements

Significant changes (new agents, commands, skills, CLI changes, framework modifications) require full regression
testing across all supported providers before merging.

See [Testing Requirements](docs/contributing/testing-requirements.md) for:

- Full regression testing criteria
- Provider validation matrix
- Test categories and coverage thresholds
- PR requirements checklist

## Model Testing

Tested a local model with AIWG? We want to hear about it. See [Community Model Testing Guide](docs/contributing/model-testing.md) for how to submit your setup and results to the supported models list.

## Scope

- SDLC framework: `agentic/code/frameworks/sdlc-complete/`
- Marketing framework: `agentic/code/frameworks/media-marketing-kit/`
- Addons (utilities, voice, writing): `agentic/code/addons/`
- Command documentation: `docs/commands/`

## Development Kit

Use the AIWG Development Kit to create and extend packages:

### Creating Packages

```bash
# Create a new addon (standalone utilities)
aiwg scaffold-addon my-addon --description "My utilities"

# Create a new extension (framework expansion pack)
aiwg scaffold-extension hipaa --for sdlc-complete --description "HIPAA compliance"

# Create a new framework (full lifecycle - advanced)
aiwg scaffold-framework my-lifecycle --phases "plan,build,test,deploy"
```

### Adding Components

```bash
# Add agents to a package
aiwg add-agent code-helper --to my-addon --template simple
aiwg add-agent security-reviewer --to my-addon --template complex
aiwg add-agent workflow-manager --to my-addon --template orchestrator

# Add commands to a package
aiwg add-command quick-check --to my-addon --template utility
aiwg add-command convert-docs --to my-addon --template transformation
aiwg add-command full-review --to my-addon --template orchestration

# Add skills to a package
aiwg add-skill voice-apply --to voice-framework

# Add templates to a package
aiwg add-template audit-checklist --to sdlc-complete --type checklist --category security
```

### Validating Packages

```bash
# Validate structure
aiwg validate my-addon --verbose

# Auto-fix issues
aiwg validate my-addon --fix
```

### In-Session Commands

Within Claude Code sessions, use interactive commands for AI-guided creation:

```bash
/devkit-create-addon my-addon --interactive
/devkit-create-extension hipaa --for sdlc-complete --interactive
/devkit-create-agent security-auditor --to my-addon --template complex
/devkit-create-command review-code --to my-addon --template orchestration
/devkit-validate my-addon --fix --verbose
/devkit-test my-addon --verbose
```

### Documentation

- [Development Kit Overview](docs/development/devkit-overview.md)
- [Creating Addons](docs/development/addon-creation-guide.md)
- [Creating Extensions](docs/development/extension-creation-guide.md)
- [Creating Frameworks](docs/development/framework-creation-guide.md)

---

## Filing Issues and PRs

> **Detailed guides** (preferred reading):
> - [`docs/contributing/filing-issues.md`](docs/contributing/filing-issues.md) — issue templates, environment capture, duplicate detection, import flow
> - [`docs/contributing/filing-pull-requests.md`](docs/contributing/filing-pull-requests.md) — delivery policy, no-attribution, verification, CI-green-before-done
>
> **In-context kernel skills** (always loaded for AI agents):
> - `aiwg show skill aiwg-issue` — same content as the issues doc
> - `aiwg show skill aiwg-pr` — same content as the PR doc
>
> Templates available at `.gitea/ISSUE_TEMPLATE/` (and mirrored to `.github/ISSUE_TEMPLATE/`) and `.gitea/pull_request_template.md`. The quick summary below is preserved for browsability.

### Filing a good issue

Bad issue: "doesn't work." Good issue: scoped, reproducible, with environment captured.

| Template | When to use |
|---|---|
| `bug-report.md` | One concrete defect with a reproduction |
| `feature-request.md` | A new capability or enhancement proposal |
| `tester-report.md` | A single session that surfaced multiple findings — to be split during triage |
| `imported-report.md` | Mirroring an issue filed in a different tracker |

Rules of thumb:

- **One bug per issue.** If you found three things, file three issues (or one tester-report and triage will split it).
- **Include environment.** AIWG version, OS, node version, and the platform you ran in (Claude Code, hermes, Codex, Cursor, …). Platform matters — the same bug behaves differently across providers.
- **Paste exact error text.** Code blocks preserve formatting; paraphrased errors lose detail.
- **Suggest a fix when you've investigated.** "I think this is in `src/x/y.ts:42`" is faster than a round-trip.

### Filing a good PR

Pick `pull_request_template.md`. Required checks:

- `Closes #N` for the issue this resolves (or `Refs #N` if it doesn't close)
- Verification block filled in (typecheck + tests + CI status)
- Risk + rollback statement (even if "low / git revert")
- No AI attribution. The AI is a tool. Tools don't sign their output. No `Co-Authored-By: <AI>` lines, no "Generated with" markers, on any platform.

### Delivery policy

This project declares `delivery.mode` in `.aiwg/aiwg.config`. Three modes:

| Mode | Branch | PR | Closing |
|---|---|---|---|
| `direct` | No — commit straight to `default_branch` | No | `Closes #N` in commit |
| `feature-branch` | Branch per issue | No | `Closes #N` in commit on the branch |
| `pr-required` | Branch per issue | Required | `Closes #N` in PR body |

Match your workflow to the configured mode. The `delivery-policy` rule in `agentic/code/addons/aiwg-utils/rules/delivery-policy.md` is the canonical reference.

### CI green before done

A commit isn't done until CI is green. AIWG CI runs on `origin` (Gitea) on every push to `main`. Wait for the run; if it fails, fix it before declaring work complete. Never leave `main` red.

### Import flow (cross-tracker reports)

When a report lands in a different tracker (GitHub mirror, Discord, email, vendor support), mirror it into Gitea as an `imported-report.md`:

1. Use the `imported-report.md` template.
2. Title: `imported: <original title> (<source>#<number>)`.
3. Link the source URL and preserve the original reporter handle.
4. Cross-reference any local issues that duplicate or overlap.
5. If the imported issue is already fixed on current main, note the resolving commit and close as duplicate.
6. Thank the original reporter in a closing comment when the work lands.

### Discovery first

Before declaring something missing or improvising, run:

```bash
aiwg discover "<what you want to do>"
aiwg show skill <name>
```

AIWG ships 400+ skills, most of which aren't loaded into context. `aiwg discover` is the canonical lookup. Filesystem search under `.claude/skills/`, `.factory/`, etc. only reflects the kernel-deployed subset.

### Steward-assisted prep (future)

The `aiwg-steward` agent will eventually walk you through templated filing — duplicate detection, environment capture, template selection, policy compliance. Tracked at #1269.
