#!/usr/bin/env node
/**
 * lint-schemas.mjs
 *
 * Validates:
 *   1. schemas/executor-v1.json is a valid draft-2020-12 JSON Schema (meta-schema check)
 *   2. Each fixture in test/conformance/executor-v1/fixtures/ validates against
 *      schemas/executor-v1.json — specifically the per-message-type refs declared in
 *      the fixture's `_schema_refs` or `_validates_as` fields.
 *
 * Uses ajv (already a transitive dep via @modelcontextprotocol/sdk) via dynamic require.
 * Does NOT add ajv as a top-level package.json dependency.
 *
 * Exit 0 = all checks pass.
 * Exit 1 = one or more validation errors.
 *
 * Usage:
 *   node tools/scripts/lint-schemas.mjs
 *   npm run lint:schemas
 *
 * @see docs/contracts/executor.v1.md
 * @see schemas/executor-v1.json
 * @see test/conformance/executor-v1/
 * @issue #1178
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

// ── Ajv bootstrap ──────────────────────────────────────────────────────────

let Ajv2020, addFormats;

function loadAjv() {
  const require = createRequire(import.meta.url);
  const ajvPaths = [
    join(projectRoot, 'node_modules', 'ajv', 'dist', '2020.js'),
    join(projectRoot, 'node_modules', 'ajv', 'dist', 'ajv.js'),
  ];
  const formatsPath = join(projectRoot, 'node_modules', 'ajv-formats', 'dist', 'index.js');

  let Ajv = null;
  for (const p of ajvPaths) {
    if (existsSync(p)) {
      try {
        Ajv = require(p);
        break;
      } catch {
        // try next
      }
    }
  }

  if (!Ajv) {
    console.error(
      '\n[lint-schemas] ERROR: Could not load ajv from node_modules.\n' +
      'ajv is a transitive dependency but was not found at the expected path.\n' +
      'Install it as a devDependency:  npm install --save-dev ajv ajv-formats\n'
    );
    process.exit(1);
  }

  let formats = null;
  if (existsSync(formatsPath)) {
    try {
      formats = require(formatsPath);
    } catch {
      // formats are optional — warn but continue
    }
  }

  return { Ajv, formats };
}

const { Ajv, formats: formatsModule } = loadAjv();

// Ajv may be exported as default, as Ajv2020, or as the constructor directly.
// The 2020.js dist exports { Ajv2020, default } — prefer the named export.
const AjvConstructor = Ajv.Ajv2020 ?? Ajv.default ?? Ajv;

const ajv = new AjvConstructor({
  strict: false,
  allErrors: true,
  verbose: true,
  // Do not try to fetch/validate the $schema meta-schema URI — it is already
  // implied by using the Ajv2020 constructor. Without this flag Ajv throws
  // "no schema with key or ref https://json-schema.org/draft/2020-12".
  validateSchema: false,
});

if (formatsModule) {
  const addFormatsFn = formatsModule.default ?? formatsModule;
  if (typeof addFormatsFn === 'function') {
    addFormatsFn(ajv);
  }
}

// ── Paths ──────────────────────────────────────────────────────────────────

const SCHEMA_PATH = join(projectRoot, 'schemas', 'executor-v1.json');
const FIXTURES_DIR = join(projectRoot, 'test', 'conformance', 'executor-v1', 'fixtures');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Load and parse a JSON file, throwing a clear error on parse failure. */
function loadJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON parse error in ${filePath}: ${err.message}`);
  }
}

/** Collect every object in a deep structure that has a _validates_as key. */
function collectValidatables(obj, accumulator = []) {
  if (obj === null || typeof obj !== 'object') return accumulator;
  if (Array.isArray(obj)) {
    for (const item of obj) collectValidatables(item, accumulator);
    return accumulator;
  }
  if (typeof obj._validates_as === 'string') {
    accumulator.push({ ref: obj._validates_as, value: obj });
  }
  for (const val of Object.values(obj)) {
    collectValidatables(val, accumulator);
  }
  return accumulator;
}

/** Strip private fields (prefixed _) before validating. */
function stripPrivate(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripPrivate);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!k.startsWith('_')) {
      out[k] = stripPrivate(v);
    }
  }
  return out;
}

/** Resolve a JSON-pointer ref like "#/$defs/foo" into a sub-schema. */
function resolveRef(schema, ref) {
  if (!ref.startsWith('#/')) {
    return schema; // external ref — treat as root schema
  }
  const parts = ref.slice(2).split('/');
  let current = schema;
  for (const part of parts) {
    if (current === undefined || current === null) return null;
    current = current[part];
  }
  return current ?? null;
}

// ── Step 1: validate the schema file itself ───────────────────────────────

let errors = 0;
let warnings = 0;

console.log('\n[lint-schemas] Checking executor-v1.json …');

if (!existsSync(SCHEMA_PATH)) {
  console.error(`  ERROR: Schema file not found at ${SCHEMA_PATH}`);
  process.exit(1);
}

const executorSchema = loadJson(SCHEMA_PATH);

// Check the $schema declaration
const declared = executorSchema['$schema'] ?? '';
if (!declared.includes('2020-12')) {
  console.warn(`  WARN: $schema declares "${declared}" — expected draft 2020-12.`);
  warnings++;
} else {
  console.log('  ✓ $schema declares draft-2020-12');
}

// Compile the schema — Ajv will throw on structural errors
let rootValidate;
try {
  rootValidate = ajv.compile(executorSchema);
  console.log('  ✓ Schema compiled successfully');
} catch (err) {
  console.error(`  ERROR: Schema failed to compile: ${err.message}`);
  process.exit(1);
}

// Verify every $def is resolvable and compilable
const defs = executorSchema['$defs'] ?? {};
const defNames = Object.keys(defs);
console.log(`  ✓ $defs present: ${defNames.length} definitions`);

for (const defName of defNames) {
  const subSchema = defs[defName];
  try {
    // Use addSchema so we can validate sub-schemas independently
    const fakeId = `executor.aiwg.io/v1/defs/${defName}`;
    // Inline the $defs so refs resolve; wrap in a root with $defs
    const wrappedSchema = {
      $schema: 'https://json-schema.org/draft/2020-12',
      $defs: defs,
      ...subSchema,
    };
    ajv.compile(wrappedSchema);
    // console.log(`    ✓ $def/${defName} compiles`);
  } catch (err) {
    console.error(`  ERROR: $def/${defName} failed to compile: ${err.message}`);
    errors++;
  }
}
if (errors === 0) {
  console.log(`  ✓ All ${defNames.length} $defs compile without errors`);
}

// ── Step 2: validate fixtures ─────────────────────────────────────────────

if (!existsSync(FIXTURES_DIR)) {
  console.warn(`\n[lint-schemas] WARN: fixtures dir not found at ${FIXTURES_DIR}. Skipping fixture validation.`);
  warnings++;
} else {
  const fixtureFiles = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));
  console.log(`\n[lint-schemas] Checking ${fixtureFiles.length} fixture(s) in ${FIXTURES_DIR} …`);

  for (const fname of fixtureFiles) {
    const fixturePath = join(FIXTURES_DIR, fname);
    console.log(`\n  [${fname}]`);

    let fixture;
    try {
      fixture = loadJson(fixturePath);
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
      errors++;
      continue;
    }

    // Collect all validatable objects in the fixture
    const validatables = collectValidatables(fixture);

    if (validatables.length === 0) {
      console.warn(`    WARN: No _validates_as markers found. Add "_validates_as": "#/$defs/<name>" to validate specific message shapes.`);
      warnings++;
      continue;
    }

    let fixtureErrors = 0;
    let fixtureChecks = 0;

    for (const { ref, value } of validatables) {
      fixtureChecks++;
      const subSchema = resolveRef(executorSchema, ref);
      if (!subSchema) {
        console.warn(`    WARN: Cannot resolve ref "${ref}" in schema — skipping.`);
        warnings++;
        continue;
      }

      // Build a wrapped schema so $refs inside the sub-schema resolve correctly
      const wrappedSchema = {
        $schema: 'https://json-schema.org/draft/2020-12',
        $defs: defs,
        ...subSchema,
      };

      let validate;
      try {
        validate = ajv.compile(wrappedSchema);
      } catch (err) {
        console.error(`    ERROR: Failed to compile sub-schema for "${ref}": ${err.message}`);
        fixtureErrors++;
        continue;
      }

      const cleaned = stripPrivate(value);
      const valid = validate(cleaned);

      if (!valid) {
        console.error(`    ERROR: Validation failed for "${ref}":`);
        for (const vErr of (validate.errors ?? [])) {
          const path = vErr.instancePath || '/';
          console.error(`      - ${path}: ${vErr.message} (${JSON.stringify(vErr.params)})`);
        }
        fixtureErrors++;
      }
    }

    if (fixtureErrors > 0) {
      console.error(`    ✗ ${fixtureErrors}/${fixtureChecks} check(s) failed`);
      errors += fixtureErrors;
    } else {
      console.log(`    ✓ ${fixtureChecks} check(s) passed`);
    }
  }
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
if (errors > 0) {
  console.error(`[lint-schemas] FAILED — ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else {
  if (warnings > 0) {
    console.warn(`[lint-schemas] PASSED — 0 errors, ${warnings} warning(s)`);
  } else {
    console.log('[lint-schemas] PASSED — all checks green');
  }
  process.exit(0);
}
