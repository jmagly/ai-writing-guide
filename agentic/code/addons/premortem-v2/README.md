# Premortem v2

Premortem v2 is a project-local, research-backed replacement for late-stage reviewer fan-out. It expands diverse failure modes first, selects only three to seven high-value risks with recorded rationale, and then applies a blind verifier that scores plausibility and impact separately.

```bash
aiwg use premortem-v2 --provider codex
aiwg premortem-v2 run
aiwg premortem-v2 run path/to/premortem.json
```

The default fixture evaluates roadmap issue `#2046`. Its preserved report is in `evidence/issue-2046-premortem.json`. Narratives are always labeled `hypothetical`; they are not evidence. Citations must be either verified with a locator or retained as an explicit unresolved citation risk.

This incubating addon is public-core work. It does not automatically accept risks, change issue priority, or substitute generated scenarios for verified evidence.
