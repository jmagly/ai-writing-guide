# OMP verification baseline

The experimental provider was reviewed against Oh My Pi 18.1.10, commit
`5964a0f7649275bcde818f20073193fd032451f2`. The tested Linux x64 standalone
binary has SHA-256
`e91d5598ee47e1d4099fd8686dc9f61c9b755f2ea077d5f1774aba1072321f9e`.
The [machine-readable manifest](../../test/fixtures/providers/omp-conformance/manifest.json)
is the executable version boundary. Passing this baseline does not imply
support for arbitrary future versions or other operating systems.

## Reproduce deterministic native checks

```bash
node tools/providers/omp-conformance.mjs --binary /absolute/omp --require --output artifacts/omp-native.json
node tools/providers/omp-mcp-conformance.mjs /absolute/omp artifacts/omp-mcp.json
node tools/providers/omp-conformance-api.mjs --source /absolute/pinned-source --require --output artifacts/omp-api.json
node tools/providers/omp-precedence-conformance.mjs --binary /absolute/omp --source /absolute/pinned-source --output artifacts/omp-precedence.json
```

The source check requires the pinned checkout's dependencies installed from its
lockfile. The [dedicated workflow](../../.gitea/workflows/omp-conformance.yml)
contains the exact acquisition and dependency commands and retains the reports.
Local missing prerequisites are explicit skips; `--require` turns them into
failures. The native MCP check uses local stdio/HTTP servers and a loopback model,
so it makes no hosted model request and requires no external credentials.

With `OPENROUTER_API_KEY` already available in the environment, the opt-in
hosted check is:

```bash
AIWG_OMP_LIVE_SMOKE=1 npm run smoke:omp:live -- --binary /absolute/omp --model openrouter/openai/gpt-4.1-mini
```

Add `--check` to validate prerequisites without submitting prompts. The
committed harness also passed a live run: completion, context, read-tool,
session persistence, and binary verification were all true. Its report omits
model content and credential values.

## Recorded local evidence

| Check | Observed result |
| --- | --- |
| Root context imports | Native bootstrap imports shared workspace markers |
| Nested context | Nearest native context and rules shadow ancestor native context; explicit root imports required |
| Resource discovery | Generated agents, one-level skills, rules and read tool exposed by actual binary |
| Foreign context | Disabled Pi and Claude discovery markers excluded |
| RPC | Ready frame, protocol v2 negotiation, state, idle abort and process close |
| Native API | Bridge compiles against pinned upstream extension types with zero diagnostics |
| MCP | Stdio and HTTP initialization, listing, actual tool call, disconnect; subprocess absent after cleanup |
| Hosted smoke | OpenRouter `openai/gpt-4.1-mini` completion and context/read-tool checks passed |
| Session import | Both saved native smoke sessions imported; replay created no duplicate events |

An earlier standalone JSON completion/context smoke reported a combined cost of
USD 0.0027324. The key was provided only to the child process and excluded from
saved logs. Hosted access is an observation for that configured backend/model,
not a promise that all catalog models are available to every account.

Unit and integration suites cover preservation, malformed input, model policy,
RPC framing/cancellation, native session normalization, durable resume and
bounded scheduling. The issue acceptance audit and CI on the delivered commit
remain authoritative for completion; this baseline is not a substitute for a
green delivery gate.

The [acceptance matrix](omp-conformance-matrix.json) maps all 61 original issue
criteria to their tests and native checks. The
[recorded native results](omp-native-evidence.json) preserve the local baseline;
CI retains fresh reports for the delivered revision.

## Reviewed native contracts

- [Profile and directory resolution](https://github.com/can1357/oh-my-pi/blob/5964a0f7649275bcde818f20073193fd032451f2/packages/utils/src/dirs.ts)
- [Native discovery and MCP fields](https://github.com/can1357/oh-my-pi/blob/5964a0f7649275bcde818f20073193fd032451f2/packages/coding-agent/src/discovery/builtin.ts)
- [Native agent fields](https://github.com/can1357/oh-my-pi/blob/5964a0f7649275bcde818f20073193fd032451f2/packages/coding-agent/src/discovery/helpers.ts)
- [RPC protocol](https://github.com/can1357/oh-my-pi/blob/5964a0f7649275bcde818f20073193fd032451f2/packages/coding-agent/src/modes/rpc/rpc-types.ts)
- [Implementation acceptance issues](https://git.integrolabs.net/roctinam/aiwg/issues/2244)
