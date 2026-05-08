---
title: Project-Local Manifest Reference
description: Pointer to the canonical bundle manifest schema.
---

# Project-Local Manifest Reference

> The manifest format that previously lived here described the old
> `.aiwg/.project/manifest.json` design. The as-shipped manifest is the
> unified bundle manifest used by every project-local artifact type.

## Canonical sources of truth

| Source | What it contains |
|--------|------------------|
| [`design-manifest-schema.md`](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/design-manifest-schema.md) | Full schema design (#1044) |
| [`src/extensions/manifest.ts`](../../src/extensions/manifest.ts) | Zod schema (executable contract) |
| [`src/extensions/types.ts`](../../src/extensions/types.ts) | TypeScript types |

## Minimal valid manifest

```json
{
  "id": "my-bundle",
  "type": "extension",
  "name": "My Bundle",
  "version": "0.1.0",
  "description": "A short, accurate description",
  "manifestVersion": "1",
  "platforms": { "claude": "full" },
  "keywords": ["custom", "project-local"],
  "deployment": { "pathTemplate": ".{platform}/skills/{id}.md" }
}
```

For each `type`, the matching nested config is required:

| `type` | Required nested config |
|--------|----------------------|
| `extension` | `extensionConfig` (optional — extensions may omit it) |
| `addon` | `addonConfig` |
| `framework` | `frameworkConfig` |
| `plugin` | `pluginConfig` |

Path-traversal in `entry` paths (`../../etc`) is refused at validation
time. The manifest must be ≤ 64 KB. See the schema design for the full
constraint set.

## Generate a valid manifest automatically

```bash
aiwg new-bundle <name> --type extension --starter skill
```

Produces `.aiwg/extensions/<name>/manifest.json` with all required
fields filled. You only need to edit `description`, bump `version` to
`1.0.0` when stable, and add platforms beyond `claude` if needed.
