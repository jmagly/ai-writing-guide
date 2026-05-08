# Extensions vs Addons vs Frameworks vs Plugins

AIWG ships four overlapping artifact-bundle concepts. They sound similar
and the boundaries are subtle, so this doc is the canonical reference for
which one to author when. Project-local artifacts can be any of the four.

## One-sentence definitions

| Type | What it is | Example |
|------|-----------|---------|
| **Extension** | The smallest deployable unit — a single capability (skill, agent, command, hook, rule) wrapped in a bundle | A custom skill `my-team-naming-rules/` |
| **Addon** | A focused feature pack — usually 2–10 related extensions delivered together | `aiwg-utils` (rules + skills + agents working as a coherent set) |
| **Framework** | A complete workflow domain — many addons + curated agents + templates | `sdlc-complete` (190 agents, 386 skills, full SDLC) |
| **Plugin** | A delivery mechanism — packages any of the above for marketplace distribution | A versioned `.zip` containing an addon for `/plugin install` |

The first three are **content**. The fourth is **packaging**.

## Comparison

| Property | Extension | Addon | Framework | Plugin |
|----------|-----------|-------|-----------|--------|
| Granularity | 1 capability | 2–10 capabilities | 50+ capabilities | wraps any of the above |
| Manifest | `manifest.json` with `type: extension` | `type: addon` + `addonConfig` | `type: framework` + `frameworkConfig` | `type: plugin` + `pluginConfig` |
| Lifecycle | edit → deploy | edit → deploy | edit → deploy | package → install |
| Distribution | bundled / project-local / marketplace | bundled / project-local / marketplace | bundled / project-local / marketplace | marketplace only |
| Override semantics | follows shadow-resolution policy (#1041) | same | same | inherited from payload type |
| Project-local? | yes (`.aiwg/extensions/`) | yes (`.aiwg/addons/`) | yes (`.aiwg/frameworks/`) | yes (`.aiwg/plugins/`) |
| Identical-form portability | yes | yes | yes | yes (payload is byte-identical) |
| Graduation path | project-local → upstream | same | same | unwrap payload, then graduate |

## Decision tree — "I want to add X"

```
What are you adding?
│
├─ A single workflow step or rule that helps one specific situation
│   └─→ Extension
│       Example: "skip the linter for files under vendor/"
│
├─ A small set of related capabilities that solve one problem
│   └─→ Addon
│       Example: "Postgres query helpers" (3 skills + 1 agent + 2 templates)
│
├─ A complete domain workflow with many specialized agents
│   └─→ Framework
│       Example: "Healthcare-specific SDLC with HIPAA reviewers"
│
└─ I want to publish my addon/framework so others can install it
    └─→ Plugin
        Example: a marketplace-distributed addon with versioning
```

## Common scenarios

| You want to... | Author | Live under |
|----------------|--------|------------|
| Add a single rule the team always forgets | Extension | `.aiwg/extensions/` |
| Add a custom voice profile + matching agents | Addon | `.aiwg/addons/` |
| Build a regulated-industry SDLC variant | Framework | `.aiwg/frameworks/` |
| Distribute your addon publicly | Plugin (wraps your addon) | marketplace |
| Override an upstream skill for your team only | Extension | `.aiwg/extensions/` (shadow w/ override) |
| Override a *safety-critical* upstream rule | Extension | `.aiwg/extensions/` w/ explicit `overrides:` |

## Plugin vs the other three

Plugins are not "yet another content type." A plugin contains one of the
other three as its **payload**. The manifest captures this:

```json
{
  "type": "plugin",
  "pluginConfig": {
    "payloadType": "addon",
    "payloadPath": "payload/"
  }
}
```

When you run `/plugin install`, AIWG unpacks the payload and hands it to
the addon/framework/extension deploy pipeline. The plugin layer adds
versioning, packaging metadata, and marketplace integration — not new
artifact semantics.

## Graduation paths

```
.aiwg/extensions/foo/    ─┐
.aiwg/addons/foo/        ─┤
.aiwg/frameworks/foo/    ─┤── aiwg promote → upstream (agentic/code/{addons,frameworks}/)
.aiwg/plugins/foo/       ─┘                ↓
                                            corpus (your team's private tree)
                                            ↓
                                            marketplace (plugin-packaged)
```

The **identical-form portability invariant** ([ADR #1038](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md))
means a project-local bundle is byte-identical to its upstream form.
`aiwg promote` is therefore a copy + verify; no rewrite, no migration.

## Cross-references

- Bundle manifest schema: [`@src/extensions/types.ts`](../../src/extensions/types.ts), [`design-manifest-schema.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-manifest-schema.md)
- Identical-form ADR: [`adr-identical-form-portability.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)
- Directory layout ADR: [`adr-aiwg-directory-layout.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-aiwg-directory-layout.md)
- Override / shadow policy: [`adr-override-shadow-policy.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-override-shadow-policy.md)
- Scaffolding CLI: `aiwg new-bundle <name> --type {extension|addon|framework|plugin}`
- Lifecycle guide: [`project-local-lifecycle.md`](project-local-lifecycle.md)
- 5-minute quickstart: [`project-local-quickstart.md`](project-local-quickstart.md)
