# Oh My Pi (OMP)

AIWG's experimental `omp` provider targets the Oh My Pi coding harness. It is
separate from the original `pi` provider. `aiwg ... --provider omp` selects the
artifact adapter; `omp --model openrouter/openai/gpt-4.1-mini` selects an LLM
backend and model inside that harness. `oh-my-pi` is an AIWG alias for `omp`.

## Installation and support boundary

Install Oh My Pi from its [upstream installation guide](https://github.com/can1357/oh-my-pi).
The npm/Bun package route requires Bun >=1.3.14. The standalone release binary
is a separate route and does not require Bun to launch. Python, Docker, Nix,
and the upstream robomp service are not prerequisites for this provider.
AIWG itself requires Node.js >=20.

The integration baseline is OMP **18.1.10**, source commit
`5964a0f7649275bcde818f20073193fd032451f2`. Live standalone checks have run on
Linux x64. Other operating systems and newer OMP releases remain unverified
until their conformance jobs pass. This experimental boundary applies even
when upstream advertises additional supported platforms.

## Deploy, refresh, and remove

```bash
aiwg use sdlc --provider omp
aiwg use sdlc --provider omp --copy-all
OMP_PROFILE=work aiwg use sdlc --provider omp --scope user
aiwg remove omp --provider omp --dry-run
aiwg remove omp --provider omp
```

Re-run the same `use` command to refresh a deployment. By default, kernel
skills are native one-level `.agents/skills/<name>/SKILL.md` resources; standard
skills remain available through `aiwg discover` and `aiwg show`. `--copy-all`
copies standard skills into that same native discovery layout. Native agents,
prompts, rules, and extensions live under `.omp/`. Receipts protect operator
files and modified generated files. Resolve a collision by choosing a different
name or reviewing the file; force does not authorize replacing operator edits.
Removal deletes only unchanged files owned by the OMP deployment. User-scope
removal uses `--scope user` and the same profile environment as deployment.

Pi and OMP can coexist. They have different native directories and separate
AIWG identities. Their shared `.agents/skills` discovery surface can contain
operator or other-provider resources, which OMP deployment must preserve.
OMP's foreign-provider discovery settings are operator-controlled; AIWG does
not enable foreign user directories or change `disabledProviders`.

## Context and profile roots

The project bootstrap is `.omp/AGENTS.md`, with native `@../WORKSPACE.md` and
`@../AIWG.md` imports. Ordinary Markdown links are not native includes.
Operator text outside managed markers is preserved. Standalone root context,
nearest native context, and compatibility discovery follow OMP's own precedence.
A nested `.omp/AGENTS.md` shadows the ancestor native context; ancestor rules
also are not automatically included at that nearer project scope. Nested
bootstraps must explicitly import the shared files when required—for example,
`@../../WORKSPACE.md` from `nested/.omp/AGENTS.md`. The native conformance runner
checks root imports, nested shadowing and disabled foreign-provider exclusion.

Default user resources live under `~/.omp/agent`. `OMP_PROFILE` takes precedence
over `PI_PROFILE`; named profiles use `~/.omp/profiles/<name>/agent`.
`PI_CONFIG_DIR` changes the configuration base. `PI_CODING_AGENT_DIR` overrides
the default profile agent directory and is ignored for named profiles.
OMP 18.1.10 makes one native exception: user task-agent discovery follows the
config root's `agent/agents` directory even when `PI_CODING_AGENT_DIR` is set.
AIWG therefore deploys user agents to that discovery root; user skills, prompts,
rules, extensions and MCP use the effective agent directory. Runtime diagnostics
report these per-resource paths.
Existing XDG data/state/cache app directories on supported systems can relocate
sessions and state; AIWG uses the same profile-aware resolver. The presence of
legacy `PI_*` variables alone is not evidence that a running process is OMP.

## Capabilities

| Surface | AIWG integration |
| --- | --- |
| Agents | Native Markdown, explicit model/thinking/tools/spawns translation; unsupported tools produce diagnostics |
| Skills and prompts | Native resources; lazy source discovery or explicit full copy |
| Models | Observed OMP catalog; operator-configured role mappings; omitted model inherits |
| MCP | Native project/profile config with owned injection and removal; ephemeral injection unsupported |
| Behaviors | Explicit native extension bridge; selected handlers only |
| Runtime | JSON event stream and RPC v1/v2 negotiation, bounded decoding and cancellation |
| Teams | Native leaf agents scheduled by AIWG; bounded admission and explicit ownership |
| Sessions | Native v3 and title-prefixed sessions; authorized discovery and replay-safe import |
| Daemon, cron, hosted services | No native support claimed by this provider adapter |

AIWG role names are not model IDs. Configure concrete available OMP model IDs
for reasoning, coding, and efficiency roles; an unverified catalog placeholder
is not a usable pin. Unknown tool names are omitted with diagnostics. Native
`task` requires explicit spawn targets or `*`; an empty spawn list must not
silently widen into unrestricted recursion.

The extension bridge exposes lifecycle, tool, and command registration. It
installs no default policy. Markdown prompts are not executable commands.
Permission-request and pre-compaction enforcement are unsupported. See the
[bridge contract](https://git.integrolabs.net/roctinam/aiwg/src/commit/8e37a4f4eb57b22f2f3e8e8d21cefbb49351b9bd/agentic/code/providers/omp/README.md)
before activation.

## MCP

```bash
aiwg mcp install omp
aiwg mcp add local-tools --type stdio --command node --args /absolute/server.mjs
aiwg mcp inject --provider omp --servers local-tools --dry-run
aiwg mcp inject --provider omp --servers local-tools
OMP_PROFILE=work aiwg mcp inject --provider omp --scope user --servers local-tools
aiwg mcp uninject --provider omp --servers local-tools
```

Project configuration uses `.omp/mcp.json`; user scope uses the active agent
directory's `mcp.json`. Injection preserves unknown top-level fields and
unowned server entries. A hash-only sidecar receipt permits safe updates and
removal; operator modifications cause a collision diagnostic. Environment
placeholders remain unresolved on disk, including `--header-env` references.
Native optional fields include `cwd`, `enabled`, `timeout`, `requestIdFormat`,
`auth`, and `oauth`. `aiwg mcp remove` removes a registry definition;
`uninject` removes an unchanged OMP configuration entry.

## Runtime and troubleshooting

Use the External Ralph `--provider omp` adapter for headless runs. The explicit
team entry point is `aiwg team run --provider omp --body-file tasks.json
--cwd WORKSPACE --output-root RESULTS --max-parallel 4 --model PROVIDER/MODEL`.
Its input is an object with a `tasks` array with `id`, `agent`, `prompt`, `ownership`, and
explicit native `tools`. Nested AIWG task graphs are scheduled as leaf agents;
native recursive fan-out is disabled. Shared workspace slots bound concurrent
CLI runs. A stale slot reports its owner for reviewed cleanup instead of
silently stealing capacity.

A model listing failure is not an empty successful catalog. Check the selected
profile, configured backend credentials, binary version, and diagnostic stderr.
`aiwg runtime-info --providers --provider omp --json` reports the executable,
parsed version, effective paths and an explicit unavailable state. Set
`AIWG_OMP_BIN` when the binary is outside PATH.
For missing resources, check OMP's discovery settings and native paths before
copying foreign provider files. For import problems, see
[OMP sessions](omp-sessions.md). Credentials must remain in the provider's
credential store or process environment, not in AIWG artifacts or receipts.

## Maintenance and promotion

The AIWG provider maintainers own this adapter. Review upstream changes at each
OMP version upgrade and at least monthly while experimental. Pin the source
and standalone checksum in conformance, review profile/discovery and RPC/session
changes, then run native loader and deterministic transport tests plus the
credential-gated model smoke when credentials are available. Record explicit
skips; a skipped integration check does not prove support.

Promotion requires passing deployment/parser, MCP lifecycle, behavior, model,
JSON/RPC, session, and concurrency gates on every claimed operating system,
plus preservation and rollback checks. Until then, retain experimental status.
Rollback uses receipt-owned removal and the previous pinned OMP binary; it does
not delete operator credentials, sessions, or provider settings. This adapter
was independently implemented against reviewed interfaces; copied upstream code
must retain its MIT notices if introduced later.

Evidence: [verification baseline and reproducible checks](omp-verification.md), and
[implementation epic](https://git.integrolabs.net/roctinam/aiwg/issues/2244).
