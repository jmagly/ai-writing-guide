# Agent Worked-Examples Catalog (Media Curator)

Discoverable home for the few-shot worked examples that used to live inline in
media-curator agent definitions. Externalizing them keeps agent definitions
under the 16 KB subagent-dispatch ceiling (see the `few-shot-examples` rule and
#1587/#1600) while preserving the 2-3 few-shot floor — the examples still
*exist*, just here instead of bloating every system prompt.

## How this works

- Each agent definition keeps **at most one** compact inline example as an anchor.
- The remaining moderate/complex worked examples live in a per-agent file under
  [`agent-examples/`](./agent-examples/).
- A lean agent definition links to its example file; the agent reads and follows
  it on demand (it is an ancillary reference, not loaded into the prompt budget).

## Reaching the examples

```bash
# Discover the catalog
aiwg discover "agent worked examples catalog"

# Read a specific agent's examples (ancillary file)
aiwg show ...   # or read docs/agent-examples/<agent-name>-examples.md directly
```

## Per-agent example files

Files are added under `agent-examples/<agent-name>-examples.md` as oversized
definitions are debloated. Each contains the simple / moderate / complex worked
examples for that agent, with the same input → output structure they had inline.

> Index note: this catalog is populated incrementally during the #1587/#1600
> debloat pass. An agent without a file here either has its single inline anchor
> only, or has not yet been debloated. `aiwg doctor` flags any agent definition
> still over the 16 KB ceiling.

## References

- `few-shot-examples` rule — the inline ≤1 + catalog requirement and size ceiling
- #1600 — debloat oversized media-curator / media-marketing agent definitions
- #1587 — debloat oversized SDLC agent definitions
- #193 — original few-shot examples implementation
