---
namespace: aiwg
name: git-mirror-audit
platforms: [all]
description: Verify configured secondary git mirrors are present and not drifting from the primary remote/default branch
requires:
  - git: repository with remotes
  - config: .aiwg/aiwg.config remotes.secondary[] entries
ensures:
  - report: mirror drift per configured secondary remote
  - exit-code: non-zero when drift exists and --fail-on-drift is set
errors:
  - config-missing: no remotes.secondary[] configured
  - remote-missing: configured secondary remote does not exist in git remote
invariants:
  - read-only audit; never pushes to mirrors
  - backup-mirror semantics are reported separately from active replication
commandHint:
  argumentHint: "[--fail-on-drift] [--default-branch <name>] [--format text|json]"
  allowedTools: Read, Bash
  model: sonnet
  category: maintenance
  orchestration: false
---

# Git Mirror Audit

Audit redundant git mirrors declared in `.aiwg/aiwg.config`:

```json
{
  "remotes": {
    "primary": "origin",
    "secondary": [
      {
        "name": "github",
        "purpose": "backup-mirror",
        "push_on_release": true
      }
    ]
  }
}
```

## Execution Flow

1. Read `remotes.primary`, `delivery.default_branch`, and `remotes.secondary[]`.
2. Confirm every configured secondary exists in `git remote`.
3. Fetch remote refs in read-only mode when the operator permits network access.
4. Compare `refs/remotes/{primary}/{default_branch}` with each secondary's default branch ref.
5. Report drift, missing remotes, and last known commit for each mirror.

## Semantics

- `purpose: backup-mirror` means the mirror is a disaster-recovery copy and should receive release pushes.
- `push_on_release: true` means release procedures must push tags and release commits to that mirror before declaring release complete.
- This skill audits state; it never performs the push.

## References

- `agentic/code/addons/aiwg-utils/rules/delivery-policy.md`
- `.aiwg/security/curl-checklist-gap-analysis.md` row 3, Practice 21
