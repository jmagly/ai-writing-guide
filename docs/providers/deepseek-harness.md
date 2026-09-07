# DeepSeek Harness

AIWG's experimental `deepseek-harness` provider targets the official
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) CLI and SDK.
The qualified upstream baseline is
[`d347e703908d0406b7a7ef80e3a0e594d86b2215`](https://github.com/deepseek-ai/deepseek-harness/commit/d347e703908d0406b7a7ef80e3a0e594d86b2215)
(`dsh-v0.1.3-alpha.1`), inspected 2026-09-05. AIWG also accepts the reviewed
`0.1.1-rc.2` and `0.1.2-rc.1` wire contracts; any other version fails closed.

Keep these three identities separate:

| Layer | Example | Meaning |
| --- | --- | --- |
| AIWG harness provider | `deepseek-harness` or `dsh` | Selects this deployment/runtime adapter |
| Harness LLM route | `openrouter` or `deepseek-official` | Selects a model-provider plugin inside Harness |
| Model ID | `deepseek/deepseek-chat-v3.1` | Selects a model on that route |

Bare `deepseek` is not an AIWG provider alias because it names the LLM/API
vendor category rather than this harness.

## Prerequisites and package acquisition

Harness requires Node.js `^22.19.0 || >=24.0.0`. Follow its
[official CLI instructions](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/apps/cli/README.md)
and pin a qualified version. An isolated invocation does not require a global
install:

```bash
npx -y @deepseek-ai/dsh@0.1.3-alpha.1 --version
```

Supply-chain policy may intentionally delay a newly published prerelease. Do
not disable a configured minimum-release-age gate merely to make the command
succeed.

## Preview, deploy, and verify

```bash
aiwg use all --provider deepseek-harness --dry-run
aiwg use all --provider deepseek-harness
aiwg doctor --provider deepseek-harness
aiwg status --probe --provider deepseek-harness --json
aiwg runtime-info --providers --json
aiwg steward capabilities --provider deepseek-harness
```

`dsh` may replace `deepseek-harness` in AIWG provider options. Deployment
creates or updates only receipted AIWG surfaces:

- `AGENTS.md`, a compact bootstrap into `WORKSPACE.md` and `AIWG.md`;
- `.agents/skills/`, which Harness scans natively;
- `.dsh/aiwg.cordis.patch.yml`, an AIWG-owned safe overlay that uses the
  `workspace-write` sandbox, disables telemetry, and selects raw JSONL session
  persistence for importability.

Refresh is previewable and receipt-aware:

```bash
aiwg refresh --provider dsh --dry-run
aiwg refresh --provider dsh
```

`aiwg remove` removes an installed framework or addon, not one provider's
projection. Preview component removal before applying it:

```bash
aiwg remove sdlc --dry-run
aiwg remove sdlc
```

Provider-scoped removal is not supported. To retire only the Harness
projection, review the deployment receipt and remove the receipted AIWG-managed
section in `AGENTS.md`, AIWG-owned `.agents/skills` entries, and
`.dsh/aiwg.cordis.patch.yml` manually; preserve operator-owned files.

AIWG does not overwrite `$DSH_HOME/settings.yaml`, `.credentials.yaml`, or a
profile's `cordis.patch.yml`. A divergent project overlay is treated as
operator-owned unless `--force` is explicitly selected; unowned Cordis rows
are never pruned.

## Context, skills, and policy

Harness natively reads applicable `AGENTS.md` and `CLAUDE.md` files and caps
each rendered instruction file at 65,536 bytes. AIWG emits an AGENTS-first,
provider-neutral bootstrap rather than inventing a `.deepseek/` context path.
Portable skills are placed once in `.agents/skills/<name>/SKILL.md`; AIWG does
not duplicate them into `.dsh/skills`.

The checked-in Cordis overlay contains operational policy only. It never
selects the upstream `sdk-minimal` profile, whose example composition grants
`danger-full-access`, and it does not contain a provider credential or model
route.

## Runtime modes and settlement

For one task, use the headless profile. Reasoning diagnostics remain on stderr
and the final response remains on stdout:

```bash
dsh --profile headless --patch .dsh/aiwg.cordis.patch.yml "your task"
```

Programmatic integration uses the `sdk` profile's newline-delimited JSON-RPC
2.0 contract: `initialize`, `session/prompt`, and `shutdown`. The AIWG client
streams `session.event`, `session.status`, `subagent.started`, and
`subagent.finished`; it settles only after the root returns to idle and known
in-process children finish. Tool payloads and reasoning blocks are not returned
in normalized summaries. Frame and aggregate-output bounds, strict response
validation, CRLF framing, timeout/cancellation teardown, and a SIGTERM-to-
SIGKILL process ladder prevent an abandoned child from surviving the caller.
Harness exposes no JSON-RPC cancel request in this baseline, so cancellation
terminates the isolated process.

## Provider routes and credential references

The checked-in overlay never contains a route credential. AIWG generates a
mode-0600 ephemeral Cordis patch containing only an `apiKeyEnv` reference and
the selected provider/model. The named value enters only the child process's
allowlisted environment; it is excluded from arguments, fixtures, receipts,
diagnostics, and provenance. Missing references fail closed.

The OpenRouter route uses `OPENROUTER_API_KEY`:

```yaml
- id: llm-pi-ai
  config:
    providers:
      openrouter:
        apiKeyEnv: OPENROUTER_API_KEY
```

Load the value into the calling process from an approved secret manager. Never
put it in a command argument, project file, issue, or test fixture. The
[quickstart](../integrations/deepseek-harness-quickstart.md) describes the
network-off-by-default live smoke and its cost/authorization gate.

## Capability boundary

| Capability | Status | AIWG behavior |
| --- | --- | --- |
| AGENTS/CLAUDE context | Harness native; AIWG projected | Compact AGENTS bootstrap, 65,536-byte contract |
| Filesystem skills | Harness native | One `.agents/skills` projection |
| Headless execution | Experimental | Bounded stdout/stderr adapter |
| SDK JSON-RPC | Experimental | Bounded streaming and deterministic settlement |
| User questions | Harness native event; response unsupported | Events are surfaced; no synthetic interactive UI |
| Tools | Harness native | Lifecycle metadata surfaced; arguments/results redacted |
| Subagents, workflows, jobs | Harness native | Events are streamed; in-process child settlement is tracked |
| Hooks | Harness native; AIWG wiring unsupported | No generated Cordis hook bridge |
| MCP client | Harness native; AIWG injection unsupported | Existing rows are preserved; `mcpInjection` is unset |
| Sessions | Harness native; AIWG imported | Raw `session.v2.jsonl`; bounded and redacted |
| Daemon and cron | Unsupported | Use a reviewed external trigger |
| AIWG Mission Control | Emulated | Use AIWG's provider-neutral orchestration layer |

Native support means the capability exists in the inspected Harness
composition. It does not imply full AIWG daemon, cron, or mission-control
parity.

## Session import

Use an explicitly authorized Harness session root:

```bash
aiwg sessions discover --workspace . --dsh-root "$DSH_HOME/sessions"
aiwg sessions import-discovered --workspace . --confirm
```

AIWG imports raw v2 JSONL, preserves topology metadata, rejects schema drift,
and redacts request, tool, reasoning, and unknown-plugin payloads. The upstream
default can produce concatenated Zstandard histories; those require a reviewed
raw export. See [DeepSeek Harness session import](deepseek-harness-sessions.md).

## Troubleshooting

| Symptom | Meaning and action |
| --- | --- |
| Unsupported-version diagnostic | Install one qualified exact version or requalify the new upstream contract |
| `dsh` is not detected | Verify the executable is on `PATH`; context/config files alone do not prove installation |
| Project patch is preserved | It differs from AIWG's receipt; review it before an explicit forced replacement |
| SDK request times out | The process is terminated because this baseline has no JSON-RPC cancel method |
| JSON-RPC frame is rejected | Fix malformed, truncated, or oversized newline framing; stderr is diagnostic only |
| No structured question reply | Use an interactive Harness surface or redesign the automation flow |
| Compressed session is skipped | Produce a reviewed raw JSONL export; AIWG does not shell out to decompress |

## Stable-promotion gate

Promotion requires a documented upstream compatibility window, passing pinned
provider/runtime/session conformance, a reviewed least-authority default,
successful isolated live smoke, and an explicit decision to support any newly
stabilized API. A passing test against one developer-preview build is not a
stable-support claim.

Primary source surfaces inspected for this contract are the
[CLI reference](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/apps/cli/reference/README.md),
[SDK protocol](https://github.com/deepseek-ai/deepseek-harness/blob/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/sdk/protocol/src/types.ts),
and [session persistence package](https://github.com/deepseek-ai/deepseek-harness/tree/d347e703908d0406b7a7ef80e3a0e594d86b2215/packages/session/session-persistence-jsonl).
The [runtime decision record](../architecture/adr-deepseek-harness-runtime.md)
captures the selected and rejected automation boundaries.
