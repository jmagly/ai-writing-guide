# aiwg-utils Agent Worked-Examples Catalog

Discoverable home for the few-shot worked examples, report scaffolds, and on-demand
reference tables that used to live inline in aiwg-utils agent definitions.
Externalizing them keeps agent definitions lean for subagent dispatch (see the
`few-shot-examples` rule and #1587) while preserving the few-shot floor — the examples
still *exist*, just here instead of bloating every system prompt.

## How this works

- Each agent definition keeps **at most one** compact inline example as an anchor,
  plus its routing tables, capability matrices, and gates (those are *capabilities*,
  not examples — they stay inline).
- The remaining worked transcripts, report templates, and on-demand reference tables
  live in a per-agent file under [`agent-examples/`](./agent-examples/).
- A lean agent definition links to its example file; the agent reads and follows it on
  demand (it is an ancillary reference, not loaded into the prompt budget).

## Reaching the examples

```bash
# Discover the catalog
aiwg discover "agent worked examples catalog"

# Read a specific agent's examples (ancillary file)
aiwg show ...   # or read docs/agent-examples/<agent-name>-examples.md directly
```

## Per-agent example files

Files are added under `agent-examples/<agent-name>-examples.md` as oversized
definitions are debloated. Each contains the worked examples, report scaffolds, and
reference tables for that agent, with the same structure they had inline.

> Index note: this catalog is populated incrementally during the #1587 debloat pass.
> An agent without a file here either has its single inline anchor only, or has not yet
> been debloated. `aiwg doctor` flags any agent definition over the size ceiling.

### Per-agent files present

| Agent | File | Contents |
|---|---|---|
| aiwg-steward | [`agent-examples/aiwg-steward-examples.md`](./agent-examples/aiwg-steward-examples.md) | Worked transcripts, report scaffolds, on-demand troubleshooting reference tables (session-reload, Hermes composition, deploy errata) |
| aiwg-steward | [`agent-examples/aiwg-steward-routing-reference.md`](./agent-examples/aiwg-steward-routing-reference.md) | Reference-grade routing lookups extracted in #1600: full CLI toolset table, kernel-pivot per-provider deploy-path table, command-routing examples, orchestration/loop routing table, invocation patterns, `$AIWG_ROOT` diagnostic + per-project-copy fallback, catalog-search block. Consulted on demand — the steward keeps the decision logic and the #1600-protected routing tables inline. |

## Note: aiwg-steward dual source

The `aiwg-steward` agent ships as **two byte-identical source copies** that must be kept
in sync:

| Copy | Path | Deployed to |
|---|---|---|
| **Canonical** | `agentic/code/addons/aiwg-utils/agents/aiwg-steward.md` | All standard providers via the manifest-driven deployer (`.claude/agents/`, `.factory/droids/`, etc.) |
| **Mirror** | `agentic/code/agents/personas/aiwg-steward.md` | OpenHuman only, as a markdown persona to `.agents/agents/` via `tools/agents/providers/openhuman.mjs` |

The personas copy is the **OpenHuman markdown-persona deploy mirror** of the aiwg-utils
canonical. OpenHuman consumes markdown personas from `agentic/code/agents/personas/`
rather than the manifest-driven addon path, so the steward needs a persona-tree copy.
The two files are kept **byte-identical** — any edit to one must be applied verbatim to
the other (#1600). Both use the same `addons/aiwg-utils/...` pointer to the steward
worked-examples file, which resolves regardless of which copy is loaded.

## References

- `few-shot-examples` rule — the inline ≤1 + catalog requirement and size ceiling
- #1587 — debloat oversized agent definitions
- #1600 — aiwg-steward reconcile + debloat (dual-source byte-identity)
- #193 — original few-shot examples implementation
