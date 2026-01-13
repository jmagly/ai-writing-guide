# Example: Code Migration Loop

Migrate code between formats/versions iteratively.

## Scenario

You need to migrate code from one format to another (CommonJS to ESM, JavaScript to TypeScript, etc.) and want Ralph to keep iterating until the migration is complete.

## CommonJS to ESM Migration

```bash
/ralph "Migrate src/lib/ from CommonJS to ESM (require to import, module.exports to export)" \
  --completion "node --experimental-vm-modules src/lib/index.mjs runs without errors" \
  --max-iterations 15
```

## JavaScript to TypeScript Migration

```bash
/ralph "Convert src/utils/*.js files to TypeScript with proper types" \
  --completion "npx tsc --noEmit exits with code 0" \
  --max-iterations 20
```

## React Class to Functional Components

```bash
/ralph "Convert src/components/*.tsx class components to functional components with hooks" \
  --completion "npm test passes AND npx tsc --noEmit passes"
```

## Update Dependencies

```bash
/ralph "Update all dependencies to latest versions and fix any breaking changes" \
  --completion "npm test passes AND npm run build succeeds" \
  --max-iterations 25
```

## API Version Migration

```bash
/ralph "Migrate API calls from v1 to v2 endpoints" \
  --completion "npm test -- api passes"
```

## Iteration Example (ESM Migration)

**Iteration 1**:
- Changes `require()` to `import`
- Changes `module.exports` to `export`
- Adds `.mjs` extension
- Result: Module resolution errors

**Iteration 2**:
- Fixes import paths (adds `.mjs` extensions)
- Result: Named export errors

**Iteration 3**:
- Converts default exports to named exports where needed
- Result: A few circular dependency issues

**Iteration 4-6**:
- Restructures to eliminate circular dependencies
- Result: All imports resolve

**Iteration 7**:
- Fixes runtime errors from the conversion
- Result: Module runs successfully!

## Expected Output

```
═══════════════════════════════════════════
Ralph Loop: SUCCESS
═══════════════════════════════════════════

Task: Migrate src/lib/ from CommonJS to ESM
Status: SUCCESS
Iterations: 7
Duration: 12m 18s

Verification:
$ node --experimental-vm-modules src/lib/index.mjs
Library initialized successfully

Files modified: 15
- src/lib/index.mjs (renamed from .js)
- src/lib/utils.mjs
- src/lib/helpers.mjs
- ... (12 more)

Report: .aiwg/ralph/completion-2025-01-15T14-22.md
═══════════════════════════════════════════
```

## Tips

- Migrations often need more iterations (15-25)
- Use compound criteria (tests + build + runtime)
- Consider using `--branch` for large migrations
- Break very large migrations into module-by-module
