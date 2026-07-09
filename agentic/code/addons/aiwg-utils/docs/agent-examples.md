# aiwg-utils Agent Worked-Examples Catalog

Discoverable home for the few-shot worked examples, report scaffolds, and on-demand
reference tables that used to live inline in aiwg-utils agent definitions.
Externalizing them keeps agent definitions lean for subagent dispatch (see the
`few-shot-examples` rule and #1587) while preserving the few-shot floor — the examples
still *exist*, just here instead of bloating every system prompt.

## How this works

- Each agent definition keeps **at most one** compact inline example as an anchor,
  plus only Tier-1 routing logic and guardrails. Detailed tables move behind
  quickrefs and references when they are not needed for default dispatch.
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
| aiwg-steward | [`agent-examples/aiwg-steward-routing-reference.md`](./agent-examples/aiwg-steward-routing-reference.md) | Tier-3 routing lookups: full CLI toolset table, kernel-pivot per-provider deploy-path table, issue workflow routes, project-local routes, command-routing examples, orchestration/loop routing table, invocation patterns, `$AIWG_ROOT` diagnostic + per-project-copy fallback, catalog-search block. Consulted on demand; the steward keeps only Tier-1 decision logic inline. |

## Note: aiwg-steward dual source

The `aiwg-steward` agent ships as two closely related source copies that must preserve
the same Tier-1 routing contract:

| Copy | Path | Deployed to |
|---|---|---|
| **Canonical** | `agentic/code/addons/aiwg-utils/agents/aiwg-steward.md` | All standard providers via the manifest-driven deployer (`.claude/agents/`, `.factory/droids/`, etc.) |
| **Persona** | `agentic/code/agents/personas/aiwg-steward.md` | OpenHuman/persona selection surface |

The persona copy carries persona-specific frontmatter/triggers, so it is not
byte-identical to the addon agent. Keep the body behaviorally aligned: Tier-1 role,
guardrails, discover/show routes, and Tier-3 pointers must remain equivalent. Both
copies use the same `addons/aiwg-utils/...` reference files, which resolve regardless of
which copy is loaded.

## References

- `few-shot-examples` rule — the inline ≤1 + catalog requirement and size ceiling
- #1587 — debloat oversized agent definitions
- #1600 — aiwg-steward reconcile + debloat (dual-source byte-identity)
- #1661 — steward Tier-1/2/3 split for sub-12 KB dispatch
- #193 — original few-shot examples implementation
