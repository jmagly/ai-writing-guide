# Design: Bundle Manifest Schema (Zod)

## Status

**PROPOSED** — companion to [#1038](../../../../issues/1038), [#1041](../../../../issues/1041); required by [#1034](../../../../issues/1034)

## Date

2026-05-01

## Context

### Trigger

Project-local artifact discovery ([#1034](../../../../issues/1034)) needs a canonical `manifest.json` schema shared by all four bundle types — extensions, addons, frameworks, plugins. The schema must be:

- **Strict enough** to catch malformed manifests at validation time and to enforce DoS limits from the threat model ([#1042](../../../../issues/1042))
- **Permissive enough** to round-trip existing upstream manifests without forcing a content rewrite (the identical-form invariant from [#1038](../../../../issues/1038) requires this)
- **Convergent** — the addon manifest (`agentic/code/addons/<name>/manifest.json`) and framework manifest (`agentic/code/frameworks/<name>/manifest.json`) currently have different shapes. [#1038](../../../../issues/1038) §4 declared their convergence to be required for the invariant; this design specifies the converged schema.

### Current state — divergent upstream manifests

**Addon manifest** (e.g., `agentic/code/addons/aiwg-utils/manifest.json`):
```json
{
  "id": "aiwg-utils",
  "type": "addon",
  "name": "AIWG Utilities",
  "version": "1.5.0",
  "description": "...",
  "core": true,
  "autoInstall": true,
  "author": "AIWG Contributors",
  "license": "MIT",
  "repository": "...",
  "keywords": [...],
  "entry": { "agents": "agents/", "skills": "skills/", "rules": "rules/", ... },
  "consolidation": { ... },
  "commands": [...], "agents": [...], "skills": [...]
}
```

**Framework manifest** (e.g., `agentic/code/frameworks/sdlc-complete/manifest.json`):
```json
{
  "name": "SDLC Root",
  "path": "agentic/code/frameworks/sdlc-complete",
  "files": [...],
  "ignore": [...],
  "contextContributions": { ... },
  "consolidation": { ... },
  "memory": { ... }
}
```

Same word "manifest" but mutually unintelligible: addon has `id`, `type`, `version`; framework has `path`, `contextContributions`, `memory`. The two are not interchangeable. The convergence in this design unifies the surface while preserving each bundle type's specific fields under typed nested objects.

### Existing Zod infrastructure

`src/extensions/validation.ts` already defines Zod schemas for the **in-CLI Extension type** (`agent`, `skill`, `command`, etc. — the unified type system). Those are different from this **bundle manifest**: a bundle is the *container* (e.g., the addon directory), and contains *artifacts* (agents, skills, rules) inside it. The bundle manifest declares the bundle; the existing Extension types describe the artifacts within.

This design adds a new schema layer above the existing Extension validation: `BundleManifestSchema` describes the bundle, with type-specific nested config (`AddonConfig`, `FrameworkConfig`, `ExtensionConfig`, `PluginConfig`) for fields that only matter for one type.

### Scope boundary

This design defines:
- The unified `BundleManifestSchema` (Zod) shared by all four bundle types
- Per-type nested config schemas
- Required vs optional fields, size/count limits, deploy-path allowlist
- Validation error structure
- JSON Schema export for IDE autocomplete

It does NOT:
- Implement validation (that lives in [#1034](../../../../issues/1034) discovery and `aiwg validate-metadata`)
- Define the per-artifact (skill / agent / rule) format inside the bundle — those are unchanged
- Migrate existing upstream manifests — the schema accepts the existing addon shape unchanged via additive optional fields

## Design

### 1. Top-Level `BundleManifestSchema`

```typescript
const BundleManifestSchema = z.object({
  // Required core fields
  id: z.string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'kebab-case alphanumeric, no leading/trailing hyphen'),
  type: z.enum(['extension', 'addon', 'framework', 'plugin']),
  name: z.string().min(1).max(128),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'CalVer or SemVer'),
  description: z.string().min(1).max(1024),

  // Required: schema version of THIS manifest format (not the artifact version)
  manifestVersion: z.literal('1'),

  // Required platforms — at least one must be declared
  platforms: PlatformCompatibilitySchema,

  // Required keywords for capability discovery
  keywords: z.array(z.string().max(64)).min(1).max(50),

  // Required deployment configuration
  deployment: DeploymentConfigSchema,

  // Optional: standard metadata
  author: z.string().max(128).optional(),
  license: z.string().max(64).optional(),
  repository: z.string().url().max(512).optional(),

  // Optional: bundle-type-specific nested config (exactly one matches type discriminator)
  addonConfig: AddonConfigSchema.optional(),
  frameworkConfig: FrameworkConfigSchema.optional(),
  extensionConfig: ExtensionConfigSchema.optional(),
  pluginConfig: PluginConfigSchema.optional(),

  // Optional: override / safety-critical declarations (per #1041)
  'safety-critical': z.boolean().optional().default(false),
  overrides: z.array(z.string().max(64)).max(20).optional(),

  // Optional: deprecation
  deprecation: DeprecationSchema.optional(),

  // Optional: memory footprint declaration (existing pattern)
  memory: MemoryFootprintSchema.optional(),

  // Optional: consolidation strategy (existing pattern)
  consolidation: ConsolidationSchema.optional(),
})
.strict()  // refuse unknown top-level keys
.refine(matchesTypeDiscriminator, { message: 'config block must match type' });
```

`.strict()` rejects unknown top-level keys. This is the inverse of the existing extension validation (which is permissive); for project-local manifests we want strict validation to catch typos that would otherwise create silent feature mismatches.

### 2. Type Discriminator Refinement

The `matchesTypeDiscriminator` refinement enforces:

- `type: 'addon'` → `addonConfig` MUST be present; other `*Config` MUST be absent
- `type: 'framework'` → `frameworkConfig` MUST be present; others absent
- `type: 'extension'` → `extensionConfig` MAY be present (extensions can be config-less); others absent
- `type: 'plugin'` → `pluginConfig` MUST be present; others absent

### 3. `AddonConfigSchema`

Codifies the existing addon manifest shape:

```typescript
const AddonConfigSchema = z.object({
  entry: z.object({
    agents: z.string().regex(safePathPattern).optional(),
    skills: z.string().regex(safePathPattern).optional(),
    rules: z.string().regex(safePathPattern).optional(),
    templates: z.string().regex(safePathPattern).optional(),
    prompts: z.string().regex(safePathPattern).optional(),
    hooks: z.string().regex(safePathPattern).optional(),
    commands: z.string().regex(safePathPattern).optional(),
    behaviors: z.string().regex(safePathPattern).optional(),
  }).strict(),

  // Lists of artifacts contained in the bundle (computed at deploy time, declared for stable references)
  agents: z.array(z.string()).max(200).optional(),
  skills: z.array(z.string()).max(500).optional(),
  rules: z.array(z.string()).max(200).optional(),
  templates: z.array(z.string()).max(200).optional(),
  prompts: z.array(z.string()).max(200).optional(),
  hooks: z.array(z.string()).max(50).optional(),
  commands: z.array(z.string()).max(200).optional(),
  behaviors: z.array(z.string()).max(50).optional(),

  core: z.boolean().optional().default(false),
  autoInstall: z.boolean().optional().default(false),
}).strict();
```

The `safePathPattern` is `/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/?$/` — relative paths within the bundle, no `..`, no leading `/`, no special chars.

### 4. `FrameworkConfigSchema`

Codifies the existing framework manifest shape:

```typescript
const FrameworkConfigSchema = z.object({
  // Path within the bundle that the framework's content lives in (defaults to bundle root)
  path: z.string().regex(safePathPattern).optional(),

  // Files relative to bundle root, used by context loading
  files: z.array(z.string().regex(safePathPattern)).max(100).optional(),
  ignore: z.array(z.string().regex(safePathPattern)).max(100).optional(),

  // Hook fragments and section dirs for context contributions
  contextContributions: z.object({
    hookFragment: z.string().regex(safePathPattern).optional(),
    sectionsDir: z.string().regex(safePathPattern).optional(),
    sectionsManifest: z.string().regex(safePathPattern).optional(),
    priority: z.number().int().min(0).max(100).optional(),
    description: z.string().max(512).optional(),
  }).strict().optional(),
}).strict();
```

### 5. `ExtensionConfigSchema` and `PluginConfigSchema`

```typescript
const ExtensionConfigSchema = z.object({
  // Extensions are the most flexible — they can hold any of the artifact lists
  // Inherits the shape of AddonConfigSchema's artifact lists, all optional
  entry: AddonConfigSchema.shape.entry.optional(),
  agents: z.array(z.string()).max(200).optional(),
  skills: z.array(z.string()).max(500).optional(),
  rules: z.array(z.string()).max(200).optional(),
  templates: z.array(z.string()).max(200).optional(),
  hooks: z.array(z.string()).max(50).optional(),
  commands: z.array(z.string()).max(200).optional(),
  behaviors: z.array(z.string()).max(50).optional(),
}).strict();

const PluginConfigSchema = z.object({
  // Plugins are delivery wrappers; payload is an addon, framework, or extension
  payloadType: z.enum(['addon', 'framework', 'extension']),
  payloadPath: z.string().regex(safePathPattern),
}).strict();
```

### 6. Limits (DoS Protection — From `#1042` Threat Model)

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max manifest file size on disk | 64 KB | D1 mitigation |
| Max bundles per project (across all 4 types combined) | 200 | D2 mitigation |
| Max `keywords` per manifest | 50 | Aligns with existing extension validation |
| Max `overrides` per manifest | 20 | Aligns with [#1041](../../../../issues/1041) |
| Max artifact list size (skills, agents, etc.) | 200–500 per list | Prevents adversarial fan-out via long lists |
| Max manifest validation depth | 32 | Zod default; prevents stack overflow on malicious nesting |

### 7. Deploy-Path Allowlist (`DeploymentConfigSchema` Hardening)

The existing `DeploymentConfigSchema` accepts arbitrary `pathTemplate` values. For project-local manifests (and as a tightening for upstream too), this design restricts paths via post-resolution validation:

```typescript
const ALLOWED_DEPLOY_PREFIXES = [
  '.claude/', '.codex/', '.cursor/', '.factory/',
  '.opencode/', '.warp/', '.windsurf/', '.github/',
  '~/.openclaw/', '~/.hermes/'
];

function validateDeployPath(template: string): boolean {
  // 1. Refuse any '..' segment
  if (template.split('/').some(seg => seg === '..')) return false;
  // 2. Refuse absolute paths outside the home-relative allowlist
  if (template.startsWith('/') && !template.startsWith('~/')) return false;
  // 3. Resolved path (after substitution) must start with an allowed prefix
  const resolved = substitutePathVars(template, /* test vars */);
  return ALLOWED_DEPLOY_PREFIXES.some(p => resolved.startsWith(p));
}
```

Validation runs at:
- **Manifest validation time** (against template form with placeholder substitution test)
- **Deploy time** (against resolved final paths) — defense in depth

Both must pass.

### 8. Validation Error Structure

Validation errors from Zod are mapped to a structured form for consistent CLI output and JSON-mode reporting:

```typescript
interface ManifestValidationError {
  path: string;          // e.g., ".aiwg/extensions/foo/manifest.json"
  field: string;         // dot-path within the manifest, e.g., "addonConfig.entry.skills"
  expected: string;      // what the schema expected, e.g., "kebab-case alphanumeric"
  actual: string;        // what was found
  hint?: string;         // optional remediation hint
  severity: 'error' | 'warning';
}
```

Discovery ([#1034](../../../../issues/1034)) collects all errors per manifest; one bad manifest does not abort the whole scan.

### 9. JSON Schema Export

Zod schemas are converted to JSON Schema and published at `docs/schemas/manifest.v1.json` for:

- IDE autocomplete and inline validation in `manifest.json` files
- Third-party tools that consume AIWG bundles
- Stable cross-version contract surface

The conversion is automated via `zod-to-json-schema` in CI.

### 10. Backward Compatibility With Existing Upstream Manifests

**This is the load-bearing convergence requirement.** Existing addon and framework manifests must validate against the unified schema unchanged, OR with a documented one-time migration. Strategy:

| Existing field | Maps to | Migration |
|---------------|---------|-----------|
| Addon `entry`, `commands`, `agents`, etc. | `addonConfig.entry`, `addonConfig.commands`, etc. | One-time migration: nest under `addonConfig` |
| Addon `core`, `autoInstall` | `addonConfig.core`, `addonConfig.autoInstall` | One-time migration: nest under `addonConfig` |
| Framework `path`, `files`, `contextContributions` | `frameworkConfig.path`, etc. | One-time migration: nest under `frameworkConfig` |
| Top-level fields (`id`, `name`, `version`, `description`, `keywords`) | Unchanged | None |
| Framework manifest missing `id`, `type`, `version` | Required by new schema | One-time migration: add fields |

The migration is a single CI script (`tools/migrate-manifests.ts`, out of scope here — implementation in [#1044](../../../../issues/1044) PR or [#1047](../../../../issues/1047)) that runs once at the upstream-content level. After migration, the unified schema validates all existing manifests.

Until migration: the schema MAY accept legacy shapes via a discriminator (`manifestVersion: '0'` for legacy, `'1'` for unified). This design recommends a hard cut to v1 in the same release that ships [#1034](../../../../issues/1034) — the migration is a one-time bulk operation.

### 11. What This Design Does Not Define

- **Per-artifact validation** (skill, agent, rule body): unchanged; existing Zod schemas in `src/extensions/validation.ts` apply.
- **Manifest cryptographic signing**: out of scope; future hardening per [#1042](../../../../issues/1042).
- **Multi-version manifest support**: this design assumes a single `manifestVersion: '1'`. Future bumps to `'2'` would extend the discriminator.

## Decision Drivers

1. **Strict validation catches typos that silently break features** — the existing extension validation is permissive; for new content we want strictness.
2. **Discriminated nesting preserves type-specific fields without flattening into a soup** — `addonConfig` vs `frameworkConfig` keeps each type's fields tidy and lets schema validation enforce discriminator coherence.
3. **DoS limits are non-negotiable** — pulled directly from threat model.
4. **JSON Schema export for IDE autocomplete** — operators authoring manifests benefit dramatically from inline schema validation.
5. **One-time migration of existing upstream manifests is acceptable** — mass renaming is reviewable as a single PR, easier to validate than a permanently dual-shape schema.

## Decision Matrix

| Alternative | Strictness | Type clarity | Migration cost | Score |
|-------------|------------|--------------|----------------|-------|
| **Discriminated unified schema with type-nested config (SELECTED)** | 5 | 5 | 3 | **4.3** |
| Permissive shared schema, type-specific fields top-level | 2 | 2 | 1 | 1.7 |
| Per-type schemas with no shared base | 4 | 5 | 5 | 4.7 — but loses the shared validation surface |
| Strict shared schema, no type-specific fields (drop addon-vs-framework distinction) | 5 | 1 | 5 | 3.7 — defeats the purpose |

## Consequences

### Positive

- One schema validates all four bundle types
- Upstream manifests gain strict schema after one-time migration
- IDE autocomplete via JSON Schema export
- DoS limits and deploy-path allowlist enforce threat-model mitigations
- Matches existing Zod-validation-everywhere pattern in `src/extensions/`

### Negative

- One-time migration of existing addon and framework manifests (mechanical but visible)
- Strict validation rejects manifests with typos that previously worked
- Adds a layer between bundle manifest and per-artifact extension type system; operators must understand both

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration of existing upstream manifests breaks something | Medium | Medium | Migration is mechanical and reviewable; CI runs full deploy + UAT against migrated manifests before merging |
| Validation is too strict and refuses legitimate manifests | Medium | Low | Strictness is opt-in via `.strict()`; can be relaxed per-field if specific fields turn out to need flexibility |
| JSON Schema export drifts from Zod source | Low | Low | Automated in CI; failure to regenerate fails the build |
| Operators write `manifestVersion: 0` or omit it | Medium | Low | Validation refuses; error message points to schema docs |

## Implementation Sequence

1. This design accepted
2. Implement Zod schemas in `src/extensions/manifest.ts` (new file, parallel to `validation.ts`)
3. Generate JSON Schema export at `docs/schemas/manifest.v1.json`
4. One-time migration script for existing upstream manifests (handed off to [#1044](../../../../issues/1044) PR)
5. [#1034](../../../../issues/1034) discovery uses the schema for project-local manifest validation
6. `aiwg validate-metadata` adds project-local manifest path support

## References

- Epic [#1033](../../../../issues/1033)
- [#1038](../../../../issues/1038) — Identical-form invariant (§4 declared this convergence required)
- [#1041](../../../../issues/1041) — Override / shadow policy (defines `safety-critical` and `overrides` semantics)
- [#1042](../../../../issues/1042) — Threat model (DoS limits and deploy-path allowlist sourced here)
- [#1034](../../../../issues/1034) — Discovery (consumes this schema for validation)
- [#1050](../../../../issues/1050) — Scaffolding CLI (templates produce manifests valid against this schema)
- `src/extensions/validation.ts` — existing Zod validation patterns this builds on
- `src/extensions/types.ts` — per-artifact Extension types (orthogonal to bundle manifest)
- `agentic/code/addons/aiwg-utils/manifest.json` — current addon manifest example to migrate
- `agentic/code/frameworks/sdlc-complete/manifest.json` — current framework manifest example to migrate
