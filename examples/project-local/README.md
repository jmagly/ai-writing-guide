# Project-Local Bundle Examples

Reference projects for the `.aiwg/{extensions,addons,frameworks,plugins}/<name>/`
layout. Each example here is shaped so you can copy it directly into
your own project's `.aiwg/` directory.

## Generate an example interactively

The fastest way to see a working bundle:

```bash
aiwg new-bundle example-rules --type extension --starter rule
```

That command creates `.aiwg/extensions/example-rules/` with:

- `manifest.json` — valid against the canonical schema
- `README.md` — usage + identical-form portability reminder
- `rules/example-rules.md` — starter rule with frontmatter

You can then deploy it (`aiwg use example-rules`), edit it, and graduate
it (`aiwg promote example-rules --dry-run`) all without writing anything
by hand.

## Available starter shapes

| Starter | Produces | Best for |
|---------|----------|----------|
| `--starter skill` (default for extension/addon) | `skills/<name>-skill/SKILL.md` | Workflows triggered by phrase or intent |
| `--starter rule` | `rules/<name>.md` | Behavior policies enforced across agents |
| `--starter agent` | `agents/<name>.md` | A specialized AI persona with frontmatter |
| `--starter minimal` | manifest + README only | When you'll add the artifacts yourself |

## Real examples in this repo

This repository dogfoods AIWG, so the live `.aiwg/` directory has real
bundles you can browse:

```bash
ls .aiwg/extensions/   # if any are present
ls .aiwg/addons/       # ditto
```

Outside this repo, the upstream `agentic/code/addons/` directory shows
what the byte-identical upstream form looks like. A project-local bundle
is the same shape, just in a different location.

## See also

- [Quickstart](../../docs/customization/project-local-quickstart.md) — first bundle in 5 minutes
- [Lifecycle reference](../../docs/customization/project-local-lifecycle.md)
- [Type disambiguation](../../docs/customization/extensions-vs-addons-vs-frameworks-vs-plugins.md)
- [Troubleshooting](../../docs/customization/project-local-troubleshooting.md)

## Future expansion

Reference projects (a multi-artifact addon, a voice-driven personal
automation example) are tracked as a follow-up. The `aiwg new-bundle`
output is sufficient for most operators starting out — it's a working
example by definition.
