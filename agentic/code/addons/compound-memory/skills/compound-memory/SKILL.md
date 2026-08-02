---
namespace: aiwg
name: compound-memory
platforms: [all]
description: Orchestrate governed persistent project memory across immutable evidence, llm-wiki, line-memory, reviewed session candidates, generated outputs, and bounded context packs.
triggers:
  - use compound project memory
  - ingest sources into persistent memory
  - review memory candidates
  - maintain line memory and wiki
  - build a memory context pack
  - capture an output into memory
---

# Compound Memory

Use this driver for the persistent compounding-memory pattern. It coordinates
existing capabilities; it does not replace their storage, review, indexing, or
promotion mechanics.

Start with readiness:

```bash
aiwg compound-memory status --json
```

## Governed workflows

1. **Ingest** — preserve the source unchanged, calculate its identity and
   digest, then route long-form material through `memory-ingest` and llm-wiki.
   Route session transcripts through `aiwg sessions import` and `extract`.
2. **Retrieve/use** — query llm-wiki or the artifact index for linked detail;
   use bounded `aiwg line-memory search ... --limit <n> --no-touch --json` for
   concise stable facts. Never inject the complete stores into startup context.
3. **Write/capture output** — register the output and its source/context-pack
   lineage before proposing any extracted facts as session candidates. Run
   `aiwg compound-memory capture-output <file> ... --json` first, review the
   immutable digest and minimized references, then repeat with
   `--confirm --operation-id <preview-operation-id>`. This creates registration
   and index receipts only; it never promotes knowledge.
4. **Manage** — use exact-version candidate review and preview promotion to the
   declared `memory` or `line-memory` consumer. One reviewed candidate may
   produce independent receipts for both consumers.
5. **Review/update** — independently accept, reject, or defer proposed facts.
   Start from `aiwg compound-memory review --limit 50 --json`, then inspect and
   decide through the exact-version sessions commands. Workspace identity
   changes require a separate explicit review gate.
6. **Maintain** — preview pruning, deduplication, contradiction repair, orphan
   repair, and index refresh. Confirm only the reviewed mutations. Preserve
   lifecycle tombstones and source-purge dependent dispositions. The compound
   command's confirmation may replay pending output registrations; all other
   actions remain delegated to their owning review workflows.

Until the compound-memory lifecycle ADR is accepted, do not invent a new
automatic promotion path. Use the existing commands and receipts named above,
and treat generated/model output as untrusted proposed knowledge rather than
ground truth.

## References

- @$AIWG_ROOT/agentic/code/addons/compound-memory/docs/overview.md
- @$AIWG_ROOT/agentic/code/addons/line-memory/skills/line-memory/SKILL.md
- @$AIWG_ROOT/agentic/code/addons/llm-wiki/skills/llm-wiki/SKILL.md
- @$AIWG_ROOT/agentic/code/addons/semantic-memory/skills/memory-ingest/SKILL.md
