---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.pi
---

# Pi Coding Agent Operational Reference

> Upstream baseline: Pi Coding Agent 0.85.0, commit
> [`47236c84450656043dd8fb21c8513d1421505ae3`](https://github.com/earendil-works/pi/commit/47236c84450656043dd8fb21c8513d1421505ae3),
> verified 2026-09-04.

AIWG's Pi integration is experimental and resource-first. It projects context,
Agent Skills, and prompt templates onto Pi's native discovery surfaces. It does
not currently install executable Pi extensions or packages, configure models,
invoke Pi headlessly, or ingest sessions.

## Install and deploy

Pi 0.85.0 is the Node.js 22.19+ package
[`@earendil-works/pi-coding-agent`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/package.json).

```bash
npm install -g @earendil-works/pi-coding-agent
npm install -g aiwg
cd /path/to/project
aiwg use all --provider pi --dry-run
aiwg use all --provider pi
```

Run Pi from the project root, approve project trust with `/trust`, restart Pi,
and invoke the generated `aiwg-regenerate` prompt. Pi documents the trust
decision and restart requirement in [Project
Trust](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#project-trust).

## Two different meanings of provider

- `aiwg ... --provider pi` selects the Pi **coding-agent harness** and its
  deployment layout.
- `pi --provider openrouter --model ...` selects Pi's **LLM backend and
  model**.

AIWG does not translate one namespace into the other. Pi provides
`--list-models`, `--provider`, `--model`, and `--api-key`; consult Pi's
[CLI reference](https://github.com/earendil-works/pi/tree/main/packages/coding-agent#cli-reference)
for the current contract. Prefer environment-backed credentials over a token on
the command line.

```bash
export OPENROUTER_API_KEY="$(your-secret-command)"
pi --provider openrouter --list-models

PI_CODING_AGENT_SESSION_DIR="$(mktemp -d)" \
  pi --approve --provider openrouter --model <model-id> \
  --mode json -p "Report the AIWG version and stop"
```

The second command is a live model call and may incur cost. Never paste a key
into project files, issue comments, transcripts, or deployment receipts.

## Deployment contract

| AIWG artifact | Pi path | Current support |
|---|---|---|
| Context | `AGENTS.md` | Native startup context |
| Agent roles | `.agents/skills/*/SKILL.md` | Skills-as-agents projection |
| Kernel skills | `.agents/skills/*/SKILL.md` | Shared native discovery |
| Standard skills | `.pi/.aiwg/skills/*/SKILL.md` | Receipted AIWG projection |
| Commands | `.pi/prompts/*.md` | Native prompt templates |
| Rules | `AGENTS.md` managed section | Aggregated; no invented `.pi/rules` |
| Extensions | — | Not installed |
| Packages and settings | — | Operator-owned |
| Session ingestion | — | Not implemented |

Pi documents `.pi/prompts/` in [Prompt
Templates](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md),
`.pi/skills/` and `.agents/skills/` in
[Skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md),
and `.pi/extensions/` in
[Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md).
AIWG deliberately installs no extension because project extensions execute
arbitrary JavaScript/TypeScript with the user's permissions.

At user scope, the Pi agent root is
`${PI_CODING_AGENT_DIR:-~/.pi/agent}`. The variable changes the resource
root; it does not prove Pi is installed, authenticated, or running.

## Trust and headless policy

Interactive `/trust` records a project decision for settings, extensions,
skills, and prompts and requires a restart; context files load regardless.
Print, JSON, and RPC modes do not prompt, so automation must state its policy:

```bash
# Load trusted project resources. Use only in a reviewed project.
pi --approve --mode json -p "Run the requested bounded check"

# Ignore project-local settings, extensions, skills, and prompts.
pi --no-approve --mode json -p "Run without project resources"
```

Do not treat `--approve` as a sandbox. Review `.pi/extensions/`,
package-backed resources, and settings before enabling project resources. See
Pi's [Project Trust](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#project-trust)
documentation for the exact loaded and blocked resources.

## Sessions and machine-readable modes

Pi persists tree-shaped version-3 JSONL sessions under its agent directory by
default. `PI_CODING_AGENT_SESSION_DIR` changes the session location, and
`--session-dir` takes precedence. Entries use stable `id`/`parentId`
links and may include compaction and branch-summary history. See Pi's
[`SessionManager` source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts).

AIWG does not yet ingest those sessions. Retain raw JSONL as source evidence
and redact credentials or sensitive tool output before sharing it.

Pi offers default print mode, `--mode json` event output, and bidirectional
`--mode rpc`. RPC clients must parse stdout strictly as one JSON object per
line and keep stderr separate. Do not infer final completion from `agent_end`:
`agent_settled` means no retry, compaction retry, or queued continuation
remains. Pi specifies those semantics in the [RPC
protocol](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md).

## Capability boundaries

- AIWG deploys declarative resources; it does not claim an in-process Pi MCP,
  subagent, task, cron, structured-question, or daemon integration.
- Pi extensions can add tools and events, but AIWG does not install one.
- Model discovery, headless invocation, RPC handling, and session ingestion
  remain planned rather than supported.
- External Mission Control execution requires a dedicated, qualified Pi runtime
  adapter.

```bash
aiwg steward capabilities --provider pi
```

## Refresh, uninstall, and ownership

```bash
aiwg refresh --provider pi --dry-run
aiwg refresh --provider pi
aiwg list
aiwg remove <installed-framework-or-addon> --dry-run
aiwg remove <installed-framework-or-addon>
```

`aiwg remove` targets an installed framework or addon; repeat it for each item
you intend to remove. AIWG owns only receipted outputs. Removal preserves
`.pi/settings.json`, operator prompts and skills, `.pi/extensions/`,
`.pi/npm/`, `.pi/git/`, session files, credentials, and trust decisions.

## Diagnostics

```bash
pi --version
pi --list-models
aiwg doctor --provider pi
aiwg steward capabilities --provider pi
aiwg use all --provider pi --dry-run
```

- **`Unknown provider: pi` from `aiwg steward`** — compare
  `command -v aiwg` and `aiwg --version`; an old global CLI can shadow the
  repository build.
- **Prompts missing** — confirm files are direct children of `.pi/prompts/`,
  then restart Pi.
- **Skills missing** — start inside the repository, inspect trust, and verify
  `.agents/skills/*/SKILL.md`.
- **User resources missing** — give AIWG and Pi the same
  `PI_CODING_AGENT_DIR`.
- **Headless run ignored project resources** — pass an explicit, reviewed
  `--approve`; headless modes do not display the trust prompt.
- **Mixed text on RPC stdout** — reject it as non-conformant JSONL and capture
  diagnostics from stderr separately.

## Upstream references

- [Pi Coding Agent source](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)
- [Latest documentation](https://pi.dev/docs/latest)
- [SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
- [RPC protocol](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md)
- [Extension examples](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/README.md)

All Pi-specific claims on this page were last verified 2026-09-04 against the
baseline named at the top of the page.
