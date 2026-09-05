---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.omp
---

# Oh My Pi Operational Reference

> Upstream baseline: Oh My Pi 18.1.10, commit
> [`5964a0f7649275bcde818f20073193fd032451f2`](https://github.com/can1357/oh-my-pi/commit/5964a0f7649275bcde818f20073193fd032451f2),
> verified on Linux x64 on 2026-09-04.

AIWG's `omp` integration is experimental and separate from the original `pi`
provider. It deploys native OMP context, agents, prompts, rules, Agent Skills,
MCP configuration, and an optional lifecycle bridge. It also supports model
catalog discovery, JSON/RPC execution, bounded native teams, and governed
session ingestion.

## Install and deploy

Install OMP from its
[upstream instructions](https://github.com/can1357/oh-my-pi). The package route
requires Bun 1.3.14 or newer; the standalone binary does not require Bun to
launch. AIWG requires Node.js 20 or newer.

```bash
npm install -g aiwg
cd /path/to/project
aiwg use all --provider omp --dry-run
aiwg use all --provider omp
```

Start or reopen OMP at the project root. Verify that the session loaded the
managed imports in `.omp/AGENTS.md`; file presence alone proves deployment,
not active session context.

## Provider and model selectors

- `aiwg ... --provider omp` selects the AIWG deployment/runtime adapter.
- `omp --model <backend>/<provider>/<model>` selects a model inside OMP.
- `aiwg ... --provider oh-my-pi` is accepted as an alias.

AIWG role mappings must resolve to concrete models returned by the active OMP
catalog. Keep backend keys in OMP's credential store or the child process
environment. Never persist a credential value in AIWG configuration, receipts,
logs, issues, or session fixtures.

## Deployment contract

| AIWG surface | OMP path | Current support |
| --- | --- | --- |
| Context | `.omp/AGENTS.md` | Native imports of `WORKSPACE.md` and `AIWG.md` |
| Agents | `.omp/agents/*.md` | Native task-agent definitions with bounded spawn targets |
| Kernel skills | `.agents/skills/*/SKILL.md` | Native one-level Agent Skills |
| Standard skills | `.agents/skills/*/SKILL.md` | Copied only with `--copy-all`; otherwise discovered on demand |
| Prompts | `.omp/prompts/*.md` | Native prompt resources |
| Rules | `.omp/rules/*.md` | Native OMP rules |
| Behaviors | `.omp/extensions/` | Explicit lifecycle bridge; no default policy installed |
| MCP | `.omp/mcp.json` | Owned project injection and removal |
| Sessions | OMP v3/title-prefixed JSONL | Authorized, replay-safe ingestion |

The deployment receipt owns only generated files and injected configuration
entries. Refresh and removal preserve operator files, modified generated files,
provider settings, credentials, and sessions.

## Profiles and scope

Default user resources use `~/.omp/agent`; named profiles use
`~/.omp/profiles/<name>/agent`.

```bash
OMP_PROFILE=work aiwg use all --provider omp --scope user
OMP_PROFILE=work aiwg mcp inject --provider omp --scope user --servers local-tools
```

`OMP_PROFILE` takes precedence over `PI_PROFILE`. `PI_CONFIG_DIR` changes the
configuration base. `PI_CODING_AGENT_DIR` can relocate the default profile
agent directory but does not relocate named profiles. Use the same environment
for deployment, diagnostics, MCP changes, and removal.

## MCP lifecycle

```bash
aiwg mcp add local-tools --type stdio --command node --args /absolute/server.mjs
aiwg mcp inject --provider omp --servers local-tools --dry-run
aiwg mcp inject --provider omp --servers local-tools
aiwg mcp uninject --provider omp --servers local-tools
```

Injection preserves unknown fields and unowned servers. Environment
placeholders stay unresolved on disk. Operator changes to an owned entry cause
a collision instead of being overwritten or removed.

## Runtime, teams, and sessions

External Ralph can launch OMP with `--provider omp`. Machine clients must keep
JSON/RPC stdout separate from diagnostic stderr and use bounded cancellation.
OMP's native task surface supports AIWG team leaf agents with explicit tools,
spawn targets, workspace ownership, and concurrency limits.

```bash
aiwg team run --provider omp --body-file tasks.json \
  --cwd /path/to/project --output-root results --max-parallel 4 \
  --model <backend>/<provider>/<model>

aiwg sessions discover --workspace /path/to/project --omp-root /authorized/sessions
aiwg sessions import-discovered --workspace /path/to/project --confirm
```

Session discovery requires an authorized OMP root or provider home. The adapter
handles OMP's mutable title prefix before the version-3 session header and does
not reuse Pi's header-first parser.

## Diagnostics

```bash
omp --version
aiwg runtime-info --providers --provider omp --json
aiwg steward capabilities --provider omp
aiwg use all --provider omp --dry-run
```

- **OMP is unavailable:** set `AIWG_OMP_BIN` when the executable is outside
  `PATH`, then repeat `runtime-info`.
- **Resources are missing:** confirm the project/profile root and OMP discovery
  settings before copying files from another provider.
- **A model catalog is empty:** treat the catalog command as failed and inspect
  OMP stderr, profile configuration, and backend credentials.
- **Context is duplicated:** inspect OMP foreign-provider discovery and
  `disabledProviders`; AIWG does not change those operator settings.
- **Removal reports a collision:** review the changed generated file or MCP
  entry. Removal does not discard operator modifications.

## Verification and maintenance

The credential-free native suite covers context precedence, agents, skills,
rules, MCP transport and cleanup, JSON/RPC framing, model discovery, teams, and
session ingestion. The credential-gated OpenRouter smoke has also passed for
`openrouter/openai/gpt-4.1-mini` without retaining model output or key values.

Review upstream changes for every OMP upgrade and at least monthly while the
adapter is experimental. Promotion requires the complete native and
preservation matrix to pass on every claimed operating system.

- [Full provider guide](../../providers/omp.md)
- [Verification baseline](../../providers/omp-verification.md)
- [Session ingestion contract](../../providers/omp-sessions.md)
- [Capability matrix](../../integrations/cross-platform-overview.md#provider-capability-matrix)
