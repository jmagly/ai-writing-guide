---
title: ADR - Source code graph module resolution
phase: architecture
type: adr
created: 2026-07-03
issue: "1699"
parent: "1664"
status: proposed
---

# ADR: Source Code Graph Module Resolution

**Status**: Proposed
**Date**: 2026-07-03
**Issue**: #1699 (parent #1664)
**Related**: #1508, #1551, #1647, #1684, #1690

## Context

AIWG has converged artifact discovery, index query, and Fortemi Core static
cache behavior, but the codebase graph is still not a first-class graph profile.
Agents can search code text and browse files, yet the index cannot reliably
answer source-impact questions such as:

- Which CLI handlers reach this implementation?
- Which tests import this module?
- What depends on this graph adapter?
- Which dynamic imports are runtime entrypoints rather than static source
  dependencies?

#1699 was opened after an earlier graphing attempt likely hit AIWG's real
module-resolution patterns. The most plausible attempted tool is `madge`, which
is recommended by current SDLC technical-debt guidance and was already covered
by prior research in `.aiwg/research/findings/code-graph-indexing-tools.md`.

The current repository uses ESM (`"type": "module"`) and TypeScript with
`moduleResolution: "bundler"`. TypeScript source commonly imports local modules
with emitted `.js` specifiers, while the runtime package entrypoint (`bin/aiwg.mjs`)
uses dynamic imports against built `dist/` files. The root `tsconfig.json` also
declares path aliases (`@sdlc/*`, `@global/*`), but the current measured source
set does not use them in ordinary imports.

## Measurements

Measured on 2026-07-03 with the TypeScript compiler API across `src`, `tools`,
`test`, `config`, `bin`, `apps`, and `vscode-extension`. #1699 also requested
`scripts/`; the current repository has no top-level `scripts/` directory, and
script-shaped automation lives under `tools/`:

| Measure                                         | Count |
| ----------------------------------------------- | ----: |
| JS/TS files scanned                             | 1,210 |
| Import-like edges                               | 5,033 |
| Static import declarations                      | 4,370 |
| Re-export declarations                          |   118 |
| Dynamic `import()` calls with string literals   |   515 |
| CommonJS `require()` calls with string literals |    30 |
| Type-only import/re-export edges                |   351 |
| Relative local specifiers                       | 2,129 |
| Relative `.js` specifiers from source           | 1,547 |
| Extensionless relative specifiers               |    74 |
| Package subpath specifiers                      |   219 |
| Bare package specifiers                         | 2,187 |
| Node builtins                                   |   498 |
| Unresolved non-package specifiers               |    13 |
| Internal edges resolved by TypeScript           | 2,116 |
| External/package/builtin edges                  | 2,904 |

Representative examples:

| Shape                          | Examples                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Relative `.js` from TS         | `test/helpers/mock-handler-context.ts -> ../../src/cli/handlers/types.js`; `src/storage/index.ts -> ./types.js`                              |
| Extensionless relative imports | `vscode-extension/src/participant/handler.ts -> ../cli/runner`; `vscode-extension/test/suite/extension.test.ts -> ../../src/mcp/auto-config` |
| Package subpaths               | `config/vitest.config.js -> vitest/config`; `src/a2a/hitl-driver.ts -> jose/jwt/verify`                                                      |
| Dynamic imports                | `bin/aiwg.mjs -> ../dist/src/channel/manager.mjs`; plugin/runtime loader imports under `src/mcp` and `src/storage`                           |
| Type-only imports              | `test/helpers/mock-handler-context.ts -> ../../src/cli/handlers/types.js`; Node type imports in integration tests                            |
| Unresolved non-package edges   | CSS module imports under `apps/web/src/**/*.module.css`                                                                                      |

The measurements show that regex-only parsing is insufficient. Correct graphing
requires AST extraction plus TypeScript-compatible module resolution so source
`.js` specifiers can resolve to `.ts` implementation files.

## Tool Comparison

The comparison was deliberately run as a spike, not as a dependency change.

| Tool / model                | Result                                                                                                                                                                                                                                                                       | Decision impact                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript compiler API     | Resolved 2,116 internal edges with the repo's `tsconfig.json`; exposes import declarations, re-exports, dynamic imports, type-only markers, and source positions. Already installed.                                                                                         | Primary extraction and resolution engine.                                                                                                                    |
| `madge@8.0.0`               | `npx madge --json --extensions ts,tsx,js,mjs ...` produced an adjacency map, but `--circular` exited nonzero with 10 circular dependencies and 24 warnings. It also includes generated/build surfaces unless carefully scoped.                                               | Useful diagnostic, not a required index builder. Its nonzero circular output should become an audit report, not a graph-build failure.                       |
| `dependency-cruiser@17.3.8` | Full-tree run followed nested app dependencies and produced a huge graph. With `node_modules`, `dist`, `target`, `coverage`, and `.aiwg/.index` excluded it reported 390 modules, 1,120 dependencies, 12 unresolved external/tooling specifiers, and circular-edge evidence. | Useful optional audit/query backend; not the primary AIWG source graph engine because profile boundaries and dependency footprint must stay AIWG-controlled. |
| `ts-morph`                  | Prior research shows it would simplify typed project queries but it is not currently installed and would add dependency weight.                                                                                                                                              | Defer. Reconsider only if symbol-level refactor analysis needs richer APIs than the TypeScript compiler API.                                                 |

## Decision

AIWG will build a first-class `source` graph profile using the TypeScript
compiler API as the primary parser and resolver. AIWG will preserve the current
relative import style for runtime source. It will not introduce broad path
aliases or import maps as part of this graphing work.

This is a graphing decision, not a repo-wide import rewrite. Existing relative
`.js` specifiers in TypeScript source are the correct package/runtime shape for
AIWG's ESM build and npm output. The source graph builder must resolve those
specifier strings to the corresponding source files while preserving the
original specifier for diagnostics.

Path aliases remain allowed only where already configured and proven by tests,
but they are not the preferred style for AIWG core source until a later runtime
and package-boundary ADR decides otherwise. New aliases must not be added just
to make graph output prettier.

## Source Graph Schema

The `source` graph profile should be stored as an AIWG index graph and exported
through Fortemi Core-compatible records after the first local implementation is
stable.

### Node Types

| Node type           | Meaning                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `source.file`       | A concrete source file under an included source root.                       |
| `source.module`     | A resolved module identity when multiple specifiers point at the same file. |
| `source.package`    | External package or package subpath dependency.                             |
| `source.builtin`    | Node builtin module.                                                        |
| `source.asset`      | CSS, JSON, YAML, markdown, or other non-code import target.                 |
| `source.unresolved` | Import-like specifier that could not be resolved under the graph profile.   |
| `source.entrypoint` | Package, CLI, test, config, or generated entrypoint such as `bin/aiwg.mjs`. |

### Edge Types

| Edge type           | Meaning                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `imports`           | Static runtime import from one source file to another module/file/package.                   |
| `imports_type`      | Type-only import or type-only re-export.                                                     |
| `reexports`         | Static `export ... from` edge.                                                               |
| `imports_dynamic`   | String-literal `import()` edge; marked as runtime/lazy.                                      |
| `requires`          | CommonJS `require()` edge from `.js`, `.cjs`, `.mjs`, or test files.                         |
| `depends_external`  | Edge to a package, package subpath, or builtin.                                              |
| `imports_asset`     | Edge to a non-code asset such as CSS modules.                                                |
| `unresolved_import` | Edge preserving unresolved specifier, source position, and resolver diagnostics.             |
| `generated_from`    | Optional edge from generated/built output to source when a profile includes generated files. |
| `exercised_by`      | Derived reverse edge from implementation file to tests that import it.                       |

### Required Metadata

Every source node should include:

- stable ID (`source:<repo-relative-path>` for files; package/builtin IDs for
  external nodes);
- repo-relative path, extension, language, source root, package/workspace area,
  generated/source classification, and checksum;
- optional exported symbols and line/byte counts;
- graph profile (`source`), build timestamp, AIWG version, and input roots.

Every edge should include:

- original specifier string;
- resolved target, if any;
- source location (`line`, `column`);
- module system (`esm`, `cjs`, `dynamic`, `asset`);
- type-only flag;
- confidence (`exact`, `external`, `asset`, `unresolved`, `generated`);
- resolver diagnostics for unresolved edges.

## Graph Profiles And Scope

The first implementation should add a `source` graph profile with explicit
included roots and exclusions. Generated output, nested dependency folders, and
local caches are excluded by default:

- include: `src`, `tools`, `test`, `config`, `bin`, `apps`, `vscode-extension`
  where present;
- exclude: `node_modules`, `dist`, `target`, `coverage`, `.aiwg/.index`, and
  generated package assets unless a generated-output profile explicitly opts in.

This profile boundary is load-bearing. The dependency-cruiser spike showed that
following nested app dependencies without exclusions produces an unusable graph
for AIWG source analysis.

## Fortemi Core Boundary

#1684 made Fortemi Core the target indexing/search substrate, but #1699 adds a
new record domain. The source graph should first be built by AIWG from local
files, then exported as Fortemi-compatible records after the schema is stable.

Fortemi export should carry:

- `aiwg.source.file` records for file/module nodes;
- relationships for imports, re-exports, dynamic imports, type-only imports,
  tests, entrypoints, and unresolved edges;
- chunks suitable for source text search only when package-size and privacy
  constraints allow it;
- graph provenance linking source files to capability artifacts where discover
  metadata can identify CLI/skill entrypoints.

This keeps Fortemi Core responsible for reusable query/traversal once exported,
while AIWG remains responsible for local filesystem scanning, resolver policy,
and fallback graph builds.

## Issue Positioning

- #1664 remains the umbrella convergence issue. This ADR satisfies the
  #1699-specific architecture decision but does not complete the broader
  convergence roadmap by itself.
- #1551 remains the body/chunk embedding acceptance case. Source graph text
  chunks must not be treated as a substitute for research-corpus body embeddings.
- #1508 remains deferred until the provider-neutral corpus-to-storage/index
  boundary is settled. Source graph export must not revive the old direct
  Fortemi REST import path.
- #1647 can consume the source graph later only as an implementation aid for
  snapshot provenance or command reachability. It is still primarily a corpus
  snapshot CLI issue.
- #1583 remains editorially gated. This ADR does not publish the held blog post.

## Consequences

Positive:

- The source graph can answer impact and reachability questions from the same
  graph/index family as artifact and Fortemi-backed discovery.
- Relative `.js` ESM imports remain compatible with current build/runtime
  behavior.
- Unresolved imports become visible graph facts instead of silent omissions.
- Optional tools can remain diagnostics without becoming required install-time
  dependencies.

Negative / trade-offs:

- AIWG must own resolver tests for `.js` specifiers in `.ts` files, dynamic
  imports, assets, package subpaths, and generated entrypoints.
- The first source graph will be structural. Rich symbol/reference analysis is
  deferred unless a later phase adopts `ts-morph` or language-service APIs.
- Circular dependencies should be reported but cannot fail graph builds until
  the project has an accepted cycle policy.

## Follow-Up Implementation Slices

Filed child issues under #1699 / #1664:

1. #1702 - `feat(index): add local source graph builder with TypeScript resolver`
   - Add `aiwg index build --graph source` support.
   - Emit source graph nodes/edges, unresolved diagnostics, and status metadata.
   - Cover `.js` specifiers in `.ts`, extensionless VS Code extension imports,
     dynamic imports, type-only imports, CJS requires, CSS/assets, package
     subpaths, and generated entrypoints.

2. #1703 - `feat(index): expose source graph query/deps/neighbors surfaces`
   - Make `aiwg index query/deps/neighbors --graph source` useful for source
     impact questions.
   - Add JSON fixtures for "what imports this", "what does this reach", and
     "which tests exercise this".

3. #1704 - `feat(fortemi): export source graph records to Fortemi Core`
   - Extend the Fortemi export contract with `aiwg.source.*` records and source
     relationship types.
   - Preserve local fallback and avoid required live Fortemi infrastructure.

4. #1705 - `test(index): add source graph parity and diagnostic fixtures`
   - Add no-regression fixtures comparing TypeScript resolver output, optional
     madge/dependency-cruiser diagnostics, and AIWG graph output.
   - Ensure generated folders and nested dependencies remain excluded unless a
     profile explicitly opts in.

## Verification Notes

Evidence collected for this ADR:

```bash
node --input-type=module <typescript-compiler-api import measurement>
npx --yes madge@8.0.0 --json --extensions ts,tsx,js,mjs src tools test config bin apps vscode-extension
npx --yes madge@8.0.0 --circular --extensions ts,tsx,js,mjs src tools test config bin apps vscode-extension
npx --yes dependency-cruiser@17.3.8 --output-type json src tools test config bin apps vscode-extension --ts-config tsconfig.json --no-config
npx --yes dependency-cruiser@17.3.8 --output-type json src tools test config bin apps vscode-extension --ts-config tsconfig.json --no-config --exclude "(^|/)(node_modules|dist|target|coverage|\\.aiwg/.index)(/|$)"
```

The raw dependency-cruiser full-tree output was intentionally not committed
because it follows nested dependencies and is too large to be a useful artifact.
