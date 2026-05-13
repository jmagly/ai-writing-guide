# UC-HMP-005: Documentation Refresh + Verification

**Phase**: Elaboration | **Priority**: P1 | **Status**: Draft

## Reasoning

1. **Problem**: Hermes quickstart targets v0.4.0; Hermes is at v0.13.0. All file:line refs drifted. `hermes-skill-fields.md` mentions features that need re-verification.
2. **Constraint**: Hermes is rapidly evolving — docs go stale on minor bumps.
3. **Alternatives**: (a) one-shot refresh and ignore future drift (rejected); (b) refresh + automated re-verification on Hermes minor bumps (chosen); (c) drop Hermes-specific docs entirely (rejected — operators need them).
4. **Rationale**: Pin to a verified Hermes version in docs; re-verify file:line refs as part of release process.
5. **Risk**: Re-verification toil per Hermes bump — mitigated by automated check script.

## Primary Actor

AIWG maintainer; downstream Hermes user.

## Goal

All Hermes-related documentation reflects v0.13.0 reality, with a re-verification harness for future bumps.

## Main Success Scenario

1. Maintainer updates `docs/integrations/hermes-quickstart.md` against verified v0.13.0 line refs.
2. Maintainer updates `docs/providers/hermes-skill-fields.md` with verified Curator flag, `platforms:`, `${HERMES_SKILL_DIR}` resolution.
3. New script `tools/verify-hermes-citations.mjs` walks all `hermes_cli/`, `agent/`, `tools/mcp_tool.py` refs in AIWG docs; verifies each cited line still matches expected content.
4. Script runs in CI; flags drift.

## Acceptance Criteria

- [ ] `docs/integrations/hermes-quickstart.md` updated against Hermes v0.13.0 (file:line refs re-verified)
- [ ] `docs/providers/hermes-skill-fields.md` updated; Curator flag documented
- [ ] CHANGELOG entries for shipped Hermes integration features cleaned up (remove unsubstantiated #1239 claim or backfill implementation)
- [ ] `tools/verify-hermes-citations.mjs` checks all `hermes_cli/`/`agent/`/`tools/mcp_tool.py` file:line refs
- [ ] CI integration: script runs on PRs that touch `docs/integrations/hermes-*.md` or `docs/providers/hermes-*.md`
- [ ] Pinned Hermes version in `tools/verify-hermes-citations.mjs` (e.g., `HERMES_VERIFIED_VERSION=0.13.0`)
- [ ] Drift produces actionable error: "ref `agent/prompt_builder.py:824` for `CONTEXT_FILE_MAX_CHARS` no longer matches; expected `<X>`, found `<Y>`"

## NFR

- Verification script runtime ≤30s
- False positive rate ≤5% (script tolerates whitespace drift but flags semantic change)

## Out of Scope

- Auto-PR opening for drift (manual fix; just detection)
- Translation to other languages
- Hermes version-pinning in install instructions (separate issue if needed)
