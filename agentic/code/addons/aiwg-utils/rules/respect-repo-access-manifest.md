---
enforcement: high
---

# Respect Repo Access Manifest

**Enforcement Level**: HIGH
Agents must treat tool capability as separate from authorization. The canonical
workspace manifest is `.aiwg/aiwg.config` `workspace` + `repos`. Legacy
`.aiwg/ops/security/repo-access.manifest.yaml` and
`.aiwg/security/repo-access.manifest.yaml` remain compatibility fallbacks.

## Rule

Before reading deeply, editing, committing, pushing, commenting on issues, or taking service actions against a repo path, run or mentally apply:

```bash
aiwg repo-access check --path <repo-or-file> --action <read|write|commit|push|issue-comment|service-action|destructive>
```

If the repo/path is unlisted, deny by default. Ask the operator to add or update
the manifest before proceeding. For every listed member, load that member's own
`.aiwg/aiwg.config`; never reuse the workspace root's delivery, remotes, tracker
actor, or signing policy.

## Semantics

- Tool access is not authorization.
- Unlisted repos are denied for write, commit, push, issue-comment, service-action, and destructive work.
- The effective permission is the intersection of workspace `allowed`, the member config, and narrower repo-local instructions.
- Resolve providers/domains from each member's configured git remotes. Sibling repositories may route to different forges.
- Reject tracker writes by logins in the target member's `remotes.tracker_actor.forbid_actors`.
- Repo-local instructions may narrow access, but they cannot expand beyond the manifest.
- Newer operator instructions may narrow permissions immediately and should be reflected in the manifest.
- Adjacent repos may be handoff-only: for example `read` and `issue-comment` allowed, `write` denied.
- Accidental adjacent-repo modifications should not be reverted automatically unless the operator explicitly directs rollback.

## Canonical Manifest Shape

```json
{
  "workspace": { "name": "home", "root": "~/dev" },
  "repos": [
    {
      "name": "aiwg",
      "path": "./aiwg",
      "allowed": ["read", "write", "commit", "push", "issue-comment"]
    },
    {
      "name": "research-papers",
      "path": "/srv/research-papers",
      "allowed": ["read", "issue-comment"]
    }
  ]
}
```

## Legacy Manifest Shape

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

## Correct Behavior

If asked to edit an adjacent repo that is not listed:

1. Stop before editing.
2. Explain that the manifest denies unlisted repo work.
3. Ask for a manifest update or explicit operator instruction to add the repo.

If asked to comment on an issue in a handoff-only repo:

1. Check `issue-comment`.
2. Load that member's `remotes.issue_tracker` and `tracker_actor`.
3. Proceed only if the manifest, route, and actor all allow it.

## Incorrect Behavior

- Editing a sibling repository because the filesystem is writable.
- Pushing to a repo because `git push` is available.
- Treating `AGENTS.md` in the target repo as sufficient authorization when the workspace manifest denies or omits that repo.
