---
namespace: aiwg
name: llm-wiki
platforms: [all]
description: Enable and configure the llm-wiki addon for long-term, long-form project memory, select a wiki profile, and route ingestion and health checks through the knowledge-base and semantic-memory capabilities.
triggers:
  - enable wiki memory
  - configure long-term project memory
  - long-term long-form project memory
  - set up long-form project memory
  - use an llm wiki profile
  - create a book companion wiki
  - create a personal knowledge wiki
  - create a research deep dive wiki
  - create a business team wiki
---

# LLM Wiki

Use this driver when an operator wants to activate or configure the
`llm-wiki` addon. The addon owns the selectable wiki topology and page
profiles; knowledge ingestion, linting, and storage remain owned by the
knowledge-base and semantic-memory capabilities.

## Select and activate a profile

Choose exactly one documented profile:

| Profile | Intended use |
|---|---|
| `book-companion` | Structured notes and cross-references for a book |
| `personal` | Personal knowledge and a journal of ideas |
| `research-deep-dive` | Long-form academic or technical research |
| `business-team` | A shared organizational knowledge base |
| `generic` | General-purpose wiki topology |

Activate the addon through its canonical CLI operation:

```bash
aiwg use llm-wiki --profile <name>
```

When the user has not selected a profile, explain the choices and ask for one
before activation. Do not invent profile names.

## Canonical operation routing

After activation:

1. Use `aiwg discover "ingest source into knowledge base"` and then
   `aiwg show skill kb-ingest` to add source material.
2. Use `aiwg discover "knowledge base health"` and then
   `aiwg show skill kb-health` to check links, schema conformance, and orphans.
3. Use the semantic-memory drivers (`memory-ingest`, `memory-lint`,
   `memory-query-capture`, and memory log operations) for storage primitives.

The selected profile shapes the wiki topology and derived pages. It does not
replace the canonical knowledge-base or semantic-memory mechanics.

## Verification

Confirm activation by checking that `.aiwg/wiki/config.json` records the
selected profile, then verify that both of these queries return actionable
drivers:

```bash
aiwg discover "llm wiki profile"
aiwg discover "ingest source into knowledge base"
```

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/README.md
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/docs/getting-started.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/skills/kb-ingest/SKILL.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/skills/kb-health/SKILL.md
- @$AIWG_ROOT/agentic/code/addons/semantic-memory/skills/memory-ingest/SKILL.md
