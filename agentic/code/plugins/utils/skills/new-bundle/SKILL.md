---
namespace: aiwg
name: new-bundle
platforms: [all]
description: Scaffold a project-local extension, addon, framework, plugin, or provider bundle under the configured AIWG artifact root.
triggers:
  - new-bundle
  - new bundle
  - scaffold project-local
  - create project-local bundle
  - project-local bundle
  - new extension
  - new addon
  - new provider
---

# New Bundle

Create a version-controlled project-local bundle under `.aiwg/`.

## Behavior

1. Determine the bundle name and type.
2. Select an optional starter artifact.
3. Preview when requested, then run:

   ```bash
   aiwg new-bundle <name> \
     [--type extension|addon|framework|plugin|provider] \
     [--starter skill|rule|agent|minimal] \
     [--description "..."] \
     [--dry-run]
   ```

4. Deploy the completed bundle with `aiwg use <name>`.
5. Validate project-local health with `aiwg doctor`.
6. When the bundle is ready to graduate, use `aiwg promote <name> --dry-run`.

The default type is `extension`; the default starter is `skill`. The aliases
`new-extension`, `new-addon`, `new-framework`, `new-plugin`, and `new-provider`
select their corresponding type.

## Safety

- Use `--dry-run` before scaffolding when the target or layout is uncertain.
- Refuse to overwrite an existing bundle.
- Keep project-local source in version control; provider deployment copies are
  generated artifacts.

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — `new-bundle` command handler
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/steward-quickref/SKILL.md
