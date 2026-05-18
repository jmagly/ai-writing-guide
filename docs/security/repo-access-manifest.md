# Repo Access Manifest

AIWG can enforce a project-local repo authorization manifest before agents work across repository boundaries. The manifest makes repo ownership explicit: filesystem access and tool availability are not permission.

## Location

Preferred:

```text
.aiwg/ops/security/repo-access.manifest.yaml
```

Fallback:

```text
.aiwg/security/repo-access.manifest.yaml
```

## Schema

```yaml
version: "1"
default_policy: deny
repos:
  - name: aiwg
    path: .
    actions: [read, write, commit, push, issue-comment]
  - name: research-papers
    path: ../research-papers
    actions: [read, issue-comment]
    notes: handoff-only; no file edits
```

Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `version` | No | Manifest version. Defaults to `"1"`. |
| `default_policy` | No | Must be `deny`. Unlisted repos are denied. |
| `repos[].name` | Yes | Stable repo label for explanations. |
| `repos[].path` | Yes | Absolute path or path relative to the project root. |
| `repos[].actions` | Yes | Allowed actions. |
| `repos[].notes` | No | Human-readable restrictions or handoff context. |

Allowed actions:

- `read`
- `write`
- `commit`
- `push`
- `issue-comment`
- `service-action`
- `destructive`

## CLI

```bash
aiwg repo-access list
aiwg repo-access explain --path ../research-papers
aiwg repo-access check --path ../research-papers --action issue-comment
aiwg repo-access check --path ../research-papers --action write
```

`check` exits `0` for allowed and `1` for denied. Invalid manifests or usage errors exit `2`.

## Policy Semantics

- Tool capability is not authorization.
- Unlisted repos deny by default.
- Repo-local instructions can narrow access but cannot expand beyond the manifest.
- Adjacent repos can be handoff-only by allowing `read` and `issue-comment` while denying `write`, `commit`, and `push`.
- Accidental adjacent-repo modifications should not be reverted automatically unless the operator explicitly directs rollback.

## Provider Guidance

The `aiwg-utils` rule `respect-repo-access-manifest` deploys to provider rule surfaces. It instructs agents to run `aiwg repo-access check` before non-trivial cross-repo work.
