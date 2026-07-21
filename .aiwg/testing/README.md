# Testing Artifact Layout

This directory separates durable test guidance from generated execution evidence.

- The directory root contains tracked strategies, plans, runbooks, protocols, and specifications.
- `fixtures/` contains tracked deterministic inputs used by tests and demonstrations.
- `outputs/` contains generated reports, logs, state snapshots, and other execution evidence. Git ignores this directory.

The NFR dashboard reads `.aiwg/testing/outputs/dashboard-state.json` by default.

Write new local test results to `outputs/`. When evidence must accompany an issue or release, attach or publish the generated artifact through the applicable delivery workflow instead of committing it here.
