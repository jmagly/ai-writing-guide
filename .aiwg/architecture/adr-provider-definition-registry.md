# ADR: Provider Definition Registry

## Status

**PROPOSED** — Phase 0 planning artifact for Gitea #1580.

## Date

2026-07-04

## Context

Issue #1580 asks AIWG to make providers first-class, operator-extensible
deployment targets: authored as data, registered locally, deployed without
forking core, and promoted through the same lifecycle as frameworks, addons,
extensions, and plugins.

The epic text is still directionally correct, but it predates several changes:

- The package is now an ESM CLI package (`package.json` has `"type": "module"`,
  Node `>=20`, and `bin.aiwg = bin/aiwg.mjs`).
- OpenHuman is present in the `Platform` union, provider resolution, capability
  matrix, path maps, namespace adapters, and user-scope docs.
- Devin/Windsurf is no longer a simple alias question. #1650 records a
  multi-surface model: `windsurf` compatibility, `.devin/` precedence, product
  skills, Cascade skills, AGENTS.md rules ingestion, and CLI config.
- Project-local bundle infrastructure exists, but `provider` is still not a
  `ProjectLocalType`.
- Provider data is still scattered across TypeScript and runtime `.mjs` files.

External CLI packaging constraints also matter. Node treats `.mjs` files and
packages with `"type": "module"` as ES modules, requires explicit relative file
extensions in ESM imports, and recommends explicit package type markers. npm
CLI packages expose executables through `package.json` `bin`; those executables
must retain a Node shebang. Modern CLI frameworks such as oclif use plugins,
hooks, and JSON output as extensibility patterns, but adopting a framework is
not required for this epic because AIWG already has a project-local bundle
lifecycle.

References:

- Node.js ESM docs: https://nodejs.org/api/esm.html
- Node.js package docs: https://nodejs.org/api/packages.html
- npm `package.json` `bin`: https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#bin
- oclif extensibility/features: https://oclif.io/docs/introduction/ and https://oclif.io/docs/features/

## Current Inventory

These sites still hold provider topology or behavior literals and must converge
on a registry read. This list is current as of 2026-07-04 and supersedes the
older inventory embedded in #1580 where line numbers have drifted.

| Area | Current source | Notes |
|---|---|---|
| Platform type | `src/agents/types.ts` | `Platform` union contains built-ins plus `generic`; docs comment still says OpenHuman agents are `.agents/agents/`, while current deployment uses home/user-scope skills and AGENTS.md bridging. |
| Provider normalization/detection | `src/cli/provider-resolution.ts` | `PROVIDERS`, aliases, env markers, process markers, and capability id normalization are hardcoded. |
| Smith path helpers | `src/smiths/platform-paths.ts` | Separate `Record<Platform, string>` maps for commands, agents, skills, rules, config files, aggregation, and extensions. |
| Use deploy paths | `src/cli/handlers/use.ts` | `PROVIDER_PATHS`, `PROVIDER_KERNEL_SKILL_PATHS`, mirrored command-skill sets, and repeated lookups. This is still the broadest path map. |
| Regenerate paths | `src/cli/handlers/regenerate.ts` | `PROVIDER_PATHS_MIN` is a subset duplicate of deploy paths. |
| Context emission policy | `src/smiths/context-pipeline/provider-policy.ts` | AGENTS.md, AIWG.md, and CLAUDE.md hook predicates are literal provider sets. |
| Namespace adapters | `src/smiths/skillsmith/namespace-adapter.ts` | Deployment group, path type, skill root, recursion behavior, and description limits are literal per provider. |
| Capability matrix | `agentic/code/providers/capability-matrix.yaml` and `src/providers/capability-matrix.ts` | Already the closest thing to a provider data source, but it does not cover all path, adapter, detection, and project-local lifecycle needs. |
| Agent format adapter | `src/agents/agent-packager.ts` | `switch (platform)` selects provider-specific transforms and extensions. |
| MCP injection | `src/mcp/registry.ts` and `src/mcp/registry.mjs` | TypeScript and runtime ESM copies each maintain provider lists, config paths, and provider switches. Runtime `.mjs` cannot be ignored because `src/mcp/cli.mjs` imports it directly. |
| Extension bundle type | `src/extensions/manifest.ts` and `src/extensions/project-local-scaffold.ts` | `ProjectLocalTypeSchema` and `TYPE_TO_DIR` omit `provider`; this is the lifecycle gap for #1580. |
| Tests | `test/integration/provider-file-locations.test.ts`, `test/integration/deployment-completeness.test.ts`, `test/unit/*provider*`, `test/unit/extensions/*` | Many expectations duplicate provider paths. Registry migration needs characterization/golden tests before replacing literals. |

## Decision

Create a `ProviderDefinition` registry as the single provider topology source.
The registry is data-first, but it dispatches named adapters instead of storing
executable code in provider manifests.

### Shape

At minimum, each provider definition includes:

```ts
interface ProviderDefinition {
  id: string;
  displayName: string;
  aliases: string[];
  status: 'stable' | 'experimental' | 'deprecated';
  builtIn: boolean;

  surfaces: {
    primary: string;
    compatibility?: string[];
    precedence?: string[];
  };

  detection: {
    env?: string[];
    process?: string[];
    capabilityId?: string;
  };

  paths: {
    deployTarget: 'project' | 'home' | 'mixed';
    artifacts: Record<'agents' | 'commands' | 'skills' | 'rules' | 'behaviors', string | null>;
    kernelSkills?: string | null;
    configFile?: string | null;
    contextFiles?: {
      aiwgMd: boolean;
      agentsMd: boolean;
      claudeMdHook: boolean;
      hookFile?: string;
    };
  };

  skillNamespace: {
    deploymentGroup: 'deep-recursion' | 'one-level' | 'mcp-skip';
    pathType: 'project' | 'home-dir';
    skillsBaseDir: string;
    subdirLayout: boolean;
    maxNameLength?: number;
    maxDescriptionLength?: number;
  };

  adapters: {
    agentFormat: string;
    hookBridge?: string;
    mcpInjection?: string;
    contextAggregation?: string;
    ruleFormat?: string;
  };

  capabilities: {
    matrixRef?: string;
    nativeFeatures: Record<string, boolean>;
    emulation: Record<string, string | null>;
  };
}
```

### Data Location

Use `agentic/code/providers/` as the built-in provider data root and preserve
`capability-matrix.yaml` as the capability source during the first migration.
Add a provider-definition loader beside `src/providers/capability-matrix.ts`
that merges:

1. built-in provider definition data;
2. capability matrix records;
3. project-local provider bundles from `.aiwg/providers/<name>/`.

This avoids turning `capability-matrix.yaml` into an oversized mixed-concern
file while still preserving steward compatibility.

### Project-Local Lifecycle

Extend project-local bundle types to include `provider`:

- `ProjectLocalTypeSchema`: add `'provider'`;
- scaffold root: `.aiwg/providers/<name>/`;
- manifest: add `providerConfig`;
- list/doctor/discovery/promote: treat provider bundles like other project-local
  bundles;
- deployment: `aiwg use <framework> --provider <custom>` resolves through the
  provider registry.

Provider manifests may name adapters, but they may not embed executable
JavaScript. Custom code belongs in reviewed AIWG source or a separately trusted
plugin path. This keeps provider definitions auditable data.

### ESM/MJS CLI Boundary

Because AIWG ships TypeScript build output plus runtime `.mjs` modules, the
registry must expose both:

- a TypeScript API for typed code and tests;
- an ESM-compatible runtime module that `.mjs` entry points can import without
  transpilation-time assumptions.

Relative ESM imports must include file extensions. JSON/YAML provider data
should be loaded through `fs` plus schema validation, not imported with
unstable or version-sensitive loader behavior.

## Consequences

### Positive

- Adding or correcting a provider becomes data + adapter selection, not a
  multi-file source edit.
- `steward`, `runtime-info`, deploy, regenerate, skill namespace deployment,
  and MCP injection can converge on one provider id/alias/path model.
- Devin/Windsurf can be represented as surfaces and precedence rules instead of
  hardcoded one-off branches.
- Custom providers use the existing project-local lifecycle and promotion
  workflow.

### Negative

- A behavior-identical migration requires a temporary compatibility layer while
  old path helpers become registry reads.
- Runtime `.mjs` and TypeScript surfaces both need coverage until the MCP CLI is
  folded into the build pipeline or generated from a shared source.
- Golden tests are mandatory before deleting any old literal map.

### Risks

| Risk | Mitigation |
|---|---|
| Provider output changes silently | Capture golden deploy/regenerate output before replacing path maps. |
| Custom provider manifests become code execution vectors | Definitions are data-only; adapter names resolve against a reviewed allowlist. |
| Capability matrix and provider definitions drift | Loader merges and validates both; doctor reports drift. |
| Home-directory providers write unsafe paths | Schema validates deploy target, path kind, path traversal, and allowed home roots. |

## Implementation Sequence

1. Add a no-behavior-change provider-definition schema and loader.
2. Port built-in definitions as data seeded from existing maps.
3. Add characterization/golden tests for deploy, regenerate, namespace, and MCP
   config behavior.
4. Replace `provider-resolution.ts` provider id/alias/detection literals with
   registry reads.
5. Replace `platform-paths.ts`, `use.ts`, `regenerate.ts`, provider-policy, and
   namespace-adapter maps with registry reads.
6. Replace agent-format, hook-bridge, context aggregation, and MCP injection
   switches with named adapter dispatch.
7. Add `provider` as a project-local type, scaffold, doctor, discovery, and
   promote target.
8. Wire `steward` and capability matrix reads to custom provider definitions.

## Acceptance Criteria

- `ProviderDefinition` schema and loader are documented and tested.
- Built-in provider data covers every provider currently in `Platform`.
- Existing deploy and regenerate output remains byte-identical unless a child
  issue explicitly changes provider behavior.
- `provider` appears in project-local manifest validation, scaffold, discovery,
  doctor, list, use, remove, and promote flows.
- `aiwg use <framework> --provider <custom>` works without source edits.
- `steward` can resolve capability data for built-in and project-local
  providers through one registry path.

## Related Issues

- #1580 — parent epic.
- #1650 — Devin/Windsurf topology Phase 0 input.
- #1552, #1559, #1560 — OpenHuman precedent and validation inputs.
- #1529 — reusable provider validation harness sibling.
