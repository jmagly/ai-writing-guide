# Consuming Third-Party Marketplaces

AIWG can ingest plugins from any supported marketplace and deploy them across all configured providers. This document describes the design and implementation of the consumer side of the marketplace system.

**Related issue**: #787 (consumer side of #783)

**Status**: Design specification + scaffold implementation

---

## Concept

Today `aiwg use <framework>` deploys AIWG's own bundled frameworks. This extension makes AIWG a universal adapter: install a plugin from any marketplace, deploy it everywhere.

```
aiwg install <source>:<package>      # fetch from marketplace
aiwg use <package> --provider <p>    # deploy across configured providers
```

**Key property**: AIWG already deploys to 10 providers. If it can also ingest from multiple marketplace sources, any compatible plugin from any supported marketplace becomes deployable everywhere — install once, deploy everywhere.

---

## Supported Marketplace Sources

| Source | Identifier format | Install mechanism |
|--------|------------------|------------------|
| ClawHub | `clawhub:<owner>/<package>` | ClawHub CLI or API |
| Cursor | `cursor:<publisher>.<package>` | cursor.com API (partner-only, local cache fallback) |
| Codex | `codex:<package>` | Read from `.agents/plugins/marketplace.json` |
| Claude Code | `claude:<user>/<repo>#<plugin>` | Git clone + `.claude-plugin/` |
| Git (generic) | `git:<url>` | Git clone + manifest detection |

---

## Install + Deploy Flow

```
aiwg install clawhub:aiwg/sdlc
  │
  ├── Detect source adapter (clawhub)
  ├── Fetch from ClawHub
  ├── Validate manifest (name, version, capabilities, namespace)
  ├── Cache locally: ~/.aiwg/marketplace-cache/clawhub/aiwg/sdlc/2026.4.0/
  └── Report: "Installed aiwg-sdlc@2026.4.0 from ClawHub"

aiwg use aiwg-sdlc --provider claude
  │
  ├── Read from ~/.aiwg/marketplace-cache/
  ├── Transform to Claude Code format (reuse existing smiths)
  ├── Deploy to .claude/agents/, .claude/commands/, etc.
  ├── Run collision detector (third-party = warn severity)
  └── Report deployment
```

---

## Architecture

### MarketplaceSource interface

Each source adapter implements a common interface:

```typescript
interface MarketplaceSource {
  /** Source identifier (e.g. 'clawhub', 'cursor', 'codex', 'claude', 'git') */
  readonly source: string;

  /** Fetch a package by identifier */
  fetch(packageId: string, version?: string): Promise<PackageBundle>;

  /** Search the marketplace */
  search(query: string, options?: SearchOptions): Promise<PackageSummary[]>;

  /** Validate a package manifest against the source's schema */
  validate(manifest: unknown): ValidationResult;

  /** List available versions of a package */
  getVersions(packageId: string): Promise<string[]>;
}

interface PackageBundle {
  /** Normalized AIWG-internal metadata */
  metadata: {
    name: string;
    version: string;
    namespace: string;       // 'aiwg' or third-party
    source: string;          // marketplace source
    description: string;
    license: string;
  };
  /** Artifacts in AIWG-internal layout */
  artifacts: {
    agents?: string[];       // paths to agent files
    commands?: string[];
    skills?: string[];
    rules?: string[];
    behaviors?: string[];
  };
  /** Raw manifest from the source marketplace (for update detection) */
  rawManifest: Record<string, unknown>;
}
```

### Source adapters

Implementation location: `src/marketplace/sources/<source>.ts`

| Source | Adapter file | Status |
|--------|-------------|--------|
| ClawHub | `src/marketplace/sources/clawhub.ts` | Scaffold (fetch + validate) |
| Cursor | `src/marketplace/sources/cursor.ts` | Scaffold (validate only — API submission partner-only) |
| Codex | `src/marketplace/sources/codex.ts` | Scaffold (read local marketplace.json) |
| Claude Code | `src/marketplace/sources/claude-code.ts` | Scaffold (git clone) |
| Git (generic) | `src/marketplace/sources/git.ts` | Scaffold (clone + manifest detection) |

Each adapter handles:
- Source-specific fetch (git clone, API call, local file read)
- Manifest parsing and normalization to AIWG's internal format
- Version resolution (SHA, semver, tag)
- Rate limiting / auth (if the source requires it)

### Local cache

```
~/.aiwg/marketplace-cache/
├── clawhub/
│   └── aiwg/
│       └── sdlc/
│           ├── 2026.4.0/
│           │   ├── manifest.json      # normalized AIWG manifest
│           │   ├── raw-manifest.json  # original source manifest
│           │   ├── agents/
│           │   ├── commands/
│           │   └── skills/
│           └── 2026.3.0/              # older version
├── cursor/
│   └── some-publisher/
│       └── some-plugin/
│           └── 1.2.0/
├── codex/
├── claude/
└── git/
```

**Cache invalidation**:
- Version-based: new version = new cache entry (old versions retained for rollback)
- Manual: `aiwg cache clean <package>` removes a specific package
- Age-based: optional TTL via `aiwg cache clean --older-than 30d`

### Namespace isolation

Third-party plugins install under their own namespace, not `aiwg/`:

```
{baseDir}/{namespace}/{namespace}-{name}/SKILL.md
```

Examples:
- `.claude/skills/aiwg/aiwg-sdlc/SKILL.md` — AIWG-owned
- `.claude/skills/acme/acme-auth-toolkit/SKILL.md` — third-party

The collision detector (`src/smiths/skillsmith/collision-detector.js`) handles namespace isolation:

| Case | Severity | Behavior |
|------|----------|----------|
| AIWG file overwriting AIWG file | info | Overwrite silently |
| Third-party file overwriting AIWG file | warn | Prompt user before overwrite |
| Third-party file overwriting third-party file | warn | Prompt user before overwrite |
| First install (no existing file) | n/a | Install cleanly |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `aiwg install <source>:<package>` | Fetch and cache a marketplace plugin |
| `aiwg install <source>:<package> --deploy` | Fetch, cache, and deploy to all configured providers |
| `aiwg install <source>:<package> --provider <p>` | Fetch, cache, and deploy to specific provider |
| `aiwg uninstall <package>` | Remove cached plugin + deployed artifacts |
| `aiwg marketplace search <query>` | Search across all configured marketplaces |
| `aiwg marketplace list` | List installed marketplace plugins |
| `aiwg cache list` | List cached marketplace entries |
| `aiwg cache clean [--package <name>] [--older-than <duration>]` | Clean cache |

---

## Manifest Normalization

Each source has its own manifest format. The consumer normalizes to AIWG's internal format on ingest.

### Normalization rules

| Source field | AIWG internal field | Notes |
|-------------|--------------------|-------|
| `name` (all sources) | `metadata.name` | Preserve dashes (e.g. `aiwg-sdlc`) |
| `version` | `metadata.version` | Use SemVer; convert non-semver to pre-release tags |
| `publisher` (Cursor) / `author` (others) | `metadata.publisher` | Normalized string |
| `contents` / `entry` / inferred | `artifacts.*` | Map to AIWG's agents/commands/skills/rules/behaviors |
| Plugin-specific fields | `metadata.sourceSpecific` | Preserved for update detection |

### Validation

Each source adapter validates:
- Required fields present
- Version format (semver or source-specific)
- Namespace collision with `aiwg/` (third-party plugins cannot claim the `aiwg` namespace)
- File paths in manifest resolve to actual files in the package

---

## Integration with `aiwg use` Pipeline

Marketplace plugins flow through the same smith pipeline as AIWG frameworks:

```
aiwg use aiwg-sdlc --provider claude
  │
  ├── Lookup: is "aiwg-sdlc" a bundled framework or marketplace plugin?
  │   ├── bundled → read from agentic/code/frameworks/
  │   └── marketplace → read from ~/.aiwg/marketplace-cache/
  │
  ├── Apply provider transformations (reuse existing smiths)
  │   ├── agentsmith → transform agent format
  │   ├── skillsmith → transform skill format
  │   └── [provider].mjs → deploy to provider-specific paths
  │
  └── Deploy + collision check + manifest update
```

This means marketplace plugins automatically benefit from AIWG's multi-provider deployment — install once from any marketplace, get deployment to all 10 providers.

---

## Implementation Status

This is a design document + scaffold. The full implementation involves:

### Phase 1 (scaffold — this commit)
- [x] Design document (this file)
- [x] Interface definitions
- [x] Source adapter skeletons
- [ ] CLI command registration

### Phase 2 (MVP)
- [ ] ClawHub source adapter (full fetch + validate)
- [ ] Git source adapter (clone + manifest detection)
- [ ] `aiwg install` command
- [ ] `aiwg uninstall` command
- [ ] Local cache management
- [ ] Collision detector integration

### Phase 3 (expanded coverage)
- [ ] Codex source adapter (read local marketplace.json)
- [ ] Claude Code source adapter (git clone)
- [ ] Cursor source adapter (validate-only, no API)
- [ ] `aiwg marketplace search` across all sources

### Phase 4 (polish)
- [ ] Auto-update via `FORCE_AUTOUPDATE_PLUGINS` equivalent
- [ ] Version pinning and rollback
- [ ] Package signing / verification
- [ ] Marketplace ranking / trust scoring

---

## Open Design Questions

1. **Cross-source namespace conflicts**: If a ClawHub plugin named `foo/bar` and a Cursor plugin named `foo.bar` are both installed, how do we resolve namespace conflicts? Proposal: source prefix in the namespace — `clawhub/foo-bar` vs `cursor/foo-bar`.

2. **Dependency chains**: A marketplace plugin might depend on another marketplace plugin. Do we resolve transitive dependencies automatically, or require explicit install? Proposal: explicit for MVP; automatic resolution in later phase.

3. **Update policy**: Auto-update on `aiwg refresh` or explicit `aiwg update <package>`? Proposal: explicit for MVP; auto-update as opt-in via config flag.

4. **Signing**: Marketplace plugins could be signed to prevent supply chain attacks. MVP: no signing, rely on source reputation. Later: GPG signature verification.

---

## Related

- **#783** — Producer side (publishing AIWG to marketplaces)
- **#787** — This issue (consumer side)
- **ADR-016** — Claude Code plugin distribution architecture
- `docs/providers/marketplace.md` — Producer-side marketplace reference
- `src/smiths/skillsmith/collision-detector.js` — Existing collision detection
