# Vitest 4 Test Runtime

AIWG's test toolchain is synchronized on Vitest 4.1.10:

- `vitest`
- `@vitest/ui`
- `@vitest/coverage-v8`

Run the normal suite with `npm test`, the interactive runner with
`npm run test:ui`, and the opt-in asynchronous resource leak diagnostic with
`npm run test:leaks`.

## Adopted Vitest 4 behavior

- All configs use the Vitest 4 worker controls: `maxWorkers`,
  `fileParallelism`, and `isolate`. The removed `poolOptions` API is not used.
- Sequential socket- and live-provider suites retain their prior one-worker,
  shared-process behavior with `maxWorkers: 1`, `fileParallelism: false`, and
  `isolate: false`.
- The primary suite retains the explicit `threads` pool and eight-worker cap.
- V8 coverage uses Vitest 4's AST-based source remapping. Coverage changes after
  this migration must be reviewed as measurement changes before thresholds are
  adjusted.
- `test:leaks` exposes Vitest 4's async-resource leak detector without making
  every routine test run pay its cost.
- Config paths use native ESM `import.meta.dirname`, eliminating the Vite native
  config-loader compatibility warning.

## Test compatibility changes

- Test options now use Vitest 4's `test(name, options, handler)` argument order.
  The deprecated third-argument form was removed in Vitest 4.
- A module mock used as a class constructor must be implemented with a
  constructable `function` or `class`. Arrow-function factories are retained
  only for dependencies that are invoked as ordinary functions.

## Deliberately deferred

- Browser Mode is not enabled; AIWG's browser and Cockpit tests have dedicated
  harnesses and need an evidence-backed migration plan.
- Test projects are not consolidated into one config. The current UAT,
  conformance, contract, and live-suite boundaries encode different isolation,
  timeout, and credential policies.
- Async leak detection is opt-in until the existing long-running integration
  corpus has a measured clean baseline.

## Runtime prerequisite

Vitest 4 itself supports Node 20, 22, and 24+, while its current Vite dependency
requires Node 20.19+ or 22.12+. AIWG's published runtime remains Node 20+, but
contributors running the test suite should use Node 20.19+, 22.12+, or 24+.

## Migration verification

At minimum, changes to this toolchain should run:

```bash
npx vitest --version
npm run uat -- --passWithNoTests
npm run test:conformance -- --passWithNoTests
npm run test:sessions:sqlite
npm test
```

The full suite may also require optional native feature dependencies. Missing
optional dependencies must be reported separately from Vitest compatibility
failures rather than hidden by changing or deleting tests.
