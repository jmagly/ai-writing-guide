---
name: premortem-v2
description: Run a diversity-first premortem with bounded deep dives, blind plausibility and impact verification, and explicit provenance labels.
---

# Premortem v2

Use this skill when a decision, implementation, or release needs a structured premortem.

1. Generate failure modes across at least three distinct categories before ranking or deep analysis.
2. Select three to seven risks. Record an explicit selection rationale for every selected risk.
3. Give a blind verifier only each risk statement. Do not expose the selection score or rationale. Record plausibility and impact separately.
4. Label every vivid narrative `HYPOTHETICAL`. Never cite a generated scenario as evidence.
5. Mark citations `verified` with a locator or `unresolved` with a concrete citation-risk statement.
6. Preserve the generated pool, bounded selection, verifier result, and unresolved citation risks together.

Run `aiwg premortem-v2 run [premortem.json]`. The default fixture and preserved evidence evaluate roadmap issue `#2046`.
