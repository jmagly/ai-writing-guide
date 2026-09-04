# Integrate output modes into a runtime

This guide is for skill authors, script authors, and provider-adapter maintainers. A correct integration resolves the selected stack, applies each mode in order, preserves protected literals, and enforces the declared validation policy.

## Runtime handoff from `aiwg run`

AIWG resolves project, session, and invocation state before starting a child process. It always exports:

| Variable | Value |
|---|---|
| `AIWG_OUTPUT_MODES` | comma-separated effective IDs, or an empty string |
| `AIWG_OUTPUT_MODES_JSON` | ordered resolved profiles, or `[]` |

The JSON includes instructions, stage, provenance, validation policy, protected-content classes, source, and selection scope. A nested `aiwg run` with an empty effective stack resets these variables so stale parent modes do not leak into the child.

Arguments after `--` belong to the child. A child may therefore use its own flag named `--output-mode` without the wrapper consuming it:

```bash
aiwg run skill example --output-mode personal-syntax -- --output-mode child-specific-value
```

## Use the package API

The installed `aiwg` package exports the output-mode registry and runtime from its supported root API. The runtime accepts transformation and validation callbacks so the consumer controls the model, deterministic rewriter, or standards checker.

```ts
import {
  applyOutputModes,
  type ResolvedOutputMode,
} from 'aiwg';

const modes = JSON.parse(
  process.env.AIWG_OUTPUT_MODES_JSON ?? '[]',
) as ResolvedOutputMode[];

const validators = new Map([
  ['organization-engineering-language-validator', validateEngineeringLanguage],
]);

const result = await applyOutputModes(source, modes, {
  transform: async (maskedContent, mode) => {
    return rewriteWithModel(maskedContent, mode.instructions);
  },
  validate: async (content, mode) => {
    const hook = mode.validation.hook;
    const validator = hook ? validators.get(hook) : undefined;
    if (!validator) return { valid: false, message: `No validator for ${hook}` };
    return validator(content);
  },
  onMandatoryValidationFailure: 'fail',
});

await writeResult(result.content);
```

The transform receives content in which protected spans have been replaced by opaque tokens. It must reproduce each token exactly once. The runtime restores the original literals and rejects removed, modified, or duplicated tokens.

Treat `AIWG_OUTPUT_MODES_JSON` as input: parse it defensively in long-lived or independently invoked tools. When the tool is not launched by `aiwg run`, default to an empty array.

## Resolve modes directly

An application embedded in AIWG can resolve profiles without using environment variables:

```ts
import { resolveOutputModes } from 'aiwg';

const { modes, diagnostics } = await resolveOutputModes(
  projectRoot,
  aiwgRoot,
  ['personal-syntax'],
);
```

Do not reconstruct precedence or stage order in an adapter. Use the registry resolver so custom overrides, state scopes, conflicts, and requirements behave like the CLI.

## Validation semantics

- `advisory`: transformation may run without a validator. The mode must not claim standards conformance.
- `validated`: the profile must name a hook and the consumer must execute the mapped validator.
- `conformance`: the profile must name a hook and standard version; a successful validator is required before claiming conformance.

If a mandatory validator is absent, `applyOutputModes` fails. If validation runs and reports failure, the runtime either returns the original unaltered input or throws, according to `onMandatoryValidationFailure`.

The built-in `asd-ste` profile is advisory. Supplying an ASD-STE validator requires an operator-authored override profile containing the licensed ruleset reference, validation hook, and applicable standard version.

## Adapter responsibilities

A participating consumer should:

1. Accept the ordered profiles supplied by AIWG.
2. Apply only the profile's presentation instructions.
3. Preserve semantic content, evidence strength, citations, and higher-authority requirements.
4. Preserve opaque protected-content tokens exactly once.
5. Map validator hook IDs through an explicit allowlist; never execute a hook string as a shell command.
6. Record applied mode IDs, versions, validation results, and fallback behavior when provenance matters.
7. Return the original input or fail closed when mandatory validation fails.

Do not label output as transformed merely because environment variables were present. Record a mode as applied only after its transform completes and its mandatory validation succeeds.

## Integration tests

At minimum, cover:

- empty stack returns byte-for-byte identical content;
- project, session, and invocation precedence;
- deterministic cross-kind ordering;
- unknown modes, conflicts, and missing requirements fail before execution;
- code, commands, citations, quotations, identifiers, and machine-readable blocks survive unchanged;
- removed or duplicated protection tokens fail;
- absent mandatory validators fail;
- validation failure follows the configured `unaltered` or `fail` policy;
- nested runs do not inherit stale mode variables;
- child arguments after `--` remain untouched.
