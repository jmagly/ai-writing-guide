---
namespace: aiwg
name: promote
platforms: [all]
description: Promote or graduate a project-local bundle to its upstream AIWG location or to a private corpus path.
triggers:
  - promote bundle
  - promote project-local
  - graduate project-local bundle
  - graduate to upstream
  - project-local bundle
---

# Promote Project-Local Bundle

Graduate a proven project-local bundle without losing its source provenance.

## Behavior

1. Identify the project-local bundle and its intended destination.
2. Preview the copy and registry transition:

   ```bash
   aiwg promote <name> --dry-run
   ```

3. Promote to the declared upstream location or a private corpus:

   ```bash
   aiwg promote <name> --to upstream
   aiwg promote <name> --to corpus <path>
   ```

4. Use `--cleanup` only when the project-local source should be removed after
   successful promotion. Use `--force` only after reviewing a destination
   conflict.

## Safety

- Run `aiwg doctor` and a dry run before promotion.
- Promotion verifies the bundle manifest and destination before copying.
- Omit `--cleanup` to retain the project-local source.

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — `promote` command handler
- @$AIWG_ROOT/src/extensions/project-local-promote.ts — promotion implementation
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/steward-quickref/SKILL.md
