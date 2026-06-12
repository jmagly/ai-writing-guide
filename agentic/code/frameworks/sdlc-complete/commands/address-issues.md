---
description: Address selected issues via the address-issues skill (auto-detects the project tracker — gitea/github/local). A narrow local-only CLI exists for the .aiwg/issues/ backend.
category: project-management
argument-hint: "<issue-id...> [--all-open] [--limit N] [--guidance \"...\"]"
allowed-tools: Bash, Read, Write, Edit
model: claude-sonnet-4-6
---

# Address Issues

**This is a skill-driven workflow, not a single CLI command.** Do not try to run
`aiwg address-issues <id>` as the way to address a tracker issue. Instead, load
and follow the `address-issues` skill:

```bash
aiwg show skill address-issues   # then follow its instructions
```

The skill auto-detects the project's issue tracker from `remotes.issue_tracker`
in `.aiwg/aiwg.config` (gitea / github / local) and runs the full loop: threat
preflight → prioritization → per-issue agent loop → verification → issue-thread
comments and close-out. For a Gitea/GitHub-hosted issue number (e.g. a tracker
issue like `#1522`), this skill path is the correct and only route.

## Do NOT run `aiwg address-issues <id> --provider local` for tracker issues

`aiwg address-issues` is a **local-backend-only** CLI. It operates solely on the
local `.aiwg/issues/` store. For an issue hosted on Gitea/GitHub it will error:

```
ERROR address-issues CLI workflow support is currently local-only;
      pass --provider local or use the configured external tracker workflow
```

Read that message literally: *"or use the configured external tracker workflow"*
means **follow the skill** (above). It does **not** mean add `--provider local` —
`--provider local` points at `.aiwg/issues/`, where a Gitea/GitHub issue number
does not exist, so the run will find nothing or act on the wrong issue.

## Local backend only: `.aiwg/issues/`

The CLI entrypoint applies **only** when `remotes.issue_tracker` is the local
file store and you are addressing a local `LOCAL-####` id:

```bash
aiwg address-issues LOCAL-0001 --provider local
aiwg address-issues --all-open --provider local --limit 3
```

Local mode loads only the selected bounded issue slice from `.aiwg/issues/`,
runs `address-issues-threat-assess` before implementation, and appends an AL
cycle status event for safe issues.
