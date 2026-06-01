# Research Finding: `.aiwg/.project/` — Project-Local Customization Pattern

**Date**: 2026-04-06  
**Status**: Validated via reference implementation (the shared research corpus)  
**Related Issues**: #750 (feature), #726 (module graph declarations), ADR 2026-04-04 (namespace strategy)

---

## Problem

When a user installs AIWG into a project, the deployed platform directories (`.claude/`, `.codex/`, etc.) become the source of truth for that project's AI workspace. Any project-specific customizations — specialized agents, workflow skills, scripts — live in the platform dir and are lost when the directory is deleted for a clean reinstall.

This creates a dilemma: keep potentially corrupt platform dirs, or accept losing customizations on every `aiwg use`.

## Design: `.aiwg/.project/`

A project-local source container that AIWG treats as a co-equal deployment source alongside bundled frameworks and npm addons.

```
.aiwg/.project/
├── manifest.json          # Project identity + namespace + asset declarations
├── agents/                # Project-local agents (.md files)
├── skills/                # Project-local skills (SKILL.md subdirs)
│   ├── paper-intake/
│   │   └── SKILL.md
│   └── corpus-search/
│       └── SKILL.md
└── scripts/               # Runnable scripts referenced from manifest
```

### manifest.json Schema

```json
{
  "$schema": "https://aiwg.io/schemas/project-manifest.v1.json",
  "name": "my-project",
  "description": "Human-readable description",
  "version": "1.0.0",
  "namespace": "myns",
  "assets": {
    "agents": ["agents/"],
    "skills": ["skills/"]
  },
  "scripts": {
    "setup": "scripts/setup.sh"
  }
}
```

The `namespace` field determines the deployment subdirectory. An agent `agents/foo.md` with `namespace: "corpus"` deploys to `.claude/agents/corpus/foo.md`. A skill `skills/bar/SKILL.md` deploys to `.claude/skills/corpus/bar/SKILL.md`.

This extends the ADR 2026-04-04 namespace strategy (`aiwg/` subdir for AIWG's own assets) to user-controlled namespaces.

## Reference Implementation

`/home/roctinam/dev/research-papers/.aiwg/.project/` is the live reference implementation demonstrating the pattern with real corpus management tooling:

| Asset | Path | Purpose |
|-------|------|---------|
| Agent | `agents/corpus-curator.md` | Paper induction, citation network, corpus health |
| Skill | `skills/paper-intake/SKILL.md` | End-to-end paper induction workflow |
| Skill | `skills/corpus-search/SKILL.md` | Multi-mode corpus query (keyword, semantic, citation, set) |
| Manifest | `manifest.json` | `namespace: "corpus"`, declares agent + skill dirs |

## Implementation Spec (Issue #750)

Three code change areas in the AIWG source:

### 1. `src/cli/handlers/use.ts` — Detection and deployment

After the addon loop (line ~777), add Stage 3:

```typescript
// Stage 3: deploy .aiwg/.project/ if present
const projectManifestPath = path.join(cwd, '.aiwg', '.project', 'manifest.json');
if (fs.existsSync(projectManifestPath)) {
  const projectManifest = JSON.parse(fs.readFileSync(projectManifestPath, 'utf8'));
  await deployProjectLocal(projectManifest, projectManifestPath, providers, opts);
}
```

`deployProjectLocal()` mirrors the addon deploy loop but reads from `.aiwg/.project/` and applies the manifest's `namespace` as a subdir prefix in `PROVIDER_PATHS`.

### 2. `src/config/aiwg-config.ts` — Track in installed registry

Add `'project-local'` to the `source` union in `InstalledEntry` and an optional `path?` field pointing to the manifest:

```typescript
interface InstalledEntry {
  version: string;
  source: 'bundled' | 'npm' | 'project-local';
  path?: string;   // for project-local: relative path to manifest.json
  installedAt: string;
  deployedTo: Record<string, DeployStats>;
  manifestHash?: string;
}
```

Zero-arg `aiwg use` (redeploy all) will then pick up project-local on the same pass as bundled/npm.

### 3. `tools/deploy-agents.mjs` — Namespace-aware deploy

Extend the deploy helper to accept a `namespace` option that prefixes the output subdir:

```javascript
async function deployAssets(sourceDir, targetDir, { namespace } = {}) {
  const outDir = namespace ? path.join(targetDir, namespace) : targetDir;
  // ...existing copy logic...
}
```

## Key Properties

- **Expendable platform dirs**: `rm -rf .claude/ && aiwg use` fully restores AIWG assets + project-local assets
- **Namespace isolation**: project skills live in `skills/corpus/` alongside `skills/aiwg/` — no collision
- **Version-controlled source**: `.aiwg/.project/` commits to the repo; platform dirs stay gitignore-able
- **Zero config for operators**: `aiwg use` auto-detects the container; no CLI flags needed
- **Generalization**: same pattern works for any project, not just research-papers

## Relation to Existing Patterns

- **`memory.creates` in addons**: same "module declares its structural contract, AIWG materializes it" model — just for platform assets instead of memory graphs
- **Module graph declarations (#726)**: frameworks can declare `index.graphs` in their manifest; `.aiwg/.project/` follows the same pattern for skill/agent assets
- **Namespace ADR**: the `namespace` field extends the layered namespace strategy to project-controlled namespaces
