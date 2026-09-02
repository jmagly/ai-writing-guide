# SDLC Quick Start

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed and connected to the target project.

Tell the agent the product outcome and the current project state:

```text
Use AIWG's SDLC framework for this project. Determine whether we need intake,
requirements, architecture, implementation, or a release path. Recommend one
next workflow, explain the expected artifacts, and ask before material changes.
```

The agent should inspect the project, select the current lifecycle phase, and
propose one bounded next action. It may ask about scope, stakeholders, delivery
policy, security constraints, or acceptance evidence. Answer only the questions
that materially change the path.

## What to expect

- A short explanation of the selected lifecycle phase and workflow.
- A preview of files, tracker items, or repository state that may change.
- An approval request where project policy requires one.
- Progress updates during longer workflows.
- A final report naming produced artifacts, tests or gates, unresolved risks,
  and the next recommended action.

## Useful asks

```text
Turn this product idea into a validated inception plan.
Bring this existing codebase into the SDLC workflow without discarding its conventions.
Review whether the project is ready to move from elaboration into construction.
Implement this approved change and verify its acceptance criteria.
Prepare this release and tell me which gate evidence is still missing.
```

## Verify success

Ask the agent to map the result back to your original goal and identify the
authoritative artifacts and checks. A workflow is not complete merely because
documents were generated; required feedback, tests, traceability, and gates
must be addressed.

If AIWG is not yet installed or engaged, begin with the
[general quick start](quickstart.md). Agents and advanced operators can retrieve
deterministic command and flag contracts from the
[agent reference corpus](https://github.com/jmagly/aiwg/tree/main/docs/agents/).
