---
title: Project Quickrefs
description: Define, generate, deploy, and validate a project-specific always-visible orientation skill.
---

# Project Quickrefs

A project quickref is a short orientation artifact for critical local
processes. It tells an agent which project workflow takes precedence and how to
retrieve the authoritative skill, agent, command, or rule with `aiwg discover`
and `aiwg show`. It does not copy full workflow bodies into startup context.

## Canonical source

Commit one `.aiwg/quickref.json` file:

```json
{
  "version": "1",
  "project": {
    "id": "acme-console",
    "name": "Acme Console",
    "description": "Repository-specific orientation for Acme Console."
  },
  "precedence": "Use listed project processes before generic AIWG workflows when they apply.",
  "entries": [
    {
      "title": "Issue handling",
      "summary": "Use the repository issue workflow before generic issue tooling.",
      "discover": ["project issue handling"],
      "show": [{ "type": "skill", "name": "project-issue-workflow" }]
    }
  ]
}
```

The `project.id` is kebab-case and forms the globally collision-resistant skill
name `aiwg-project-<id>-quickref`. Choose an organization-qualified id when a
provider uses a user-global skill root. Deployment refuses to replace an
operator-owned directory or a quickref with the same id owned by another local
project.

Each entry must include at least one `discover` phrase or `show` hint. Show
types are `skill`, `agent`, `command`, and `rule`.

## Generate and deploy

```bash
aiwg quickref generate --project --dry-run  # deterministic preview, no writes
aiwg quickref generate --project            # write expendable generated skill
aiwg quickref deploy --project              # all configured providers
aiwg quickref deploy --project --provider warp
```

Generation writes
`.aiwg/generated/project-quickref/<skill-name>/SKILL.md`. Repeated generation is
byte-identical for unchanged source. `aiwg use <project-local-bundle>` and
normal framework deployment also refresh the quickref when the canonical source
exists.

Deployment resolves each target through the provider definition:

- project-scoped providers use their project kernel skill directory;
- user-global providers use their home kernel directory and the project id in
  the skill name prevents ambiguous unqualified names;
- aggregated providers such as Warp and Windsurf use their supported kernel
  skill target;
- providers without a kernel target use their defined skill surface as an
  explicit emulation target.

Every deployed directory includes an AIWG ownership marker. Redeployment may
prune stale quickrefs only when that marker identifies the same source project.
Files without the marker are operator-owned and are never deleted or replaced.

## Validation and precedence

`aiwg doctor --project-local` validates the JSON schema, generated output, and
configured-provider copies. Missing or changed copies are reported as drift.

Keep the quickref small. Its job is to make important local processes visible,
state explicit precedence, and point to indexed assets. Put detailed steps in
project-local skills or rules so startup context grows with the number of
critical routing decisions, not with the size of every workflow.

