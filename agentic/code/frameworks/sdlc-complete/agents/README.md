# SDLC Agents

Specialized agents that coordinate lifecycle work: orchestration, governance, security, privacy, traceability,
reliability, and testing quality.

## Agents

- `executive-orchestrator.md` — Directs lifecycle, resolves decision gaps, enforces gates
- `context-librarian.md` — Builds artifact index and digests
- `decision-matrix-expert.md` — Facilitates structured trade-offs with embedded matrix
- `intake-coordinator.md` — Validates intake and prepares inception plan
- `mutation-analyst.md` — Analyzes mutation testing results, identifies weak tests, recommends improvements
- `raci-expert.md` — Produces RACI with embedded template
- `security-architect.md` — Threat modeling, security requirements, gates
- `security-gatekeeper.md` — Evaluates embedded gate checklist and reports
- `privacy-officer.md` — DPIA/PIA, data classification, consent/retention
- `traceability-manager.md` — Maintains end-to-end coverage
- `reliability-engineer.md` — SLO/SLI, ORR, chaos drills

## Usage

Pair these agents with SDLC commands in `docs/commands/` and templates in `docs/sdlc/templates/` for a complete
pipeline. All agents are now unified in the main `docs/agents/` directory.

## Related Skills

The `testing-quality` addon provides complementary skills:
- `tdd-enforce` — Pre-commit hooks and CI coverage gates
- `mutation-test` — Run mutation testing analysis
- `flaky-detect` — Identify flaky tests from CI history
- `flaky-fix` — Auto-fix common flaky test patterns
- `generate-factory` — Generate test data factories
- `test-sync` — Detect orphaned/missing tests
