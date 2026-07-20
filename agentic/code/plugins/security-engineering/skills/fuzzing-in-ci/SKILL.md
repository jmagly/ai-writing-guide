---
namespace: aiwg
name: fuzzing-in-ci
platforms: [all]
description: Detect candidate fuzz targets and emit CI recipes for libFuzzer/AFL/cargo-fuzz/atheris/fast-check harnesses, plus OSS-Fuzz integration patterns
requires:
  - toolchain: at least one supported language detected (C, C++, Rust, Python, Node)
  - ci-platform: known CI platform (Gitea Actions, GitHub Actions, GitLab CI)
ensures:
  - harness-scaffolds: starter fuzz harness(es) at .aiwg/security-engineering/fuzzing/{language}/
  - ci-recipe: PR-gating short-form fuzz job(s) at .aiwg/security-engineering/fuzzing/{ci-platform}/
  - long-form-guide: documentation for OSS-Fuzz integration and dedicated-runner patterns
errors:
  - no-supported-language: project has no language this skill can wire fuzzers for
  - no-candidate-targets: skill scanned for fuzz-worthy functions but found none; suggest manual seeding
invariants:
  - PR-gating fuzz runs are bounded (default 2 minutes per target) — never blocks PR indefinitely
  - long-form fuzzing is documented separately and never runs inline in PR jobs
script:
  entrypoint: scripts/emit.mjs
  runtime: node
  cwd: project-root
  argsHint: "[--language c|cpp|rust|go|python|node|auto] [--ci gitea|github|gitlab|auto] [--seconds-per-target N] [--coverage] [--oss-fuzz]"
commandHint:
  argumentHint: "[--language c|cpp|rust|go|python|node|auto] [--ci gitea|github|gitlab|auto] [--seconds-per-target N] [--coverage] [--oss-fuzz]"
  allowedTools: Read, Write, Bash, Glob, Grep
  model: haiku
  category: security
  orchestration: false
  modelRole: efficiency
  modelTier: economy
---

# Fuzzing in CI

**You are the Fuzzing Integration Engineer** — identify functions that take untrusted input, scaffold fuzz harnesses for them, and wire short-form PR-gating fuzz jobs that complement sanitizer-enabled builds.

## Core Philosophy

"Coverage-guided fuzzing finds bugs the test suite never imagined." Fuzzers are the highest-leverage way to find input-handling bugs in parsers, deserializers, and protocol decoders. Wired into CI on every PR (with a small budget — minutes, not hours), they catch regressions immediately. Long-form fuzzing (OSS-Fuzz, dedicated runners) finds the deeper bugs over days and weeks.

## Natural Language Triggers

- "set up fuzzing"
- "add libFuzzer to CI"
- "fuzz our parser"
- "OSS-Fuzz integration"
- "property-based tests"

## Language Coverage (cycle 1)

| Language | Fuzzer            | Property-based alternative |
|----------|-------------------|----------------------------|
| C / C++  | libFuzzer (Clang), AFL++ | — |
| Rust     | cargo-fuzz (libFuzzer-backed), AFL (afl.rs) | proptest, quickcheck |
| Python   | atheris (libFuzzer-backed) | Hypothesis |
| Node.js  | jazzer.js (libFuzzer-backed) | fast-check |
| Java/JVM | jazzer (libFuzzer-backed) | jqwik |

Cycle-2 additions: Go (native go-fuzz), Swift, Ruby.

## Execution Flow

### Phase 1: Detect languages

Same `lib/toolchain-detect.sh` helper as `sanitizer-in-ci`.

### Phase 2: Identify candidate targets

Heuristics for functions that benefit most from fuzzing:

- Functions taking byte-string or `bytes`/`&[u8]`/`Buffer` input
- Functions named `parse_*`, `deserialize_*`, `decode_*`, `unmarshal_*`
- Functions with `from_str` / `from_bytes` constructors
- Public API entry points that accept untrusted input

The skill scans declarations using ripgrep:

```bash
# C/C++ — look for functions taking const uint8_t*/size_t pairs
rg -n --type c --type cpp -e 'parse_|decode_|deserialize_' src/

# Rust
rg -n --type rust -e 'fn (parse|decode|deserialize)_|FromStr|TryFrom<&\[u8\]>' src/

# Python
rg -n --type py -e 'def (parse|decode|deserialize)' src/

# Node
rg -n --type js --type ts -e 'function (parse|decode|deserialize)' src/
```

Report candidates to the operator for confirmation before scaffolding harnesses.

### Phase 3: Scaffold harnesses

Reference emitter:

```bash
agentic/code/frameworks/security-engineering/skills/fuzzing-in-ci/scripts/emit.sh \
  --language auto --ci auto --seconds-per-target 120
```

#### Example: C libFuzzer harness

`.aiwg/security-engineering/fuzzing/c/fuzz_parse.c`:

```c
// LLVMFuzzerTestOneInput is the entry point libFuzzer expects.
// Compile with: clang -fsanitize=fuzzer,address,undefined -o fuzz_parse fuzz_parse.c parse.c
#include <stdint.h>
#include <stddef.h>
#include "parse.h"

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    // Constrain input shape if your parser has a minimum
    if (size < 4) return 0;

    parse_result_t *r = parse_buffer(data, size);
    if (r) {
        parse_result_free(r);
    }
    return 0;
}
```

`.aiwg/security-engineering/fuzzing/c/seed-corpus/` — populate with a few representative valid inputs.

#### Example: Rust cargo-fuzz harness

`fuzz/fuzz_targets/fuzz_parse.rs` (cargo-fuzz layout):

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;
use mycrate::parse;

fuzz_target!(|data: &[u8]| {
    let _ = parse(data);  // ignore Result; we want it to not panic/UB
});
```

Project-side: `cargo install cargo-fuzz` then `cargo fuzz init && cargo fuzz add fuzz_parse`.

#### Example: Python atheris harness

`.aiwg/security-engineering/fuzzing/python/fuzz_parse.py`:

```python
import atheris
import sys

with atheris.instrument_imports():
    from mypkg import parse

def TestOneInput(data: bytes) -> None:
    try:
        parse(data)
    except (ValueError, mypkg.ParseError):
        pass  # expected on invalid input

atheris.Setup(sys.argv, TestOneInput)
atheris.Fuzz()
```

#### Example: Node jazzer.js harness

`.aiwg/security-engineering/fuzzing/node/fuzz_parse.js`:

```js
const { parse } = require("../../../src");

module.exports.fuzz = function (data /* Buffer */) {
  try {
    parse(data);
  } catch (e) {
    // Only catch the parser's documented error class; let everything else propagate
    if (!(e instanceof require("../../../src").ParseError)) throw e;
  }
};
```

### Phase 4: PR-gating CI recipe

Short-form fuzzing on every PR. Default budget: **2 minutes per target**, with a corpus that grows over time.

#### Example: C libFuzzer in CI

```yaml
# .aiwg/security-engineering/fuzzing/github/c.yaml
name: Fuzz (PR)
on:
  pull_request:
  push:
    branches: [main]

jobs:
  libfuzzer:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4.3.1
      - name: Install clang
        run: apt-get update && apt-get install -y clang
      - name: Cache fuzz corpus
        uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2684  # v4.2.3
        with:
          path: .aiwg/security-engineering/fuzzing/c/corpus
          key: fuzz-c-corpus-${{ github.run_id }}
          restore-keys: fuzz-c-corpus-
      - name: Build fuzz target
        run: clang -fsanitize=fuzzer,address,undefined -O1 -g -o fuzz_parse \
                .aiwg/security-engineering/fuzzing/c/fuzz_parse.c src/parse.c
      - name: Fuzz for 120 seconds
        run: |
          mkdir -p .aiwg/security-engineering/fuzzing/c/corpus
          ./fuzz_parse -max_total_time=120 \
            .aiwg/security-engineering/fuzzing/c/corpus \
            .aiwg/security-engineering/fuzzing/c/seed-corpus
      - name: Upload crashes
        if: failure()
        uses: actions/upload-artifact@b4b15b8c7c6ac21ea08fcf65892d2ee8f75cf882  # v4.4.3
        with:
          name: fuzz-crashes-c
          path: crash-*
```

### Phase 5: OSS-Fuzz integration guide

`.aiwg/security-engineering/fuzzing/OSS-FUZZ.md`:

```markdown
# OSS-Fuzz Integration

OSS-Fuzz runs continuous fuzzing on Google infrastructure for free, for qualifying open-source projects.

## Eligibility

- Open-source project with significant impact (usage in production, dependency of widely-used software, etc.)
- Submit via https://github.com/google/oss-fuzz/blob/master/docs/getting-started/new_project_guide.md

## Required files

For a project named `myproject`, OSS-Fuzz needs:

1. `projects/myproject/project.yaml` — homepage, language, sanitizers
2. `projects/myproject/Dockerfile` — build environment
3. `projects/myproject/build.sh` — compiles fuzz targets

Example:

```yaml
# project.yaml
homepage: "https://example.com/myproject"
language: c
primary_contact: "security@example.com"
auto_ccs:
  - "another-maintainer@example.com"
sanitizers:
  - address
  - undefined
  - memory  # optional, requires MSan-clean deps
```

## Workflow

1. OSS-Fuzz builds your fuzz targets daily from your repo
2. Runs them continuously on shared infrastructure
3. New crashes filed as private bugs to your maintainer-contact list
4. Crashes auto-disclose 90 days after report OR when patched (whichever first)

## Local testing

```bash
# Mirror what OSS-Fuzz does locally:
python infra/helper.py build_image myproject
python infra/helper.py build_fuzzers --sanitizer address myproject
python infra/helper.py run_fuzzer myproject fuzz_parse
```
```

### Phase 6: Property-based testing recipes

For languages or codebases where coverage-guided fuzzing is awkward (high-level Python, async-heavy JS, JVM with lots of reflection), property-based testing is often easier to adopt and complementary.

`.aiwg/security-engineering/fuzzing/python/property_test.py`:

```python
from hypothesis import given, strategies as st
from mypkg import parse, serialize

@given(st.binary(min_size=0, max_size=10_000))
def test_parse_never_panics(data):
    try:
        parse(data)
    except mypkg.ParseError:
        pass

@given(st.text())
def test_roundtrip(s):
    assert parse(serialize(s)) == s
```

`.aiwg/security-engineering/fuzzing/node/property_test.js` (fast-check):

```js
const fc = require("fast-check");
const { parse, serialize } = require("../../../src");

test("roundtrip", () => {
  fc.assert(fc.property(fc.string(), (s) => parse(serialize(s)) === s));
});

test("parse handles arbitrary bytes", () => {
  fc.assert(
    fc.property(fc.uint8Array(), (bytes) => {
      try { parse(Buffer.from(bytes)); } catch (e) { /* expected */ }
    })
  );
});
```

## Composition

- `sanitizer-in-ci` — fuzzers find inputs that trigger UB; sanitizers detect the UB. Pair them.
- `ci-action-pinning` — all action SHAs are pinned.

## Implementation Status

- `scripts/emit.sh` emits starter harnesses under `.aiwg/security-engineering/fuzzing/{language}/`.
- PR-gating recipes are emitted under `.aiwg/security-engineering/fuzzing/{ci-platform}/`.
- The emitter also creates starter `OSS-FUZZ.md` and `merge_corpus.sh` placeholders.
- Project-specific target binding is still required: replace placeholder parser calls with real APIs and seed corpora.

## References

- @$AIWG_ROOT/agentic/code/frameworks/security-engineering/skills/sanitizer-in-ci/SKILL.md — Companion sanitizer skill
- `.aiwg/security/curl-checklist-gap-analysis.md` row 16
- libFuzzer: https://llvm.org/docs/LibFuzzer.html
- cargo-fuzz: https://github.com/rust-fuzz/cargo-fuzz
- atheris: https://github.com/google/atheris
- jazzer.js: https://github.com/CodeIntelligenceTesting/jazzer.js
- AFL++: https://aflplus.plus/
- OSS-Fuzz: https://google.github.io/oss-fuzz/
- Hypothesis: https://hypothesis.readthedocs.io/
- fast-check: https://github.com/dubzzz/fast-check
- proptest (Rust): https://github.com/proptest-rs/proptest
