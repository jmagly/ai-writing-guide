# Provider Framework Phase 0 Issue Splits

Source: Gitea #1580, refreshed 2026-07-04.

This file records the child issues filed under #1580 during the 2026-07-04
Phase 0 refresh. The issue bodies are preserved here so the plan remains
versioned with the repository.

## Current Phase 0 Conclusion

#1580 is not obsolete. The current implementation still has provider literals
across deploy, regenerate, MCP, context emission, namespace adapters, provider
resolution, tests, and extension bundle types. The stale part is the exact
inventory and the assumption that the capability matrix alone can become the
single file for everything.

The recommended current plan is:

1. Accept `.aiwg/architecture/adr-provider-definition-registry.md` as the Phase
   0 ADR.
2. File the child issues below.
3. Implement the no-behavior-change schema/loader first.
4. Use golden tests before replacing any writer or path map.

## Filed Issue #1712: ProviderDefinition Schema And Loader

Title:

```text
feat(providers): add ProviderDefinition schema and registry loader
```

Labels:

```text
feature, provider/cross, requires-code
```

Body:

```markdown
Parent: #1580
Depends on: #1650 as Phase 0 input

## Goal

Add a no-behavior-change `ProviderDefinition` schema and registry loader that
can represent every built-in provider currently supported by AIWG.

## Scope

- Define a typed `ProviderDefinition` shape covering id, display name, aliases,
  status, surfaces, detection, artifact paths, kernel skill path, config/context
  files, skill namespace behavior, adapter names, and capability references.
- Add a loader under `src/providers/` that merges built-in provider definition
  data with `agentic/code/providers/capability-matrix.yaml`.
- Add schema validation for required fields, path safety, adapter-name allowlist,
  and alias uniqueness.
- Do not replace existing deploy/regenerate behavior in this issue.

## Acceptance

- Tests prove all current `Platform` values have a provider definition.
- Tests prove aliases normalize consistently with current `normalizeProviderId`.
- Tests prove capability matrix ids and provider definition ids do not drift.
- No deploy output changes.
```

## Filed Issue #1713: Provider Golden Characterization

Title:

```text
test(providers): capture golden deploy and regenerate output before registry migration
```

Labels:

```text
quality, provider/cross, requires-code
```

Body:

```markdown
Parent: #1580

## Goal

Create golden/characterization coverage that proves registry migration does not
remove or change any provider writer.

## Scope

- Capture representative `aiwg use` output for every built-in provider.
- Capture representative `aiwg regenerate` context output for providers that
  emit AIWG.md, AGENTS.md, CLAUDE.md hooks, WARP.md, `.windsurfrules`, or
  provider-specific twins.
- Include home-scope providers (`openclaw`, `openhuman`, `hermes`) using temp
  HOME/XDG roots.
- Include runtime `.mjs` MCP provider injection behavior.

## Acceptance

- Golden tests fail on path, filename, extension, aggregation, or writer removal.
- Tests can run without touching the real home directory.
- Registry migration issues can cite these tests as the equivalence gate.
```

## Filed Issue #1714: Replace Provider Resolution Literals

Title:

```text
refactor(providers): route provider ids, aliases, env markers, and process detection through registry
```

Labels:

```text
refactor, provider/cross, requires-code
```

Body:

```markdown
Parent: #1580
Blocked by: ProviderDefinition schema and loader

## Goal

Replace hardcoded provider id and alias logic in `src/cli/provider-resolution.ts`
with registry reads.

## Scope

- `PROVIDERS` comes from the registry.
- `normalizeProviderId` resolves aliases from provider definitions.
- `capabilityProviderId` uses the provider definition capability id.
- runtime environment and process-tree markers come from provider definitions.
- Preserve current behavior for `claude-code`→`claude` and `openai`→`codex`.

## Acceptance

- Existing provider-resolution unit tests pass.
- New tests cover alias collisions and unknown provider behavior.
- No deploy output changes.
```

## Filed Issue #1715: Collapse Path Maps Into Registry Reads

Title:

```text
refactor(providers): replace deploy, regenerate, and smith path maps with ProviderDefinition reads
```

Labels:

```text
refactor, provider/cross, requires-code
```

Body:

```markdown
Parent: #1580
Blocked by: ProviderDefinition schema and loader
Blocked by: provider golden characterization

## Goal

Collapse duplicate provider path maps into the provider registry without
changing output.

## Scope

- Replace `src/smiths/platform-paths.ts` maps with registry reads.
- Replace `PROVIDER_PATHS` and `PROVIDER_KERNEL_SKILL_PATHS` in
  `src/cli/handlers/use.ts`.
- Replace `PROVIDER_PATHS_MIN` in `src/cli/handlers/regenerate.ts`.
- Replace provider-policy sets with context-file fields from the registry.
- Replace namespace adapter table lookups with registry namespace fields.

## Acceptance

- Golden deploy/regenerate tests remain byte-identical.
- Existing namespace adapter and context-pipeline tests pass.
- No provider writer is deleted.
```

## Filed Issue #1716: Runtime MJS MCP Provider Registry Bridge

Title:

```text
refactor(mcp): make runtime .mjs provider injection read ProviderDefinition data
```

Labels:

```text
refactor, provider/cross, mcp, requires-code
```

Body:

```markdown
Parent: #1580
Blocked by: ProviderDefinition schema and loader

## Goal

Stop maintaining a separate provider list and config-path switch in the runtime
MCP `.mjs` surface.

## Scope

- Keep `src/mcp/cli.mjs` executable and ESM-compatible.
- Expose a runtime-safe provider definition reader usable from `.mjs`.
- Replace `SUPPORTED_PROVIDERS`, config path maps, and injection switches where
  the provider definition has equivalent data.
- Preserve TypeScript tests against `src/mcp/registry.ts` and add runtime `.mjs`
  coverage where needed.

## Acceptance

- `aiwg mcp inject --provider <existing>` accepts the same provider ids as
  today.
- Existing MCP registry tests pass.
- No provider-specific MCP config path changes unless covered by a separate
  behavior-change issue.
```

## Filed Issue #1717: Project-Local Provider Bundle Type

Title:

```text
feat(extensions): add provider as a project-local bundle type
```

Labels:

```text
feature, provider/cross, kind/extension, requires-code
```

Body:

```markdown
Parent: #1580
Blocked by: ProviderDefinition schema and loader

## Goal

Allow operators to author providers under `.aiwg/providers/<name>/` and route
them through the same lifecycle as project-local extensions/addons/frameworks.

## Scope

- Add `provider` to `ProjectLocalTypeSchema`.
- Add `.aiwg/providers/<name>/` scaffold support.
- Add `providerConfig` manifest validation.
- Include providers in project-local discovery, list, doctor, remove, and
  promote flows.
- Wire `aiwg use <framework> --provider <custom>` to resolve project-local
  provider definitions.

## Acceptance

- `aiwg new-bundle <name> --type provider` or equivalent creates a valid
  provider bundle.
- `aiwg doctor --project-local` validates provider bundles.
- `aiwg promote <provider-bundle>` previews and promotes with identical-form
  semantics.
- A minimal custom provider can be selected by `aiwg use` without editing core
  source.
```

## Filed Issue #1718: Devin/Windsurf Provider Surface Model

Title:

```text
decision(providers): represent Devin/Windsurf identity, surfaces, and path precedence in ProviderDefinition
```

Labels:

```text
enhancement, provider/cross, provider/windsurf
```

Body:

```markdown
Parent: #1580
Refs: #1650

## Goal

Use Devin/Windsurf as the Phase 0 proof that provider identity, compatibility
surfaces, and path precedence must be declarative.

## Scope

- Decide whether `windsurf`, `devin-desktop`, and `devin-cli` are one provider
  with multiple surfaces or multiple provider definitions sharing adapters.
- Represent `.devin/rules/` precedence over legacy `.windsurf/rules/`.
- Represent AGENTS.md rules ingestion.
- Represent Devin product skills at `.agents/skills/<skill-name>/SKILL.md`.
- Preserve backward-compatible `--provider windsurf` behavior.

## Acceptance

- The ProviderDefinition schema can express the chosen topology.
- No `.devin` output is generated or removed until a behavior-change issue
  explicitly implements the decision.
- #1650 can close or narrow after this decision lands.
```
