# Pi Coding Agent Integration Audit

Status: proposed implementation baseline
Audit date: 2026-09-03
Upstream: [`earendil-works/pi`](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)
Audited commit: [`79680533c6b898894f2d2421c7f640b212d3dfdd`](https://github.com/earendil-works/pi/commit/79680533c6b898894f2d2421c7f640b212d3dfdd)
Audited package version: `@earendil-works/pi-coding-agent` 0.84.4

## Outcome

No checked-in Pi-specific integration plan or implementation was present in AIWG at audit time. This planning set establishes the baseline for adding Pi as a first-class AIWG provider without treating it as an alias for Codex, OpenCode, or the generic provider.

The recommended first release is a native file projection:

- `AGENTS.md` remains the provider-neutral startup bridge and points to `WORKSPACE.md` and `AIWG.md`.
- Skills deploy to project `.agents/skills/<name>/SKILL.md`, which Pi discovers natively and recursively.
- User-facing commands deploy as Pi prompt templates in `.pi/prompts/*.md`.
- Specialized AIWG agents are transformed into skills, because Pi intentionally has no native agent-definition resource.
- Rules remain in the AIWG context graph and generated `AGENTS.md`; Pi has no standalone native rules directory.
- Hooks and interactive policy gates are deferred to an optional TypeScript extension.
- MCP injection is unsupported in the core adapter. Pi deliberately has no built-in MCP client; AIWG capabilities remain available through skills and the `aiwg` CLI.
- Session ingestion is a separate follow-on because Pi's JSONL session tree needs a dedicated adapter rather than the generic transcript parser.

## Corrections to likely stale assumptions

| Assumption | Current upstream fact | Plan correction |
|---|---|---|
| Pi needs an AIWG-specific skill directory | Pi natively scans project `.agents/skills/` from the working directory through repository ancestors. | Use `.agents/skills` as the canonical project skill target; do not duplicate the corpus under `.pi/skills`. |
| Every AIWG provider needs a native agents directory | Pi deliberately omits built-in subagents and has no agent-definition resource type. | Transform agent personas into callable skills; keep orchestration provider-capability-aware. |
| Commands should be extension commands | Pi has native file prompt templates in `.pi/prompts`, with descriptions, argument hints, positional arguments, defaults, and slices. | Use prompt templates for static AIWG commands; reserve extension commands for workflows requiring runtime code or UI. |
| Rules can deploy as discrete provider files | Pi loads `AGENTS.override.md`, `AGENTS.md`, or `CLAUDE.md` along the context path, but has no rules directory. | Aggregate rules through the existing context graph and bootstrap documents. |
| MCP configuration can be injected like Codex or Copilot | Pi explicitly does not ship MCP. Extensions can add tools, and skills can teach CLI use. | Set MCP injection to `null`; document an optional extension bridge only as a later, separately reviewed feature. |
| Project resources always load in automation | Non-interactive `print`, JSON, and RPC modes do not prompt for trust. With the default `ask` policy, project settings and resources are ignored unless trust is saved or `--approve` is supplied. | All automated conformance commands must pass `--approve` in disposable fixtures; production guidance must explain the trust boundary. |
| A Node 20 runtime is sufficient because AIWG requires Node 20 | Pi 0.84.4 declares Node `>=22.19.0`. | Treat Pi invocation as an external provider prerequisite. Do not raise AIWG's own Node floor solely for this adapter. |
| RPC is ordinary line-oriented JSON | Pi RPC requires strict LF-delimited JSONL and warns that generic line readers may split valid Unicode separators. | If AIWG adds an RPC client, frame on byte `0x0A`, strip only a trailing CR, correlate responses by `id`, and consume asynchronous events separately. |
| Pi's experimental distributed runtime is a stable integration point | `experimental` client/server, Radius, mini, Chord services, and plugin facets are changing rapidly on `main`. | Keep the initial adapter on documented stable resources and CLI behavior; gate experimental runtime work behind a separate ADR and pinned compatibility tests. |

## Upstream evidence used

- [Package metadata](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/package.json)
- [Context and CLI behavior](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/README.md)
- [Skills discovery](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/skills.md)
- [Prompt templates](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/prompt-templates.md)
- [Extensions and lifecycle events](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/extensions.md)
- [Packages and resource manifests](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/packages.md)
- [Project trust and settings](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/settings.md)
- [RPC framing and commands](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/rpc.md)
- [Session tree format](https://github.com/earendil-works/pi/blob/79680533c6b898894f2d2421c7f640b212d3dfdd/packages/coding-agent/docs/session-format.md)

## Planning artifacts

- [Architecture](architecture.md)
- [Implementation and verification plan](implementation-plan.md)
- [ADR-001: native resources before extensions](adr-001-native-resources-first.md)

## Re-audit policy

The implementation PR must re-resolve upstream `main`, record the tested commit and released Pi version, and review changes to `README.md`, `docs/skills.md`, `docs/prompt-templates.md`, `docs/extensions.md`, `docs/settings.md`, `docs/rpc.md`, and `docs/session-format.md`. A moving `main` commit is audit evidence, not a dependency pin; conformance must also run against a published version.
