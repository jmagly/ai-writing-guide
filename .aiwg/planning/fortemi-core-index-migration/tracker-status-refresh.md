---
title: Fortemi Core Migration Tracker Status Refresh
date: 2026-07-02
parent_issue: 1664
status: read-only-open
---

# Fortemi Core Migration Tracker Status Refresh

This is a read-only issue-audit snapshot for the #1664 Fortemi Core migration
roadmap. It does not mutate the tracker and is not closeout evidence.

## Query

Captured: 2026-07-02T05:44:04-04:00

Provider: Gitea origin

Command shape:

```bash
for n in 1664 1685 1684 1686 1687 1688 1689 1690 1691 1551 1508; do
  curl -fsS "https://git.integrolabs.net/api/v1/repos/roctinam/aiwg/issues/$n" \
    | jq -r '[.number, .state, .title, (.updated_at // ""), (.labels | map(.name) | join(","))] | @tsv'
done
```

## Issue State

| Issue | State | Updated | Labels | Title |
| ----- | ----- | ------- | ------ | ----- |
| #1664 | open | 2026-07-02T00:03:07-04:00 | enhancement, index, research | research(index): plan AIWG search/discovery convergence on @fortemi/core |
| #1685 | open | 2026-07-01T23:39:28-04:00 | enhancement, index, research | research(index): inventory every AIWG search/discovery/index surface for Fortemi Core parity |
| #1684 | open | 2026-07-01T23:39:29-04:00 | enhancement, index, research | adr(index): Fortemi Core as AIWG indexing/discovery/search substrate |
| #1686 | open | 2026-07-01T23:39:29-04:00 | feature, index, requires-code | feat(index): extend AIWG->Fortemi export contract to all record domains needed for replacement |
| #1687 | open | 2026-07-01T23:47:42-04:00 | feature, index, requires-code | feat(index): add Fortemi Core sync/ingest pipeline for AIWG project indexes |
| #1688 | open | 2026-07-01T23:39:30-04:00 | feature, index, requires-code | feat(discover): preserve aiwg discover/show ranking and fetch semantics on Fortemi Core backend |
| #1689 | open | 2026-07-01T23:07:03-04:00 | feature, index, requires-code | feat(index): preserve aiwg index CLI compatibility on Fortemi Core backend |
| #1690 | open | 2026-07-01T23:35:12-04:00 | feature, index, requires-code, research | feat(research-kb): migrate research corpus and knowledge-base search onto Fortemi Core contracts |
| #1691 | open | 2026-07-02T00:03:33-04:00 | index, quality, test | test(index): build no-regression parity fixtures for Fortemi Core migration |

## Related Issue State

These are not #1664 roadmap children, but the handoff prompt makes them
ordering gates for the Fortemi Core migration.

| Issue | State | Updated | Labels | Required handling |
| ----- | ----- | ------- | ------ | ----------------- |
| #1551 | open | 2026-07-01T23:39:28-04:00 | feature, index | Keep open as the body-level embedding acceptance case until #1684/#1690 decide whether Fortemi Core owns chunk/body embeddings. |
| #1508 | open | 2026-07-01T23:39:28-04:00 | deferred, needs-infrastructure | Keep deferred until #1687/#1690 settle the provider-neutral storage/index boundary; do not port the direct Fortemi REST/token pattern. |

## Roadmap Comment

The handoff prompt names #1664 issuecomment-77378 as the roadmap source of
truth. Public Gitea API read on 2026-07-02T05:44:04-04:00 confirmed:

- Comment id: 77378
- Issue: #1664
- Author: `roctibot`
- Created: 2026-07-01T22:11:42-04:00
- Updated: 2026-07-01T22:11:42-04:00
- Recommended order:
  `#1685 -> #1684 -> #1686 -> #1687 -> (#1688 + #1689 + #1690) -> #1691 -> default-switch issue`
- Release gates remain: no public command behavior changes without ADR
  approval, no default switch without parity fixtures, no live Fortemi
  dependency in required CI, no hardcoded credentials or direct REST import
  patterns, and no removal of the current `.aiwg/.index` fallback until a
  rollback path has shipped.

The `roctibot` author here is treated as a historical tracker-source fact
because the handoff prompt explicitly names this roadmap comment. It is not
closure evidence and does not relax the delivery-policy requirement that all
future tracker mutations use `tea` as `roctinam`.

## Operator-Authorized MCP Status Comment

After the operator explicitly authorized Gitea MCP on 2026-07-02, a non-closing
status comment was posted to #1664:

- Comment id: 77505
- Issue: #1664
- Author shown by Gitea: `roctibot`
- Created: 2026-07-02T10:45:50-04:00
- Route: operator-authorized Gitea MCP
- Purpose: record latest local handoff evidence and keep #1684-#1691 open until
  commit, remote CI, and package-boundary gates are satisfied.

This comment is valid status evidence for the local WIP state, but it is not
closure evidence and does not satisfy the remote CI or default-backend switch
gates.

## Interpretation

- All #1664 roadmap children remain open.
- Latest roadmap-child recheck on 2026-07-02T05:44:04-04:00 found no state,
  label, or updated-at changes from the previous snapshot.
- Related issues #1551 and #1508 remain open in their expected handoff roles:
  #1551 is the body-level embedding decision/acceptance case, and #1508 remains
  deferred until the provider-neutral corpus storage/index boundary is settled.
- No child issue is ready for closure until the WIP is committed, pushed,
  remote CI is green, and the package-boundary gate is resolved. The operator
  authorized Gitea MCP on 2026-07-02, so non-closing status comments are no
  longer blocked by local `tea` configuration.
- The local implementation can continue to improve readiness, but production
  completion remains externally gated by remote CI and compliant tracker
  mutation access.

## Mutation Guard

Do not use this snapshot as permission to close issues. Non-closing comments or
new issue filing may use the operator-authorized Gitea MCP connector when they
do not bypass the remote CI, package-boundary, or default-switch gates.
