---
namespace: aiwg
name: natural-language-harness
platforms: [all]
description: Validate and ablate readable NLAH.md harness policy without executing ambiguous prose
---

# Natural-Language Harness

Use an NLAH document to review harness policy and its deterministic mappings.

1. Write the seven required sections.
2. Mark executable clauses as `MUST [id]`.
3. Map every ID to a validator, script, agent, flow, or manual gate.
4. Run `aiwg harness validate NLAH.md` before planning.
5. Use `aiwg harness ablate NLAH.md --remove <module>` to compare modules.

Never execute prose directly. `SHOULD` and `MAY` clauses remain ambiguous and
must be reviewed or promoted to explicit mappings before execution.

@implements #2043
